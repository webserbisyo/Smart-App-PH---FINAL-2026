'use client';

import { useCallback, useEffect, useMemo, useRef, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { iconPath, menuSections, searchMenu, words, type Catalog, type Item } from '@smartapp/core';
import { useFavourites, useNow } from '@smartapp/data';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import { useShop } from '../../shell/components/shop-context';
import { ItemSheet } from '../item-sheet/item-sheet';
import { buildMenuSearch, parseMenuParams, type MenuParams } from '../url-state';
import { CategoryChips } from './category-chips';
import { CategoryRail } from './category-rail';
import { MenuCatalogEmpty, MenuFavouritesEmpty, MenuSearchEmpty } from './menu-empty';
import { MenuProductCard } from './menu-product-card';
import { MenuSearch } from './menu-search';
import { sectionId, useMenuSpy } from './menu-spy';

export interface MenuContentProps {
  catalog: Catalog;
  catalogTitle: string;
}

const GRID = 'grid grid-cols-2 gap-3 md:grid-cols-3';
const CARD_SIZES = '(min-width: 1024px) 240px, (min-width: 768px) 33vw, 50vw';

/**
 * Menu (redesign D8): every category is its own box and ReUI Scrollspy moves the chips (phones) or
 * the category box (from 1024 px) as you scroll. Search and Favourites show one flat grid instead.
 * URL: ?q= search, ?fav=1 favourites, ?cat= jump once to a category, ?item= the item sheet.
 */
export function MenuContent({ catalog, catalogTitle }: MenuContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { slug } = useShop();
  const favourites = useFavourites(slug);
  const now = useNow();

  const params: MenuParams = useMemo(() => parseMenuParams(searchParams), [searchParams]);
  const sections = useMemo(() => menuSections(catalog), [catalog]);
  const barRef = useRef<HTMLDivElement>(null);
  const { spy, jumpTo } = useMenuSpy(barRef);

  const query = params.q.trim();
  const mode = query ? 'search' : params.fav ? 'favourites' : 'browse';
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
    updateParams({ q: '', fav: false, cat: categoryId });

  if (catalog.items.length === 0) {
    return <MenuCatalogEmpty catalogName={catalogTitle} />;
  }

  const results =
    mode === 'search'
      ? searchMenu(catalog, query)
      : mode === 'favourites'
        ? catalog.items.filter((item) => item.status === 'active' && favourites.has(item.id))
        : [];

  const card = (item: Item) => (
    <MenuProductCard
      key={item.id}
      item={item}
      catalog={catalog}
      now={now}
      onOpen={handleOpenItem}
      sizes={CARD_SIZES}
    />
  );

  const navProps = {
    sections,
    spy: mode === 'browse' ? spy : null,
    onJump: leaveForCategory,
    hasFavourites: hasFavourites || params.fav,
    favActive: params.fav,
    onToggleFav: () => updateParams({ fav: !params.fav }),
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
                  ? words.storefrontShell.menu.results(results.length)
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

      <ItemSheet
        slug={slug}
        catalog={catalog}
        itemId={params.item}
        onClose={handleCloseItem}
        onOpenItem={handleOpenItem}
        now={now}
      />
    </div>
  );
}
