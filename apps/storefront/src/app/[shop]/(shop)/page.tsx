import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { DEMO_SHOP_SLUGS } from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { HomeSections } from '@/features/home/components/home-sections';

interface ShopPageProps {
  params: Promise<{ shop: string }>;
}

export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

// Home: the sections live in HomeSections, shared with the Editor's preview (decision T72).
async function CachedShopHome({ slug }: { slug: string }) {
  'use cache';
  const shop = getStorefrontForServer(slug);
  if (!shop) notFound();

  // Static build reference time; client parts (chips, info card) follow the live clock via useNow().
  const referenceTime = '2026-10-25T12:00:00+08:00';
  return (
    <HomeSections
      storefront={shop.storefront}
      catalog={shop.catalog}
      referenceTime={referenceTime}
    />
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <AspectRatio ratio={21 / 9} className="w-full overflow-hidden rounded-2xl">
        <Skeleton className="size-full" />
      </AspectRatio>
      <Skeleton className="h-60 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-full" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="size-14 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden">
        <Skeleton className="h-56 w-48 shrink-0 rounded-xl" />
        <Skeleton className="h-56 w-48 shrink-0 rounded-xl" />
      </div>
    </div>
  );
}

async function ShopHomeContent({ params }: ShopPageProps) {
  const { shop: slug } = await params;
  return <CachedShopHome slug={slug} />;
}

export default function ShopHomePage(props: ShopPageProps) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <ShopHomeContent {...props} />
    </Suspense>
  );
}
