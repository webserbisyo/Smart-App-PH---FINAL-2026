import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { appNameOf, DEMO_SHOP_SLUGS, isDemoShopSlug, shopPalette } from '@smartapp/core';
import { getShop } from '@/server/shop-read';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { fontPairVars } from '@smartapp/ui/lib/font-pairs';
import { AppSplash } from '@/features/install/components/app-splash';
import {
  IOS_SCREENS,
  shortName,
  splashMedia,
  splashSizeName,
} from '@/features/install/install-rules';
import { demoBrandFiles, shopIconUrls, splashIconUrl } from '@/features/install/shop-icons';
import { ShopApp } from '@/features/shell/components/shop-app';

interface ShopLayoutProps {
  params: Promise<{ shop: string }>;
  children: ReactNode;
}

// Built ahead: the 5 demo shops. Test shops render on demand and only outside production.
export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

export async function generateMetadata({ params }: ShopLayoutProps): Promise<Metadata> {
  const { shop: slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return {};
  const { name, tagline } = shop.storefront.info;
  const files = demoBrandFiles(slug);
  // The installed app's name: the owner's app name, else the shop name (T94).
  const appName = appNameOf(name, shop.storefront.look.opening);
  return {
    title: name,
    description: tagline ?? name,
    // Installs as its own app (T13): per-shop manifest, home screen name on iPhone.
    manifest: `/${slug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: shortName(appName),
      statusBarStyle: 'default',
      // The launch picture per iPhone and iPad screen: the shop's icon on its opening colour (R51, T93, T121).
      startupImage: IOS_SCREENS.map((screen) => ({
        url: `/${slug}/splash/${splashSizeName(screen)}`,
        media: splashMedia(screen),
      })),
    },
    // Every shop gets a PNG home screen icon (T121): the demo files, else drawn from its logo or initials.
    icons: { icon: shopIconUrls(slug).icon192, apple: shopIconUrls(slug).apple },
    ...(files
      ? { openGraph: { title: name, description: tagline ?? name, images: [files.og] } }
      : {}),
    ...(isDemoShopSlug(slug) ? {} : { robots: { index: false, follow: false } }),
  };
}

async function ShopFrame({ params, children }: ShopLayoutProps) {
  const { shop: slug } = await params;
  const shop = await getShop(slug);
  // Unknown, pending or suspended: the page calls notFound() (Cache Components wants it there).
  if (!shop) return children;
  const { brandColor, surface, pageColor, cardColor, fontPair } = shop.storefront.look;
  return (
    <ShopTheme
      brandColor={brandColor}
      surface={surface}
      pageColor={pageColor}
      cardColor={cardColor}
      fontPair={fontPair}
      withPortals
    >
      {/* Per-shop theme-color: the page colour (shop-60), so the phone's status bar meets the glass top bar.
          React hoists it into <head>; a viewport export can't read params without blocking the whole route
          under Cache Components. */}
      <meta
        name="theme-color"
        content={shopPalette(brandColor, surface, pageColor, cardColor).shop60}
      />
      <ShopApp shop={shop}>{children}</ShopApp>
    </ShopTheme>
  );
}

/**
 * The installed app's opening screen (T121), in a boundary of its own and placed first. The shop frame is
 * big, so React sends its placeholder (the grey bars on a white page) before it; this small part goes out
 * in the page's first bytes instead, so the app goes from the phone's launch screen straight to the logo.
 * The shop's fonts, so the name under the logo matches the page.
 */
async function OpeningScreen({ params }: Pick<ShopLayoutProps, 'params'>) {
  const { shop: slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return null;
  const { info, look } = shop.storefront;
  return (
    <div className="contents font-sans" style={cssVars(fontPairVars(look.fontPair))}>
      <AppSplash
        name={info.name}
        tagline={info.tagline}
        icon={splashIconUrl(slug, info.logo)}
        look={look}
      />
    </div>
  );
}

function FrameSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

// Params are read inside Suspense: the 5 demo shops still prerender at build, and an unlisted slug
// gets this shell first and streams in (Cache Components with Partial Prefetching).
export default function ShopLayout(props: ShopLayoutProps) {
  return (
    <>
      <Suspense fallback={null}>
        <OpeningScreen params={props.params} />
      </Suspense>
      <Suspense fallback={<FrameSkeleton />}>
        <ShopFrame {...props} />
      </Suspense>
    </>
  );
}
