import { DEMO_MEDIA } from './demo/media.js';
import { isDemoShopSlug, type DemoShopSlug } from './demo/slugs.js';

export type MediaFolder = 'items' | 'banners' | 'brand';

export type MediaRef = `demo:${DemoShopSlug}/${MediaFolder}/${string}` | (string & {});

export interface ImageSources {
  avif: string;
  webp: string;
  widths: readonly number[];
}

interface ParsedDemoRef {
  slug: DemoShopSlug;
  folder: MediaFolder;
  name: string;
  widths: readonly [number, number];
}

export function parseDemoRef(ref: string | null | undefined): ParsedDemoRef | null {
  if (!ref || typeof ref !== 'string') return null;
  if (!ref.startsWith('demo:')) return null;

  const pathPart = ref.slice('demo:'.length);
  const segments = pathPart.split('/');
  if (segments.length !== 3) return null;

  const [slug, folder, name] = segments;
  if (!slug || !folder || !name) return null;

  if (!isDemoShopSlug(slug)) return null;
  const shopMedia = DEMO_MEDIA[slug];
  if (!shopMedia) return null;

  if (folder === 'items') {
    if (name === 'prize') {
      if (!shopMedia.prize) return null;
    } else {
      if (!shopMedia.items.includes(name)) return null;
    }
    return { slug, folder, name, widths: [320, 640] as const };
  }

  if (folder === 'banners') {
    const match = /^banner-([1-3])$/.exec(name);
    if (!match || !match[1]) return null;
    const bannerNum = parseInt(match[1], 10);
    if (bannerNum < 1 || bannerNum > shopMedia.banners) return null;
    return { slug, folder, name, widths: [800, 1600] as const };
  }

  if (folder === 'brand') {
    if (name !== 'logo' || !shopMedia.logo) return null;
    return { slug, folder, name, widths: [128, 256] as const };
  }

  return null;
}

/**
 * Returns the WebP image URL for a given MediaRef and target width.
 * Returns null if the ref is invalid, unknown, or missing from DEMO_MEDIA.
 */
export function imageUrl(
  ref: string | null | undefined,
  width: number,
  origin = '',
): string | null {
  const parsed = parseDemoRef(ref);
  if (!parsed) return null;

  const cleanOrigin = origin.replace(/\/+$/, '');
  return `${cleanOrigin}/demo/${parsed.slug}/${parsed.folder}/${parsed.name}-${width}.webp`;
}

/**
 * Returns AVIF and WebP srcset strings and widths for a <picture> element.
 * Returns null if the ref is invalid, unknown, or missing from DEMO_MEDIA.
 */
export function imageSources(ref: string | null | undefined, origin = ''): ImageSources | null {
  const parsed = parseDemoRef(ref);
  if (!parsed) return null;

  const cleanOrigin = origin.replace(/\/+$/, '');
  const [w1, w2] = parsed.widths;
  const basePath = `${cleanOrigin}/demo/${parsed.slug}/${parsed.folder}/${parsed.name}`;

  return {
    avif: `${basePath}-${w1}.avif ${w1}w, ${basePath}-${w2}.avif ${w2}w`,
    webp: `${basePath}-${w1}.webp ${w1}w, ${basePath}-${w2}.webp ${w2}w`,
    widths: parsed.widths,
  };
}
