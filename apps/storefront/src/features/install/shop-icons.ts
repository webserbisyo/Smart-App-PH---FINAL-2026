// A shop's app icons and launch logo (T13, R51, T121): the demo shops' ready-made brand files, or for a real
// shop the logo the owner uploaded, drawn into PNG icons by /<slug>/icon/<name>.
import {
  DEMO_MEDIA,
  imageUrl,
  isDemoShopSlug,
  OPENING_LOGO_PX,
  openingColours,
  splashVersion,
} from '@smartapp/core';

/** The demo shops' brand files (public/demo/<slug>/brand), or null for any other shop. */
export function demoBrandFiles(slug: string) {
  if (!isDemoShopSlug(slug) || !DEMO_MEDIA[slug].logo) return null;
  const base = `/demo/${slug}/brand`;
  return {
    icon: `${base}/icon-192.png`,
    splash: `${base}/icon-512.png`,
    apple: `${base}/apple-touch-icon.png`,
    og: `${base}/og.jpg`,
  };
}

/** The logo the opening screen draws: a demo shop's icon, else the owner's logo, else none (name alone). */
export function splashIconUrl(slug: string, logo: string | null): string | null {
  return demoBrandFiles(slug)?.splash ?? imageUrl(logo, 512);
}

// Bump when the launch picture's drawing changes (app/[shop]/splash/[size]/route.ts), so iPhone asks again.
const SPLASH_DRAWING = 't124';

/**
 * The tag on a shop's launch picture addresses (T123): it changes with the picture's colour, logo or logo
 * size, so the route can tell browsers and Vercel to keep each picture for a year.
 */
export function splashPictureVersion(
  slug: string,
  look: Parameters<typeof openingColours>[0] & {
    opening: { logoSize: keyof typeof OPENING_LOGO_PX };
  },
  logo: string | null,
): string {
  return splashVersion(
    SPLASH_DRAWING,
    openingColours(look).background,
    String(OPENING_LOGO_PX[look.opening.logoSize]),
    splashIconUrl(slug, logo) ?? '',
  );
}

/**
 * A shop's launch picture for one screen (T125): a demo shop's ready-made file in public/demo/<slug>/splash
 * (tooling/scripts/shop-splash.ts), else drawn on request and tagged with what it shows.
 */
export function splashPictureUrl(slug: string, sizeName: string, tag: string): string {
  if (demoBrandFiles(slug)) return `/demo/${slug}/splash/${sizeName}.png`;
  return `/${slug}/splash/${sizeName}?v=${tag}`;
}

// The PNG icons drawn for a shop without ready-made files (Android needs a PNG of 512 px or more for its
// launch screen; iPhone takes the 180 px one for the home screen).
export const SHOP_ICONS = {
  'icon-192.png': { size: 192, maskable: false },
  'icon-512.png': { size: 512, maskable: false },
  'icon-maskable-512.png': { size: 512, maskable: true },
  'apple-touch-icon.png': { size: 180, maskable: false },
} as const;

export type ShopIconName = keyof typeof SHOP_ICONS;

export function isShopIconName(name: string): name is ShopIconName {
  return Object.hasOwn(SHOP_ICONS, name);
}

/** A shop's icon files: the demo files, or the drawn ones. */
export function shopIconUrls(slug: string) {
  const demo = demoBrandFiles(slug);
  if (demo) {
    const base = `/demo/${slug}/brand`;
    return {
      icon192: demo.icon,
      icon512: `${base}/icon-512.png`,
      maskable512: `${base}/icon-maskable-512.png`,
      apple: demo.apple,
    };
  }
  const base = `/${slug}/icon`;
  return {
    icon192: `${base}/icon-192.png`,
    icon512: `${base}/icon-512.png`,
    maskable512: `${base}/icon-maskable-512.png`,
    apple: `${base}/apple-touch-icon.png`,
  };
}

/**
 * A picture the image renderer can draw, as a data URL (it won't fetch from this server's own address, and
 * it draws PNG and JPEG only, not WebP). Anything else gives null, and the caller draws without it.
 */
export async function drawableImage(url: URL): Promise<string | null> {
  try {
    const response = await fetch(url);
    const type = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    if (!response.ok || (type !== 'image/png' && type !== 'image/jpeg')) return null;
    const data = Buffer.from(await response.arrayBuffer()).toString('base64');
    return `data:${type};base64,${data}`;
  } catch {
    return null;
  }
}
