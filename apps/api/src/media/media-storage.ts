import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { MediaBucket } from '@smartapp/core';
import { ApiFailure } from '../common/api-failure.js';

/** A file's real size and type, read from Storage after the phone sent it (R12). */
export interface StoredObject {
  bytes: number;
  mime: string;
}

// The private bucket for the owner's export and file downloads (X10); never a MediaBucket upload kind.
export type StorageBucket = MediaBucket | 'exports';

// The browser may keep a public picture for a year: every change gets a new path (R13).
export const PUBLIC_CACHE_SECONDS = 31_536_000;

/**
 * Supabase Storage behind NestJS (T34, T116): signed upload places, the real size of a sent file, public
 * addresses and removal. The only file in the API besides the login that knows Supabase; it uses the secret
 * key, so it never runs in a browser.
 */
@Injectable()
export class MediaStorage {
  private readonly logger = new Logger('Storage');
  private readonly url: string;
  private readonly key: string | undefined;
  private client: SupabaseClient | null = null;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.url = config.getOrThrow<string>('SUPABASE_URL').replace(/\/+$/, '');
    this.key = config.get<string>('SUPABASE_SECRET_KEY');
  }

  private storage() {
    if (!this.key) throw new ApiFailure('unknown', 503);
    this.client ??= createClient(this.url, this.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    return this.client.storage;
  }

  /** Where the phone sends the file (works for 2 hours, R12). */
  async signedUpload(bucket: StorageBucket, path: string): Promise<string> {
    const { data, error } = await this.storage().from(bucket).createSignedUploadUrl(path);
    if (error) throw this.failure('sign', error);
    return data.signedUrl;
  }

  /** A small file the API itself sends (a member's cropped photo): never replaces one already there. */
  async put(
    bucket: StorageBucket,
    path: string,
    body: Buffer,
    mime: string,
    cacheSeconds = PUBLIC_CACHE_SECONDS,
  ): Promise<void> {
    const { error } = await this.storage()
      .from(bucket)
      .upload(path, body, { contentType: mime, cacheControl: String(cacheSeconds) });
    if (error) throw this.failure('put', error);
  }

  /** The sent file's real size and type, or null when nothing arrived. */
  async stat(bucket: StorageBucket, path: string): Promise<StoredObject | null> {
    const { data, error } = await this.storage().from(bucket).info(path);
    if (error || !data) return null;
    if (typeof data.size !== 'number') return null;
    return { bytes: data.size, mime: data.contentType ?? '' };
  }

  async remove(bucket: StorageBucket, paths: readonly string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await this.storage()
      .from(bucket)
      .remove([...paths]);
    if (error) throw this.failure('remove', error);
  }

  /** A file the API reads back (proof photos and pictures for the owner's ZIP), or null when it is gone. */
  async download(bucket: StorageBucket, path: string): Promise<Uint8Array | null> {
    const { data, error } = await this.storage().from(bucket).download(path);
    if (error) return null;
    return new Uint8Array(await data.arrayBuffer());
  }

  /** The names directly inside a folder (files and folders), up to 1,000. */
  async list(bucket: StorageBucket, folder: string): Promise<string[]> {
    const { data, error } = await this.storage().from(bucket).list(folder, { limit: 1000 });
    if (error) throw this.failure('list', error);
    return data.map((entry) => entry.name);
  }

  /** A public bucket's address for a path (no call to Storage). */
  publicUrl(bucket: MediaBucket, path: string): string {
    return `${this.publicPrefix(bucket)}${path}`;
  }

  publicPrefix(bucket: MediaBucket): string {
    return `${this.url}/storage/v1/object/public/${bucket}/`;
  }

  /** A private file's short link (proofs and plan receipts). */
  async signedRead(bucket: StorageBucket, path: string, seconds: number): Promise<string | null> {
    const { data, error } = await this.storage().from(bucket).createSignedUrl(path, seconds);
    return error ? null : data.signedUrl;
  }

  private failure(step: string, error: { name?: string; message?: string }): ApiFailure {
    // The name only: a Storage message can carry a path with the shop id (rule 12).
    this.logger.error(`Storage ${step} failed: ${error.name ?? 'error'}`);
    return new ApiFailure('unknown', 502);
  }
}
