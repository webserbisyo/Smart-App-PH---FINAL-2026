// Pure helper & canvas compression for proof uploads (decision D7)
// Longest side 1600 px, WebP or JPEG quality 0.8, kept under 1 MB.

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

export function calculateTargetDimensions(
  width: number,
  height: number,
  maxSide = 1600,
): Dimensions {
  if (width <= 0 || height <= 0) {
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }
  if (width <= maxSide && height <= maxSide) {
    return { width, height };
  }

  if (width >= height) {
    const ratio = height / width;
    return {
      width: maxSide,
      height: Math.max(1, Math.round(maxSide * ratio)),
    };
  }

  const ratio = width / height;
  return {
    width: Math.max(1, Math.round(maxSide * ratio)),
    height: maxSide,
  };
}

export interface CompressOptions {
  readonly maxSide?: number;
  readonly quality?: number;
}

/**
 * Compresses an image on the phone via an offscreen canvas.
 * Reduces longest side to 1600 px and exports as WebP/JPEG at quality 0.8.
 */
export async function compressImage(file: Blob | File, options?: CompressOptions): Promise<Blob> {
  const maxSide = options?.maxSide ?? 1600;
  const quality = options?.quality ?? 0.8;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = calculateTargetDimensions(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        maxSide,
      );

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try image/webp first; fallback to image/jpeg if not supported
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob) {
            resolve(webpBlob);
          } else {
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) {
                  resolve(jpegBlob);
                } else {
                  resolve(file);
                }
              },
              'image/jpeg',
              quality,
            );
          }
        },
        'image/webp',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
