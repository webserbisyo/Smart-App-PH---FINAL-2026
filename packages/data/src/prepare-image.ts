// One upload step for every owner photo (decision T65): check the size, read what is really inside, make it
// smaller on the phone, and say what changed ("4.2 MB → 180 KB · WebP"). Used by the Menu photos, the
// payment QR, the owner's photo, the plan receipt and the Storage page's try-out.
import { UPLOAD_MAX_BYTES, sniffImage, type ImageKind } from '@smartapp/core';
import { compressImage } from './compress-image';

export interface PreparedImage {
  readonly blob: Blob;
  // What the file really was, from its first bytes.
  readonly from: ImageKind;
  // What we keep: WebP, or JPEG where the browser can't write WebP (iPhone Safari).
  readonly to: 'webp' | 'jpeg' | 'png';
  readonly before: number;
  readonly after: number;
  readonly name: string;
}

export type PrepareImageResult =
  | { readonly ok: true; readonly image: PreparedImage }
  | { readonly ok: false; readonly problem: 'too_big'; readonly bytes: number }
  | { readonly ok: false; readonly problem: 'not_image' | 'heic' | 'unreadable' };

export interface PrepareImageOptions {
  // Longest side kept: menu 1080, proof 1600, QR 1000, profile 256 (T65).
  readonly maxSide: number;
  readonly quality?: number | undefined;
}

async function headOf(file: Blob): Promise<Uint8Array> {
  const slice = file.slice(0, 12);
  // jsdom's Blob has no arrayBuffer in older versions; FileReader works everywhere.
  if (typeof slice.arrayBuffer === 'function') return new Uint8Array(await slice.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(
        reader.result instanceof ArrayBuffer ? new Uint8Array(reader.result) : new Uint8Array(),
      );
    reader.onerror = () => reject(new Error('unreadable_image'));
    reader.readAsArrayBuffer(slice);
  });
}

function kindOf(type: string): PreparedImage['to'] {
  if (type === 'image/webp') return 'webp';
  if (type === 'image/png') return 'png';
  return 'jpeg';
}

/**
 * Checks and shrinks one photo. Over 15 MB, not a picture, or HEIC on a phone that can't open it gives a
 * problem the screen words; otherwise the smaller file. A file that comes out bigger than it went in (an
 * already small WebP) is kept as it was.
 */
export async function prepareImage(
  file: File | Blob,
  options: PrepareImageOptions,
): Promise<PrepareImageResult> {
  if (file.size > UPLOAD_MAX_BYTES) return { ok: false, problem: 'too_big', bytes: file.size };
  const from = sniffImage(await headOf(file));
  if (!from) return { ok: false, problem: 'not_image' };
  const name = file instanceof File ? file.name : 'photo';
  try {
    const shrunk = await compressImage(file, {
      maxSide: options.maxSide,
      quality: options.quality ?? 0.8,
    });
    const keepOriginal = shrunk.size >= file.size && from !== 'heic' && file.type !== '';
    const blob = keepOriginal ? file : shrunk;
    return {
      ok: true,
      image: {
        blob,
        from,
        to: kindOf(blob.type),
        before: file.size,
        after: blob.size,
        name,
      },
    };
  } catch {
    // Safari opens HEIC; Chrome on Android can't, so the owner gets a way out instead of a dead end.
    return { ok: false, problem: from === 'heic' ? 'heic' : 'unreadable' };
  }
}

/** How much smaller, in whole percent (0 when it didn't shrink). */
export function shrinkPercent(before: number, after: number): number {
  if (before <= 0 || after >= before) return 0;
  return Math.round((1 - after / before) * 100);
}
