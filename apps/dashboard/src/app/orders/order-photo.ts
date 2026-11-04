import { imageUrl } from '@smartapp/core';
import { env } from '../env.js';

/** The address to draw an item photo ref at about this width (the storefront serves the files). */
export function orderPhotoSrc(photoRef: string | null, width: number): string | null {
  if (!photoRef) return null;
  if (/^(blob:|data:|https?:\/\/)/.test(photoRef)) return photoRef;
  return imageUrl(photoRef, width, env.VITE_STOREFRONT_URL);
}
