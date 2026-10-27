import { createElement, type CSSProperties, type ReactNode } from 'react';
import { ImageResponse } from 'next/og';
import { DEMO_MEDIA, isDemoShopSlug, oklchToHex, parseOklch, shopPalette } from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { splashScreen } from '@/features/install/install-rules';

interface RouteProps {
  params: Promise<{ shop: string; size: string }>;
}

// The image renderer takes plain colours; the palette is OKLCH (as the manifest route does).
function hex(value: string): string {
  const color = parseOklch(value);
  return color ? oklchToHex(color) : value;
}

// The image renderer will not fetch from this server's own address (its SSRF guard), so the icon is
// fetched here and handed over as a data URL. No icon: the name shows alone.
async function iconDataUrl(url: URL): Promise<string | null> {
  try {
    const response = await fetch(url);
    const type = response.headers.get('content-type') ?? '';
    if (!response.ok || !type.startsWith('image/')) return null;
    const data = Buffer.from(await response.arrayBuffer()).toString('base64');
    return `data:${type};base64,${data}`;
  } catch {
    return null;
  }
}

function el(type: string, style: CSSProperties, ...children: ReactNode[]) {
  return createElement(type, { style }, ...children);
}

/**
 * The installed app's launch picture on iPhone (decision R51): the shop's icon on its page colour with its
 * name, the same colour as the manifest's background, so the app opens in the shop's colours instead of
 * white. One per iPhone screen; the page's splash then fades from this same picture into the shop.
 */
export async function GET(request: Request, { params }: RouteProps): Promise<Response> {
  const { shop: slug, size } = await params;
  const screen = splashScreen(size);
  const shop = getStorefrontForServer(slug);
  if (!screen || !shop) return new Response(null, { status: 404 });

  const { name } = shop.storefront.info;
  const { brandColor, surface } = shop.storefront.look;
  const p = shopPalette(brandColor, surface);
  const { ratio } = screen;
  const width = screen.width * ratio;
  const height = screen.height * ratio;
  // The icon is 96 CSS px, as the page's splash draws it, so the two line up.
  const icon = 96 * ratio;
  const hasLogo = isDemoShopSlug(slug) && DEMO_MEDIA[slug].logo;
  const iconSrc = hasLogo
    ? await iconDataUrl(new URL(`/demo/${slug}/brand/icon-512.png`, request.url))
    : null;

  // A shop without a logo yet shows its name alone.
  const mark = iconSrc
    ? createElement('img', {
        src: iconSrc,
        width: icon,
        height: icon,
        // rounded-3xl and gap-4, as the page's splash.
        style: { borderRadius: 24 * ratio, marginBottom: 16 * ratio },
      })
    : null;

  const picture = el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      backgroundColor: hex(p.shop60),
      color: hex(p.foreground),
      fontFamily: 'sans-serif',
    },
    mark,
    // A long name wraps inside the screen, centred.
    el(
      'span',
      { fontSize: 20 * ratio, fontWeight: 700, maxWidth: '80%', textAlign: 'center' },
      name,
    ),
  );

  return new ImageResponse(picture, {
    width,
    height,
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
