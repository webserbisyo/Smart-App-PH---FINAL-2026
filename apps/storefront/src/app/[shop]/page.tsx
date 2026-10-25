import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { DEMO_SHOP_SLUGS, imageSources } from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { BrandPanel } from '@smartapp/ui/compositions/brand-panel';
import { AboutSection } from '@/features/home/components/about-section';
import { AnnouncementBanner } from '@/features/home/components/announcement-banner';
import { BestSellersRow } from '@/features/home/components/best-sellers-row';
import { CategoriesChips } from '@/features/home/components/categories-chips';
import { ClosedCard } from '@/features/home/components/closed-card';
import { ContactSection } from '@/features/home/components/contact-section';
import { DemoRibbon } from '@/features/home/components/demo-ribbon';
import { FavouritesRow } from '@/features/home/components/favourites-row';
import { HomeBanners } from '@/features/home/components/home-banners';
import { HoursTable } from '@/features/home/components/hours-table';
import { MembersCount } from '@/features/home/components/members-count';
import { RewardsCard } from '@/features/home/components/rewards-card';
import { ShopFooter } from '@/features/home/components/shop-footer';
import { resolveHomeSections } from '@/features/home/rules';

interface ShopPageProps {
  params: Promise<{ shop: string }>;
}

export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

async function CachedShopHome({ slug }: { slug: string }) {
  'use cache';
  const shop = getStorefrontForServer(slug);
  if (!shop) notFound();

  // Static build reference time; dynamic client components (ClosedCard, HoursTable) adapt via useNow()
  const referenceTime = '2026-10-25T12:00:00+08:00';
  const { storefront, catalog } = shop;
  const visibility = resolveHomeSections(storefront, catalog, referenceTime);

  return (
    <div className="flex flex-col gap-6">
      {/* Demo ribbon at very top */}
      {visibility.demoRibbon ? <DemoRibbon /> : null}

      {/* 1. Banners / Brand Panel */}
      {visibility.brandPanel ? (
        <section aria-label="Brand">
          <BrandPanel
            name={storefront.info.name}
            tagline={storefront.info.tagline ?? undefined}
            logo={storefront.info.logo ? imageSources(storefront.info.logo) : null}
            ratio="21:9"
          />
        </section>
      ) : null}
      {visibility.banners ? (
        <section aria-label="Banners">
          <HomeBanners storefront={storefront} />
        </section>
      ) : null}

      {/* 2. Announcement banner */}
      {visibility.announcement && storefront.look.announcement ? (
        <AnnouncementBanner announcement={storefront.look.announcement} />
      ) : null}

      {/* 3. Closed or busy notice card (client component adapting to current time / scenario) */}
      <ClosedCard storefront={storefront} />

      {/* 4. Rewards card */}
      {visibility.rewards ? (
        <RewardsCard slug={storefront.slug} stampCard={storefront.stampCard} />
      ) : null}

      {/* 5. Favourites row */}
      {visibility.favourites ? <FavouritesRow slug={storefront.slug} catalog={catalog} /> : null}

      {/* 6. Categories chips */}
      {visibility.categories ? (
        <CategoriesChips slug={storefront.slug} categories={catalog.categories} />
      ) : null}

      {/* 7. Best sellers */}
      {visibility.bestSellers ? <BestSellersRow slug={storefront.slug} catalog={catalog} /> : null}

      {/* 8. About section */}
      {visibility.about && storefront.info.about ? (
        <AboutSection about={storefront.info.about} />
      ) : null}

      {/* 9. Hours table */}
      {visibility.hours ? (
        <HoursTable hours={storefront.hours} closures={storefront.closures} />
      ) : null}

      {/* 10. Contact section */}
      {visibility.contact ? <ContactSection contact={storefront.info.contact} /> : null}

      {/* 11. Members count pill */}
      {visibility.membersCount ? <MembersCount count={storefront.membersCount} /> : null}

      {/* 12. Footer */}
      {visibility.footer ? <ShopFooter shopName={storefront.info.name} /> : null}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Banner skeleton */}
      <AspectRatio ratio={21 / 9} className="w-full overflow-hidden rounded-lg">
        <Skeleton className="size-full" />
      </AspectRatio>

      {/* Card skeleton (c-skeleton-8 pattern) */}
      <Card className="w-full">
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>

      {/* Categories chips skeleton */}
      <div className="flex gap-2 overflow-hidden">
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-full" />
      </div>

      {/* Best sellers scroller skeleton */}
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
