import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { DEMO_SHOP_SLUGS, words } from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { AnnouncementStrip } from '@/features/home/components/announcement-strip';
import { BestSellersRow } from '@/features/home/components/best-sellers-row';
import { CategoriesChips } from '@/features/home/components/categories-chips';
import { FavouritesRow } from '@/features/home/components/favourites-row';
import { HomeHero } from '@/features/home/components/home-hero';
import { HomeInfoCard } from '@/features/home/components/home-info-card';
import { HomeStampCard } from '@/features/home/components/home-stamp-card';
import { SearchPill } from '@/features/home/components/search-pill';
import { ShopFooter } from '@/features/home/components/shop-footer';
import { MembersPill } from '@/features/shop-info/components/members-pill';
import { resolveHomeSections } from '@/features/home/rules';

interface ShopPageProps {
  params: Promise<{ shop: string }>;
}

export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

// Home (redesign plan, Home): hero with status chips, owner news, stamp card, search, categories,
// best sellers and favourites; shop info and members in a card (a sticky right column from 1024 px).
// About, the hours table and contact live in the Shop info sheet (R7); no closed card (R2).
async function CachedShopHome({ slug }: { slug: string }) {
  'use cache';
  const shop = getStorefrontForServer(slug);
  if (!shop) notFound();

  // Static build reference time; client parts (chips, info card) follow the live clock via useNow().
  const referenceTime = '2026-10-25T12:00:00+08:00';
  const { storefront, catalog } = shop;
  const visibility = resolveHomeSections(storefront, catalog, referenceTime);
  const showInfo = visibility.hours || visibility.contact || visibility.about;

  return (
    <div className="flex flex-col gap-6">
      {visibility.banners || visibility.brandPanel ? (
        <HomeHero storefront={storefront} demo={visibility.demoRibbon} />
      ) : null}

      {visibility.announcement && storefront.look.announcement ? (
        <AnnouncementStrip announcement={storefront.look.announcement} />
      ) : null}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:items-start">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          {visibility.rewards ? (
            <HomeStampCard slug={storefront.slug} stampCard={storefront.stampCard} />
          ) : null}
          <SearchPill slug={storefront.slug} kind={storefront.info.kind} />
          {visibility.categories ? (
            <CategoriesChips slug={storefront.slug} categories={catalog.categories} />
          ) : null}
          {visibility.bestSellers ? (
            <BestSellersRow slug={storefront.slug} catalog={catalog} />
          ) : null}
          {/* Hearts live on the phone, so the row decides on the client (it hides when empty). */}
          {storefront.look.sections.favourites ? (
            <FavouritesRow slug={storefront.slug} catalog={catalog} />
          ) : null}
        </div>
        {showInfo || visibility.membersCount ? (
          <aside
            aria-label={words.storefrontShell.info.title}
            className="flex flex-col gap-4 lg:sticky lg:top-24"
          >
            {showInfo ? <HomeInfoCard /> : null}
            {visibility.membersCount ? (
              <div className="flex justify-center">
                <MembersPill slug={storefront.slug} count={storefront.membersCount} />
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>

      {visibility.footer ? (
        <ShopFooter shopName={storefront.info.name} logo={storefront.info.logo} />
      ) : null}
    </div>
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
