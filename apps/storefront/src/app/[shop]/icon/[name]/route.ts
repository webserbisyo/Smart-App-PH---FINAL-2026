import { createElement, type CSSProperties, type ReactNode } from 'react';
import { ImageResponse } from 'next/og';
import {
  appNameOf,
  oklchToHex,
  openingColours,
  parseOklch,
  personInitials,
  shopPalette,
} from '@smartapp/core';
import { getShop } from '@/server/shop-read';
import {
  demoBrandFiles,
  drawableImage,
  isShopIconName,
  SHOP_ICONS,
  splashIconUrl,
} from '@/features/install/shop-icons';

interface RouteProps {
  params: Promise<{ shop: string; name: string }>;
}

function el(type: string, style: CSSProperties, ...children: ReactNode[]) {
  return createElement(type, { style }, ...children);
}

function hex(value: string): string {
  const color = parseOklch(value);
  return color ? oklchToHex(color) : value;
}

/**
 * A real shop's app icons as PNG (T121): the owner's logo on the opening colour, or the shop's initials on
 * its brand colour while there is no logo the renderer can draw. The manifest and the iPhone home screen
 * point here; the demo shops keep their ready-made files.
 */
export async function GET(request: Request, { params }: RouteProps): Promise<Response> {
  const { shop: slug, name } = await params;
  if (!isShopIconName(name) || demoBrandFiles(slug)) return new Response(null, { status: 404 });
  const shop = await getShop(slug);
  if (!shop) return new Response(null, { status: 404 });

  const { size, maskable } = SHOP_ICONS[name];
  const { look, info } = shop.storefront;
  const logoUrl = splashIconUrl(slug, info.logo);
  const logo = logoUrl ? await drawableImage(new URL(logoUrl, request.url)) : null;

  let picture: ReactNode;
  if (logo) {
    // A maskable icon keeps the logo inside the middle 80 % that every Android shape shows.
    const side = maskable ? Math.round(size * 0.6) : size;
    picture = el(
      'div',
      {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: openingColours(look).background,
      },
      createElement('img', { src: logo, width: side, height: side }),
    );
  } else {
    const palette = shopPalette(look.brandColor, look.surface, look.pageColor, look.cardColor);
    picture = el(
      'div',
      {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: hex(palette.shop10),
        color: hex(palette.shop10Foreground),
        fontSize: Math.round(size * (maskable ? 0.28 : 0.38)),
        fontWeight: 700,
        fontFamily: 'sans-serif',
      },
      personInitials(appNameOf(info.name, look.opening)),
    );
  }

  return new ImageResponse(picture, {
    width: size,
    height: size,
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
