// Where owner uploads go and which picture types Storage takes (T116). Only the API reads these, so they live
// apart from enums.ts: the storefront bundles enums.ts and would carry these schemas too (its JS budget, T31).
import { z } from 'zod';
import type { MediaBucket, UploadKind } from './enums.js';

// Where each owner upload is kept (T116). Public buckets serve through the CDN; the plan receipt is private.
export const UPLOAD_BUCKET: Record<UploadKind, MediaBucket> = {
  logo: 'look',
  banner: 'look',
  category: 'look',
  news_photo: 'look',
  item: 'menu',
  qr: 'qr',
  avatar: 'profile',
  plan_proof: 'plan-proofs',
};

// The picture types Storage takes (the media_files CHECK and every bucket's allowed types).
export const IMAGE_MIME_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif'] as const;
export const ImageMimeEnum = z.enum(IMAGE_MIME_TYPES);
export type ImageMime = z.infer<typeof ImageMimeEnum>;
