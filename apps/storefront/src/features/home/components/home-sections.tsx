import type { ReactNode } from 'react';
import { words, type Catalog, type EditorSection, type Storefront } from '@smartapp/core';
import { MembersPill } from '../../shop-info/components/members-pill';
import { resolveHomeSections } from '../rules';
import { AnnouncementStrip } from './announcement-strip';
import { BestSellersRow } from './best-sellers-row';
import { CategoriesChips } from './categories-chips';
import { FavouritesRow } from './favourites-row';
import type { BannerTextSlots } from './home-banners';
import { HomeHero } from './home-hero';
import { HomeInfoCard } from './home-info-card';
import { HomeStampCard } from './home-stamp-card';
import { SearchPill } from './search-pill';
import { ShopFooter } from './shop-footer';

export interface HomeSectionsProps {
  storefront: Storefront;
  catalog: Catalog;
  // The time the sections are worked out for (the build's reference time, or now in the preview).
  referenceTime: string | Date;
  // The Editor's preview puts each part in a frame the owner can tap (decision T72). Home leaves it off.
  wrap?: ((section: EditorSection, node: ReactNode) => ReactNode) | undefined;
  show?: { index: number; at: number } | undefined;
  bannerText?: BannerTextSlots | undefined;
}

const same = (_section: EditorSection, node: ReactNode) => node;

// Home (redesign plan, Home): hero with status chips, owner news, stamp card, search, categories,
// best sellers and favourites; shop info and members in a card (a sticky right column from 1024 px).
// About, the hours table and contact live in the Shop info sheet (R7); no closed card (R2).
// One layout for the live page and the Editor's preview, so the preview is always the real page.
export function HomeSections({
  storefront,
  catalog,
  referenceTime,
  wrap = same,
  show,
  bannerText,
}: HomeSectionsProps) {
  const visibility = resolveHomeSections(storefront, catalog, referenceTime);
  const showInfo = visibility.hours || visibility.contact || visibility.about;

  return (
    <div className="flex flex-col gap-6">
      {visibility.banners || visibility.brandPanel
        ? wrap(
            'banners',
            <HomeHero
              storefront={storefront}
              demo={visibility.demoRibbon}
              show={show}
              bannerText={bannerText}
            />,
          )
        : null}

      {visibility.announcement && storefront.look.announcement
        ? wrap('announcement', <AnnouncementStrip announcement={storefront.look.announcement} />)
        : null}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:items-start">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          {visibility.rewards
            ? wrap(
                'rewards',
                <HomeStampCard slug={storefront.slug} stampCard={storefront.stampCard} />,
              )
            : null}
          <SearchPill slug={storefront.slug} kind={storefront.info.kind} />
          {visibility.categories
            ? wrap(
                'categories',
                <CategoriesChips slug={storefront.slug} categories={catalog.categories} />,
              )
            : null}
          {visibility.bestSellers
            ? wrap('bestSellers', <BestSellersRow slug={storefront.slug} catalog={catalog} />)
            : null}
          {/* Hearts live on the phone, so the row decides on the client (it hides when empty). */}
          {storefront.look.sections.favourites
            ? wrap('favourites', <FavouritesRow slug={storefront.slug} catalog={catalog} />)
            : null}
        </div>
        {showInfo || visibility.membersCount ? (
          <aside
            aria-label={words.storefrontShell.info.title}
            className="flex flex-col gap-4 lg:sticky lg:top-24"
          >
            {showInfo ? wrap('info', <HomeInfoCard />) : null}
            {visibility.membersCount
              ? wrap(
                  'membersCount',
                  <div className="flex justify-center">
                    <MembersPill slug={storefront.slug} count={storefront.membersCount} />
                  </div>,
                )
              : null}
          </aside>
        ) : null}
      </div>

      {visibility.footer
        ? wrap(
            'brand',
            <ShopFooter
              slug={storefront.slug}
              shopName={storefront.info.name}
              logo={storefront.info.logo}
            />,
          )
        : null}
    </div>
  );
}
