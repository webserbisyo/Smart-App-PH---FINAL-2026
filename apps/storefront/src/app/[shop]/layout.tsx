import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { DEMO_MEDIA, DEMO_SHOP_SLUGS, isDemoShopSlug, shopPalette } from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';
import { ShopApp } from '@/features/shell/components/shop-app';

interface ShopLayoutProps {
  params: Promise<{ shop: string }>;
  children: ReactNode;
}

// Built ahead: the 5 demo shops. Test shops render on demand and only outside production.
export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

function brandFiles(slug: string) {
  if (!isDemoShopSlug(slug) || !DEMO_MEDIA[slug].logo) return null;
  const base = `/demo/${slug}/brand`;
  return {
    icon: `${base}/icon-192.png`,
    apple: `${base}/apple-touch-icon.png`,
    og: `${base}/og.jpg`,
  };
}

export async function generateMetadata({ params }: ShopLayoutProps): Promise<Metadata> {
  const { shop: slug } = await params;
  const shop = getStorefrontForServer(slug);
  if (!shop) return {};
  const { name, tagline } = shop.storefront.info;
  const files = brandFiles(slug);
  return {
    title: name,
    description: tagline ?? name,
    ...(files
      ? {
          icons: { icon: files.icon, apple: files.apple },
          openGraph: { title: name, description: tagline ?? name, images: [files.og] },
        }
      : {}),
    ...(isDemoShopSlug(slug) ? {} : { robots: { index: false, follow: false } }),
  };
}

async function ShopFrame({ params, children }: ShopLayoutProps) {
  const { shop: slug } = await params;
  const shop = getStorefrontForServer(slug);
  // Unknown, pending or suspended: the page calls notFound() (Cache Components wants it there).
  if (!shop) return children;
  const { brandColor, surface } = shop.storefront.look;
  return (
    <ShopTheme brandColor={brandColor} surface={surface} withPortals>
      {/* Per-shop theme-color: the page colour (shop-60), so the phone's status bar meets the glass top bar.
          React hoists it into <head>; a viewport export can't read params without blocking the whole route
          under Cache Components. */}
      <meta name="theme-color" content={shopPalette(brandColor, surface).shop60} />
      <ShopApp shop={shop}>{children}</ShopApp>
    </ShopTheme>
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
    <Suspense fallback={<FrameSkeleton />}>
      <ShopFrame {...props} />
    </Suspense>
  );
}
