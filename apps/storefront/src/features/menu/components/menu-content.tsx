'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FlameIcon, HeartIcon, SparklesIcon } from 'lucide-react';
import { iconPath, menuSections, searchMenu, words, type Catalog, type Item } from '@smartapp/core';
import { useFavourites, useNow } from '@smartapp/data';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import { useShop } from '../../shell/components/shop-context';
import { useWhenIdle } from '../../shell/use-when-idle';
import {
  buildMenuSearch,
  parseMenuParams,
  type MenuParamSource,
  type MenuParams,
} from '../url-state';
import { CategoryChips } from './category-chips';
import { CategoryRail } from './category-rail';
import type { MenuPick } from './menu-picks';
import { MenuCatalogEmpty, MenuFavouritesEmpty, MenuSearchEmpty } from './menu-empty';
import { MenuProductCard } from './menu-product-card';
import { MenuSearch } from './menu-search';
import { sectionId, useMenuSpy } from './menu-spy';

export interface MenuContentProps {
  catalog: Catalog;
  catalogTitle: string;
}

// The sheet (drawer, number field, photo carousel) loads when the page is idle or an item opens, so the
// menu's first JavaScript stays small (decision R49).
const ItemSheet = dynamic(() => import('../item-sheet/item-sheet').then((m) => m.ItemSheet), {
  ssr: false,
});

const GRID = 'grid grid-cols-2 gap-3 md:grid-cols-3';
const CARD_SIZES = '(min-width: 1024px) 240px, (min-width: 768px) 33vw, 50vw';
// Two cards a row on a phone.
const FIRST_ROW = 2;

/**
 * Menu (redesign D8): every category is its own box and ReUI Scrollspy moves the chips (phones) or
 * the category box (from 1024 px) as you scroll. Search and Favourites show one flat grid instead.
 * URL: ?q= search, ?fav=1 favourites, ?show=best|new the quick lists, ?cat= jump once to a category,
 * ?item= the item sheet.
 */
export function MenuContent(props: MenuContentProps) {
  // The URL's ?q=, ?fav= and so on are only known in the browser. The server sends the plain menu (no
  // search, no sheet) as this boundary's stand-in, so the first paint is the real menu, not a skeleton
  // waiting for every script (decision R50); the browser then swaps in the view for the URL.
  return (
    <Suspense fallback={<MenuView {...props} searchParams={NO_PARAMS} />}>
      <MenuForUrl {...props} />
    </Suspense>
  );
}

const NO_PARAMS: MenuParamSource = { get: () => null };

function MenuForUrl(props: MenuContentProps) {
  return <MenuView {...props} searchParams={useSearchParams()} />;
}

function MenuView({
  catalog,
  catalogTitle,
  searchParams,
}: MenuContentProps & { searchParams: MenuParamSource }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { slug } = useShop();
  const favourites = useFavourites(slug);
  const now = useNow();

  const params: MenuParams = useMemo(() => parseMenuParams(searchParams), [searchParams]);
  const sections = useMemo(() => menuSections(catalog), [catalog]);
  const barRef = useRef<HTMLDivElement>(null);
  const { spy, jumpTo } = useMenuSpy(barRef);
  const [sheetLoaded, loadSheet] = useWhenIdle();
  if (params.item && !sheetLoaded) loadSheet();

  const query = params.q.trim();
  const mode = query
    ? 'search'
    : params.fav
      ? 'favourites'
      : params.show === 'best'
        ? 'best'
        : params.show === 'new'
          ? 'new'
          : 'browse';
  const hasFavourites = favourites.ids.length > 0;

  const updateParams = useCallback(
    (updates: Partial<MenuParams>, transition = false) => {
      const href = `${pathname}${buildMenuSearch(params, updates)}`;
      if (transition) startTransition(() => router.replace(href, { scroll: false }));
      else router.replace(href, { scroll: false });
    },
    [params, pathname, router],
  );

  // ?cat= (Home's category tiles, a chip tapped in Favourites): jump once, then drop it.
  const spyReady = spy !== null;
  useEffect(() => {
    if (mode !== 'browse' || !params.cat || !spyReady) return;
    jumpTo(params.cat, false);
    updateParams({ cat: null });
  }, [jumpTo, mode, params.cat, spyReady, updateParams]);

  // Home's search pill links to #search: the box is ready to type in.
  useEffect(() => {
    if (window.location.hash === '#search') document.getElementById('search')?.focus();
  }, []);

  const handleOpenItem = useCallback((id: string) => updateParams({ item: id }), [updateParams]);
  const handleCloseItem = useCallback(() => updateParams({ item: null }), [updateParams]);
  const leaveForCategory = (categoryId: string) =>
    updateParams({ q: '', fav: false, show: null, cat: categoryId });

  if (catalog.items.length === 0) {
    return <MenuCatalogEmpty catalogName={catalogTitle} />;
  }

  const active = catalog.items.filter((item) => item.status === 'active');
  const bestSellers = active.filter((item) => item.featured);
  const newItems = active.filter((item) => item.isNew);
  const results =
    mode === 'search'
      ? searchMenu(catalog, query)
      : mode === 'favourites'
        ? active.filter((item) => favourites.has(item.id))
        : mode === 'best'
          ? bestSellers
          : mode === 'new'
            ? newItems
            : [];

  const M = words.storefrontShell.menu;
  const picks: MenuPick[] = [
    ...(hasFavourites || params.fav
      ? [
          {
            id: 'fav' as const,
            label: M.favourites,
            toggleLabel: M.filterFavourites,
            icon: HeartIcon,
            pressed: params.fav,
            onToggle: () => updateParams({ fav: !params.fav, show: null }),
          },
        ]
      : []),
    ...(bestSellers.length > 0
      ? [
          {
            id: 'best' as const,
            label: M.bestSellers,
            toggleLabel: M.filterBestSellers,
            icon: FlameIcon,
            pressed: mode === 'best',
            onToggle: () => updateParams({ fav: false, show: mode === 'best' ? null : 'best' }),
            count: bestSellers.length,
          },
        ]
      : []),
    ...(newItems.length > 0
      ? [
          {
            id: 'new' as const,
            label: M.newItems,
            toggleLabel: M.filterNew,
            icon: SparklesIcon,
            pressed: mode === 'new',
            onToggle: () => updateParams({ fav: false, show: mode === 'new' ? null : 'new' }),
            count: newItems.length,
          },
        ]
      : []),
  ];

  // The first row's photos are the page's largest paint on a phone: they load at once.
  const firstIds = new Set(sections[0]?.items.slice(0, FIRST_ROW).map((item) => item.id));
  const card = (item: Item) => (
    <MenuProductCard
      key={item.id}
      item={item}
      catalog={catalog}
      now={now}
      onOpen={handleOpenItem}
      sizes={CARD_SIZES}
      priority={firstIds.has(item.id)}
    />
  );

  const navProps = {
    sections,
    spy: mode === 'browse' ? spy : null,
    onJump: leaveForCategory,
    picks,
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">{catalogTitle}</h1>

      {/* Glass bar under the top bar: search, then the chips on phones. */}
      <div
        ref={barRef}
        className="sticky sticky-top-16 z-sticky -mx-4 flex flex-col gap-2 border-b glass px-4 py-2 lg:mx-0 lg:flex-row lg:items-center lg:gap-4 lg:rounded-2xl lg:border lg:px-3 lg:py-3 lg:shadow-sm"
      >
        <p aria-hidden="true" className="hidden pl-2 text-xl font-semibold tracking-tight lg:block">
          {catalogTitle}
        </p>
        <MenuSearch
          id="search"
          placeholder={words.storefrontShell.menu.searchPlaceholder(catalogTitle)}
          value={params.q}
          onChange={(q) => updateParams({ q }, true)}
          isPending={isPending}
          className="lg:ml-auto lg:max-w-md"
        />
        {mode !== 'search' ? (
          <div className="lg:hidden">
            <CategoryChips {...navProps} />
          </div>
        ) : null}
      </div>

      <div className="flex items-start gap-6">
        <CategoryRail {...navProps} />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {mode === 'browse'
            ? sections.map(({ category, items }) => (
                <section
                  key={category.id}
                  id={sectionId(category.id)}
                  aria-labelledby={`${sectionId(category.id)}-title`}
                  className="flex flex-col gap-3 rounded-3xl bg-muted/50 p-3 lg:p-4"
                >
                  <header className="flex items-center gap-3 px-1">
                    <IconTile variant="frame" size="default" radius="full">
                      <img
                        src={iconPath(category.icon)}
                        alt=""
                        width={24}
                        height={24}
                        loading="lazy"
                        className="size-6 object-contain"
                      />
                    </IconTile>
                    <h2
                      id={`${sectionId(category.id)}-title`}
                      className="min-w-0 truncate text-lg font-semibold tracking-tight"
                    >
                      {category.name}
                    </h2>
                    <span className="ml-auto shrink-0 text-sm text-muted-foreground tabular">
                      {words.storefrontShell.menu.itemCount(items.length)}
                    </span>
                  </header>
                  <div className={GRID}>{items.map(card)}</div>
                </section>
              ))
            : null}

          {mode !== 'browse' && results.length > 0 ? (
            <section aria-live="polite" className="flex flex-col gap-3">
              <h2 className="px-1 text-sm font-medium text-muted-foreground">
                {mode === 'search'
                  ? M.results(results.length)
                  : mode === 'best'
                    ? M.bestSellers
                    : mode === 'new'
                      ? M.newItems
                      : words.storefrontShell.favourites}
              </h2>
              <div className={GRID}>{results.map(card)}</div>
            </section>
          ) : null}

          {mode === 'search' && results.length === 0 ? (
            <MenuSearchEmpty
              query={query}
              sections={sections}
              onClear={() => updateParams({ q: '' })}
              onPick={leaveForCategory}
            />
          ) : null}

          {mode === 'favourites' && results.length === 0 ? (
            <MenuFavouritesEmpty
              catalogName={catalogTitle}
              onBrowse={() => updateParams({ fav: false })}
            />
          ) : null}
        </div>
      </div>

      {sheetLoaded ? (
        <ItemSheet
          slug={slug}
          catalog={catalog}
          itemId={params.item}
          onClose={handleCloseItem}
          onOpenItem={handleOpenItem}
          now={now}
        />
      ) : null}
    </div>
  );
}
