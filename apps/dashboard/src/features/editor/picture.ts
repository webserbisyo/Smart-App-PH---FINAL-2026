import { imageUrl } from '@smartapp/core';
import { blobToDataUrl } from '@smartapp/data';
import { env } from '@/app/env';
import type { UploadedImage } from '@/app/image-upload-row';

/** The address to draw a logo or banner ref: a demo photo from the storefront, or a picture kept inline. */
export function pictureSrc(ref: string | null | undefined, width: number): string | null {
  if (!ref) return null;
  if (/^(blob:|data:|https?:\/\/)/.test(ref)) return ref;
  return imageUrl(ref, width, env.VITE_STOREFRONT_URL);
}

/** A mock upload keeps the picture itself, so the storefront preview (another address) can show it. */
export async function pictureRef(upload: UploadedImage): Promise<string> {
  return env.VITE_DATA_SOURCE === 'mock' ? blobToDataUrl(upload.image.blob) : upload.ref;
}
