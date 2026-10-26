// The proof photo after compression (decision R33): sent to the upload URL, and a small copy kept on the
// phone so the order thread shows the photo the customer sent.
import { errorWords } from '@smartapp/core';
import { ApiRequestError } from './api-client';
import type { ProofUpload } from './adapters/types';
import { compressImage } from './compress-image';
import { getDeviceStorage, PROOF_PREVIEWS_MAX } from './device-storage';

// The copy on the phone: 720 px is sharp in the thread and the viewer, and small enough to keep six.
const PREVIEW_SIDE = 720;
const PREVIEW_QUALITY = 0.72;

/** Puts the photo at the signed upload URL. The mock's `mock://` URL has no server: nothing to send. */
export async function putProofFile(upload: ProofUpload, file: Blob): Promise<void> {
  if (upload.uploadUrl.startsWith('mock://')) return;
  const response = await fetch(upload.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'content-type': file.type },
  });
  if (!response.ok) {
    throw new ApiRequestError({
      status: response.status,
      code: 'unknown',
      message: errorWords('unknown'),
    });
  }
}

/** A photo as a data: URL (previews never need revoking, unlike object URLs). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read'));
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(blob);
  });
}

/** Keeps a small copy of a sent proof for this shop (newest six). Never fails the upload. */
export async function saveProofPreview(slug: string, path: string, file: Blob): Promise<void> {
  try {
    const small = await compressImage(file, { maxSide: PREVIEW_SIDE, quality: PREVIEW_QUALITY });
    const dataUrl = await blobToDataUrl(small);
    if (!dataUrl.startsWith('data:image/')) return;
    const entry = getDeviceStorage().proofPreviews;
    const kept = (entry.read(slug).value ?? []).filter((p) => p.path !== path);
    const next = [...kept, { path, dataUrl, savedAt: new Date().toISOString() }];
    entry.write(slug, next.slice(-PROOF_PREVIEWS_MAX));
  } catch {
    // Storage full or blocked: the thread shows "Photo sent" instead of the picture.
  }
}
