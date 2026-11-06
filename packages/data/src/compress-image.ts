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

  return new Promise((resolve, reject) => {
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

      // WebP first. Safari can't write WebP and quietly returns a PNG instead (WebKit bug 226950), which
      // can be bigger than the photo, so anything that isn't a real WebP falls back to JPEG.
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob && webpBlob.type === 'image/webp') {
            resolve(webpBlob);
            return;
          }
          // A PNG may be see-through (a logo): JPEG would turn that black, so it stays a PNG.
          const fallback = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          canvas.toBlob((blob) => resolve(blob ?? file), fallback, quality);
        },
        'image/webp',
        quality,
      );
    };

    // Not a picture the phone can read: the screen asks for another photo.
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('unreadable_image'));
    };

    img.src = objectUrl;
  });
}

export interface PixelArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Cuts the cropped part out of a picture (decision R24) and returns a data URL: WebP, or JPEG where the
 * browser can't write WebP. Square by default (256 px is about 20 KB, small enough to keep on the phone);
 * a height makes another shape, such as a 16:9 banner (T74).
 */
export function cropImage(
  src: string,
  area: PixelArea,
  size = 256,
  height = size,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('unreadable_image'));
        return;
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, height);
      const webp = canvas.toDataURL('image/webp', 0.82);
      resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('unreadable_image'));
    // A photo from another address (the shop's saved photos) can only be read back from the canvas when
    // it is loaded for CORS; blob: and data: pictures don't need it.
    if (/^https?:/.test(src)) img.crossOrigin = 'anonymous';
    img.src = src;
  });
}
