import * as React from 'react';
import { SearchXIcon } from 'lucide-react';
import {
  imageSources,
  itemPriceLabel,
  itemSoldOutLabel,
  menuSections,
  newOrderWords,
  searchMenu,
  type Catalog,
  type Item,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Scroller } from '@smartapp/ui/components/scroller';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { ProductCard, type ProductBadge } from '@smartapp/ui/compositions/product-card';
import { PageEmpty } from '@/app/page-state';
import { SearchField } from '@/app/search-field';
import { env } from '@/app/env';

const W = newOrderWords.items;
const ALL = 'all';

/**
 * Step 1 of New order (T111): search, category chips and the shop's items as photo tiles (the shared
 * product card). A tap adds one; an item with choices opens its choices. Sold out items stay greyed.
 */
export function ItemGrid({
  catalog,
  now,
  countOf,
  onPick,
}: {
  catalog: Catalog;
  now: Date;
  countOf: (itemId: string) => number;
  onPick: (item: Item) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<string>(ALL);
  const sections = React.useMemo(() => menuSections(catalog), [catalog]);
  const searching = query.trim() !== '';
  const items = searching
    ? searchMenu(catalog, query)
    : category === ALL
      ? sections.flatMap((s) => s.items)
      : (sections.find((s) => s.category.id === category)?.items ?? []);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={W.searchPlaceholder}
        clearLabel={W.clearSearch}
        ariaLabel={W.search}
      />
      {!searching && sections.length > 1 ? (
        <Scroller orientation="horizontal" hideScrollbar className="-mx-1 min-w-0 px-1">
          <ToggleGroup
            value={[category]}
            onValueChange={(next) => {
              const picked = next[0];
              if (picked) setCategory(picked);
            }}
            aria-label={W.categories}
            spacing={2}
            className="flex w-max"
          >
            {[{ id: ALL, name: W.all }, ...sections.map((s) => s.category)].map((c) => (
              <ToggleGroupItem
                key={c.id}
                value={c.id}
                variant="outline"
                className="h-11 rounded-full px-4 text-sm font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground md:h-9"
              >
                {c.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Scroller>
      ) : null}

      {items.length === 0 ? (
        <PageEmpty
          variant="box"
          icon={<SearchXIcon />}
          title={W.noMatch(query.trim())}
          description={W.noMatchBody}
          action={
            <Button variant="outline" className="h-11 md:h-9" onClick={() => setQuery('')}>
              {W.clearSearch}
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item, index) => (
            <li key={item.id} className="relative">
              <ItemTile
                item={item}
                catalog={catalog}
                now={now}
                count={countOf(item.id)}
                priority={index < 4}
                onPick={() => onPick(item)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemTile({
  item,
  catalog,
  now,
  count,
  priority,
  onPick,
}: {
  item: Item;
  catalog: Catalog;
  now: Date;
  count: number;
  priority: boolean;
  onPick: () => void;
}) {
  const price = itemPriceLabel(item);
  const soldOut = itemSoldOutLabel(item, now);
  const photo = item.photos[0];
  const icon = catalog.categories.find((c) => c.id === item.categoryId)?.icon;
  const badges: ProductBadge[] = soldOut ? [{ tone: 'soldOut', label: soldOut }] : [];
  return (
    <>
      <ProductCard
        name={item.name}
        priceLabel={price}
        photo={photo ? imageSources(photo) : null}
        fallbackIcon={icon}
        sizes="(min-width: 1280px) 200px, (min-width: 480px) 30vw, 45vw"
        priority={priority}
        openLabel={W.add(item.name)}
        onOpen={() => {
          if (!soldOut) onPick();
        }}
        badges={badges}
        soldOut={soldOut !== null}
        add={{ label: W.add(item.name), onClick: onPick }}
        assetOrigin={env.VITE_STOREFRONT_URL}
        className="h-full"
      />
      {count > 0 ? (
        <Badge
          variant="default"
          size="lg"
          radius="full"
          className="pointer-events-none absolute top-2.5 right-2.5 min-w-7 justify-center font-bold tabular-nums shadow-sm"
          aria-label={W.inOrder(count)}
        >
          {count}
        </Badge>
      ) : null}
    </>
  );
}
