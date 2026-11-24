import * as React from 'react';
import { BanIcon, LayoutGridIcon, PlusIcon, SearchXIcon } from 'lucide-react';
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
import { CategoryIcon } from '@smartapp/ui/compositions/category-icon';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { cn } from 'cn';
import { PageEmpty } from '@/app/page-state';
import { SearchField } from '@/app/search-field';
import { env } from '@/app/env';

const W = newOrderWords.items;
const ALL = 'all';

/**
 * Step 1 of New order (T111, T113): search, category chips with their icons and the shop's items as
 * compact photo tiles (3 across on a phone, so 9 fit a screen). A tap adds one; an item with choices
 * opens its choices. Sold out items stay greyed and can't be tapped.
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
            <ToggleGroupItem
              value={ALL}
              variant="outline"
              className="h-11 gap-1.5 rounded-full pr-4 pl-3 text-sm font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground md:h-9"
            >
              <LayoutGridIcon aria-hidden="true" />
              {W.all}
            </ToggleGroupItem>
            {sections.map(({ category: c }) => (
              <ToggleGroupItem
                key={c.id}
                value={c.id}
                variant="outline"
                className="h-11 gap-1.5 rounded-full pr-4 pl-2 text-sm font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground md:h-9"
              >
                <CategoryIcon
                  icon={c.icon}
                  size={20}
                  assetOrigin={env.VITE_STOREFRONT_URL}
                  className="size-5 object-contain"
                  textClassName="text-base leading-none"
                />
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
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item, index) => (
            <li key={item.id} className="min-w-0">
              <ItemTile
                item={item}
                catalog={catalog}
                now={now}
                count={countOf(item.id)}
                priority={index < 6}
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
  return (
    <button
      type="button"
      onClick={() => {
        if (!soldOut) onPick();
      }}
      disabled={soldOut !== null}
      aria-label={soldOut ? `${item.name}, ${soldOut}` : W.add(item.name)}
      className="group/tile relative flex h-full w-full flex-col gap-1.5 rounded-xl bg-card p-1 text-left text-card-foreground shadow-xs ring-1 ring-foreground/8 transition-shadow duration-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed hover-hover:hover:shadow-md"
    >
      <span className="relative block overflow-hidden rounded-lg">
        <ShopImage
          src={photo ? imageSources(photo, env.VITE_STOREFRONT_URL) : null}
          alt=""
          ratio="1:1"
          fallbackIcon={icon}
          fallbackText={item.name}
          sizes="(min-width: 1280px) 160px, (min-width: 640px) 22vw, 31vw"
          priority={priority}
          assetOrigin={env.VITE_STOREFRONT_URL}
          className={cn(
            'transition-transform duration-slow ease-standard hover-hover:group-hover/tile:scale-105',
            soldOut && 'opacity-60 grayscale',
          )}
        />
        {soldOut ? (
          <Badge
            variant="invert"
            size="sm"
            radius="full"
            className="absolute inset-x-1 bottom-1 justify-center gap-1"
          >
            <BanIcon aria-hidden="true" />
            <span className="truncate">{soldOut}</span>
          </Badge>
        ) : (
          <span
            aria-hidden="true"
            className="absolute right-1 bottom-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
          >
            <PlusIcon className="size-4" />
          </span>
        )}
        {count > 0 ? (
          <Badge
            variant="default"
            size="lg"
            radius="full"
            className="pointer-events-none absolute top-1 left-1 min-w-7 justify-center font-bold tabular-nums shadow-sm"
            aria-label={W.inOrder(count)}
          >
            {count}
          </Badge>
        ) : null}
      </span>
      <span className="line-clamp-2 min-h-8 px-1 text-xs leading-4 font-medium break-words sm:min-h-10 sm:text-sm sm:leading-5">
        {item.name}
      </span>
      <span className="px-1 pb-1 text-sm font-bold whitespace-nowrap tabular-nums">{price}</span>
    </button>
  );
}
