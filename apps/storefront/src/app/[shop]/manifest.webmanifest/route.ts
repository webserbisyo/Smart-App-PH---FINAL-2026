import {
  DEMO_MEDIA,
  DEMO_SHOP_SLUGS,
  isDemoShopSlug,
  oklchToHex,
  parseOklch,
  shopPalette,
} from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { shortName } from '@/features/install/install-rules';

interface ManifestContext {
  params: Promise<{ shop: string }>;
}

// Built ahead for the 5 demo shops; any other shop is looked up on request.
export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

// Manifests take plain colours; the palette is OKLCH.
function hex(value: string): string {
  const color = parseOklch(value);
  return color ? oklchToHex(color) : '#ffffff';
}

function icons(slug: string) {
  if (isDemoShopSlug(slug) && DEMO_MEDIA[slug].logo) {
    const base = `/demo/${slug}/brand`;
    return [
      { src: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: `${base}/icon-maskable-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ];
  }
  // No logo yet: the Smart App PH mark (shop initials icons come with uploads).
  return [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }];
}

/**
 * Each shop installs as its own app (T13, decision T26): its name, colours and icon, opening at /<slug>.
 * Unknown, pending or suspended shops: 404.
 */
export async function GET(_request: Request, { params }: ManifestContext) {
  const { shop: slug } = await params;
  const shop = getStorefrontForServer(slug);
  if (!shop) return new Response(null, { status: 404 });
  const { name, tagline } = shop.storefront.info;
  const { brandColor, surface } = shop.storefront.look;
  // The page colour, as the theme-color meta in [shop]/layout, so the status bar never changes colour.
  const page = hex(shopPalette(brandColor, surface).shop60);
  const manifest = {
    id: `/${slug}`,
    name,
    short_name: shortName(name),
    description: tagline ?? name,
    start_url: `/${slug}`,
    scope: `/${slug}/`,
    display: 'standalone',
    orientation: 'portrait',
    lang: 'en-PH',
    dir: 'ltr',
    theme_color: page,
    background_color: page,
    icons: icons(slug),
  };
  return Response.json(manifest, { headers: { 'Content-Type': 'application/manifest+json' } });
}
