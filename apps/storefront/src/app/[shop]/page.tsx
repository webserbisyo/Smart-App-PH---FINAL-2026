import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { words } from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { TodayHours } from '@/features/home/components/today-hours';

interface ShopPageProps {
  params: Promise<{ shop: string }>;
}

// Home for now: tagline, about and today's hours. T06 builds the full Home.
async function ShopHome({ params }: ShopPageProps) {
  const { shop: slug } = await params;
  const shop = getStorefrontForServer(slug);
  if (!shop) notFound();
  const { name, tagline, about } = shop.storefront.info;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight break-words">
        {tagline ?? words.storefrontShell.home.welcome(name)}
      </h1>
      <TodayHours />
      {about ? (
        <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold">{words.storefrontShell.home.about}</h2>
          <p className="text-sm whitespace-pre-line text-muted-foreground">{about}</p>
        </section>
      ) : null}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

// Params are read inside Suspense, so an unlisted slug streams in behind a fallback (Cache Components).
export default function ShopHomePage(props: ShopPageProps) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <ShopHome {...props} />
    </Suspense>
  );
}
