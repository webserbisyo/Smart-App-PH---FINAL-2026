import {
  appNameOf,
  DEMO_SHOP_SLUGS,
  oklchToHex,
  openingColours,
  parseOklch,
  shopPalette,
  shortName,
} from '@smartapp/core';
import { getShop } from '@/server/shop-read';
import { shopIconUrls } from '@/features/install/shop-icons';

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
  return color ? oklchToHex(color) : '#ffffff'; // brand-guard-ignore: manifests need a plain colour
}

// PNG icons for every shop (T121): the demo shops' ready-made files, else drawn from the owner's logo or
// initials (Android's launch screen needs a PNG of 512 px or more).
function icons(slug: string) {
  const urls = shopIconUrls(slug);
  return [
    { src: urls.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: urls.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: urls.maskable512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ];
}

/**
 * Each shop installs as its own app (T13, decision T26): its name, colours and icon, opening at /<slug>.
 * Unknown, pending or suspended shops: 404.
 */
export async function GET(_request: Request, { params }: ManifestContext) {
  const { shop: slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return new Response(null, { status: 404 });
  const { name, tagline } = shop.storefront.info;
  const { look } = shop.storefront;
  const palette = shopPalette(look.brandColor, look.surface, look.pageColor, look.cardColor);
  // The page colour, as the theme-color meta in [shop]/layout, so the status bar never changes colour.
  const page = hex(palette.shop60);
  // Android draws its launch screen in this colour: the owner's opening colour (decision T93).
  const opening = openingColours(look, palette).background;
  // The owner's app name, else the shop name (T94).
  const appName = appNameOf(name, look.opening);
  const manifest = {
    id: `/${slug}`,
    name: appName,
    short_name: shortName(appName),
    description: tagline ?? name,
    start_url: `/${slug}`,
    scope: `/${slug}/`,
    display: 'standalone',
    orientation: 'portrait',
    lang: 'en-PH',
    dir: 'ltr',
    theme_color: page,
    background_color: opening,
    icons: icons(slug),
  };
  return Response.json(manifest, { headers: { 'Content-Type': 'application/manifest+json' } });
}
