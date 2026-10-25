'use client';

import { useMemo, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { words, type Catalog, type Item } from '@smartapp/core';
import { useBasket, useFavourites, useNow } from '@smartapp/data';
import { notify } from '@smartapp/ui/compositions/notify';
import { useShop } from '../../shell/components/shop-context';
import { ItemSheet } from '../item-sheet/item-sheet';
import { buildMenuSearch, parseMenuParams, type MenuParams } from '../url-state';
import { CategoryChips } from './category-chips';
import { CategoryRail } from './category-rail';
import { MenuCatalogEmpty, MenuSearchEmpty } from './menu-empty';
import { MenuSearch } from './menu-search';
import { ProductCard } from './product-card';

export interface MenuContentProps {
  catalog: Catalog;
  catalogTitle: string;
}

export function MenuContent({ catalog, catalogTitle }: MenuContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { slug } = useShop();
  const favourites = useFavourites(slug);
  const basket = useBasket(slug);
  const now = useNow();

  // Parse current URL state
  const params: MenuParams = useMemo(() => {
    return parseMenuParams(searchParams);
  }, [searchParams]);

  // Update URL helper without jumping scroll
  const updateParams = (updates: Partial<MenuParams>, transition = false) => {
    const nextSearch = buildMenuSearch(params, updates);
    if (transition) {
      startTransition(() => {
        router.replace(`${pathname}${nextSearch}`, { scroll: false });
      });
    } else {
      router.replace(`${pathname}${nextSearch}`, { scroll: false });
    }
  };

  const handleSearchChange = (query: string) => {
    updateParams({ q: query }, true);
  };

  const handleSelectCat = (catId: string | null) => {
    updateParams({ cat: catId, fav: false });
  };

  const handleToggleFav = () => {
    updateParams({ fav: !params.fav });
  };

  const handleOpenItem = (itemId: string) => {
    updateParams({ item: itemId });
  };

  const handleCloseItem = () => {
    updateParams({ item: null });
  };

  const handleQuickAdd = (item: Item) => {
    const variant = item.variants[0];
    if (!variant) return;

    basket.add({
      itemId: item.id,
      variantId: variant.id,
      optionIds: [],
      note: '',
      qty: 1,
    });

    notify({
      title: `${item.name} added`,
      description: words.storefrontShell.menu.viewBasket,
      tone: 'success',
    });
  };

  // Filter catalog items
  const filteredItems = useMemo(() => {
    return catalog.items.filter((item) => {
      if (item.status !== 'active') return false;

      // Favourites filter
      if (params.fav && !favourites.has(item.id)) return false;

      // Category filter
      if (params.cat && item.categoryId !== params.cat) return false;

      // Search query filter
      if (params.q.trim().length > 0) {
        const query = params.q.trim().toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(query);
        const descMatch = item.description?.toLowerCase().includes(query) ?? false;
        if (!nameMatch && !descMatch) return false;
      }

      return true;
    });
  }, [catalog.items, params.fav, params.cat, params.q, favourites]);

  // If entire catalog is empty (test-blank)
  if (catalog.items.length === 0) {
    return <MenuCatalogEmpty catalogName={catalogTitle} />;
  }

  const hasFavourites = favourites.ids.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Sticky Header: Search input + Category chips */}
      <div className="sticky top-14 z-20 -mx-4 flex flex-col gap-2 border-b border-border/80 bg-background/95 px-4 pt-3 pb-2 backdrop-blur-md">
        <MenuSearch
          placeholder={words.storefrontShell.menu.searchPlaceholder(catalogTitle)}
          value={params.q}
          onChange={handleSearchChange}
          isPending={isPending}
        />

        <div className="lg:hidden">
          <CategoryChips
            categories={catalog.categories}
            selectedCat={params.cat}
            onSelectCat={handleSelectCat}
            hasFavourites={hasFavourites}
            favActive={params.fav}
            onToggleFav={handleToggleFav}
          />
        </div>
      </div>

      {/* Main Grid with Desktop Left Rail */}
      <div className="flex items-start gap-6">
        {/* Desktop category rail (c-scrollspy-1) */}
        <CategoryRail
          categories={catalog.categories}
          selectedCat={params.cat}
          onSelectCat={handleSelectCat}
          hasFavourites={hasFavourites}
          favActive={params.fav}
          onToggleFav={handleToggleFav}
        />

        {/* Content area: Grid or Empty search */}
        <div className="min-w-0 flex-1">
          {filteredItems.length === 0 ? (
            <MenuSearchEmpty
              query={params.q || (params.fav ? words.storefrontShell.menu.favourites : 'category')}
              onClear={() => updateParams({ q: '', cat: null, fav: false })}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const category = catalog.categories.find((c) => c.id === item.categoryId);
                const isFav = favourites.has(item.id);

                return (
                  <ProductCard
                    key={item.id}
                    item={item}
                    category={category}
                    optionGroups={catalog.optionGroups}
                    isFav={isFav}
                    onToggleFav={() => favourites.toggle(item.id)}
                    onOpenItem={handleOpenItem}
                    onQuickAdd={handleQuickAdd}
                    now={now}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Item Sheet Overlay (?item=<id>) */}
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
