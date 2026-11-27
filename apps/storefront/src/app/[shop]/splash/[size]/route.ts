import { createElement, type CSSProperties, type ReactNode } from 'react';
import { ImageResponse } from 'next/og';
import { appNameOf, OPENING_LOGO_PX, openingColours } from '@smartapp/core';
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
 * The installed app's launch picture on iPhone (decision R51): the shop's icon on its opening colour with its
 * name, the same colour as the manifest's background, so the app opens in the shop's colours instead of
 * white. One per iPhone and iPad screen, drawn from the shop's current settings on request; the page's splash then fades from this same picture into the shop.
 */
export async function GET(request: Request, { params }: RouteProps): Promise<Response> {
  const { shop: slug, size } = await params;
  const screen = splashScreen(size);
  const shop = await getShop(slug);
  if (!screen || !shop) return new Response(null, { status: 404 });

  const { look } = shop.storefront;
  // The owner's app name, else the shop name; the tagline when the owner shows it (T94).
  const name = appNameOf(shop.storefront.info.name, look.opening);
  const tagline = look.opening.showTagline ? shop.storefront.info.tagline : null;
  // The owner's opening colour (decision T93), in hex for the image renderer.
  const colours = openingColours(look);
  const { ratio } = screen;
  const width = screen.width * ratio;
  const height = screen.height * ratio;
  // The icon is the owner's logo size in CSS px, as the page's splash draws it, so the two line up.
  const logoPx = OPENING_LOGO_PX[look.opening.logoSize];
  const icon = logoPx * ratio;
  // The same logo as the page's splash (a real shop's uploaded logo too, T121), when it can be drawn.
  const iconUrl = splashIconUrl(slug, shop.storefront.info.logo);
  const iconSrc = iconUrl ? await drawableImage(new URL(iconUrl, request.url)) : null;

  // A shop without a logo yet shows its name alone.
  const mark = iconSrc
    ? createElement('img', {
        src: iconSrc,
        width: icon,
        height: icon,
        // rounded-2xl / 3xl / 4xl (a quarter of the logo) and gap-4, as the page's splash.
        style: { borderRadius: (logoPx / 4) * ratio, marginBottom: 16 * ratio },
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
      backgroundColor: colours.background,
      color: colours.foreground,
      fontFamily: 'sans-serif',
    },
    mark,
    // A long name wraps inside the screen, centred. Hidden when the owner turned it off (with a logo).
    look.opening.showName || !mark
      ? el(
          'span',
          { fontSize: 20 * ratio, fontWeight: 700, maxWidth: '80%', textAlign: 'center' },
          name,
        )
      : null,
    tagline
      ? el(
          'span',
          {
            fontSize: 14 * ratio,
            opacity: 0.8,
            maxWidth: '80%',
            textAlign: 'center',
            marginTop: 4 * ratio,
          },
          tagline,
        )
      : null,
  );

  return new ImageResponse(picture, {
    width,
    height,
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
