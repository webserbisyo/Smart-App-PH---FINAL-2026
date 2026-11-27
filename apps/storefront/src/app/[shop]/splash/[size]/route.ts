import { createElement, type CSSProperties, type ReactNode } from 'react';
import { ImageResponse } from 'next/og';
import { OPENING_LOGO_PX, openingColours } from '@smartapp/core';
import { getShop } from '@/server/shop-read';
import { splashScreen } from '@/features/install/install-rules';
import { drawableImage, splashIconUrl } from '@/features/install/shop-icons';

interface RouteProps {
  params: Promise<{ shop: string; size: string }>;
}

function el(type: string, style: CSSProperties, ...children: ReactNode[]) {
  return createElement(type, { style }, ...children);
}

/**
 * The installed app's launch picture on iPhone and iPad (decisions R51, T122): the shop's logo alone, exactly
 * in the middle of its opening colour, drawn from the shop's current settings on request. The page's opening
 * screen puts its logo on the same spot and fades the name in under it, so nothing jumps at the handoff (the
 * picture can't use the shop's font, so it carries no words). No logo it can draw: the colour alone.
 */
export async function GET(request: Request, { params }: RouteProps): Promise<Response> {
  const { shop: slug, size } = await params;
  const screen = splashScreen(size);
  const shop = await getShop(slug);
  if (!screen || !shop) return new Response(null, { status: 404 });

  const { look } = shop.storefront;
  // The owner's opening colour (decision T93), in hex for the image renderer.
  const colours = openingColours(look);
  const { ratio } = screen;
  const width = screen.width * ratio;
  const height = screen.height * ratio;
  // The logo at the owner's size in CSS px, as the page's opening screen draws it, so the two line up.
  const logoPx = OPENING_LOGO_PX[look.opening.logoSize];
  const icon = logoPx * ratio;
  // The same logo as the page's opening screen (a real shop's uploaded logo too, T121), when it can be drawn.
  const iconUrl = splashIconUrl(slug, shop.storefront.info.logo);
  const iconSrc = iconUrl ? await drawableImage(new URL(iconUrl, request.url)) : null;

  const picture = el(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      // The page starts under the status bar, so its centred logo sits half a status bar below the screen's
      // centre; this padding puts the picture's logo on the same spot (T125).
      paddingTop: screen.statusBar * ratio,
      backgroundColor: colours.background,
    },
    iconSrc
      ? createElement('img', {
          src: iconSrc,
          width: icon,
          height: icon,
          // rounded-2xl / 3xl / 4xl (a quarter of the logo), as the page's opening screen.
          style: { borderRadius: (logoPx / 4) * ratio },
        })
      : null,
  );

  return new ImageResponse(picture, {
    width,
    height,
    // Kept on Vercel's edge too, so iPhone gets it at once when the app is added (T122). The page asks for
    // it with a tag that changes with the picture (T123), so a tagged address is kept for a year.
    headers: {
      'Cache-Control': new URL(request.url).searchParams.has('v')
        ? 'public, max-age=31536000, s-maxage=31536000, immutable'
        : 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
