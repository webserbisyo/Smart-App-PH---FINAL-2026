import * as React from 'react';
import { itemPriceLabel, catalogWords, type OwnerItem, type Category } from '@smartapp/core';
import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { CatalogPhoto } from '../catalog-photo.js';
import { ItemStatusBadges, LabeledSwitch } from '../item-row.js';
import { ItemMenu } from './item-menu.js';
import { isItemSoldOut, type ItemActions } from './item-actions.js';
import { cn } from 'cn';

export interface ItemsGridProps {
  items: OwnerItem[];
  categories: Category[];
  actions: ItemActions;
  selecting: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

export function ItemsGrid({
  items,
  categories,
  actions,
  selecting,
  selectedIds,
  onToggleSelect,
}: ItemsGridProps) {
  const categoryMap = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
      {items.map((item) => {
        const isSelected = selectedSet.has(item.id);
        const soldOut = isItemSoldOut(item);
        const category = categoryMap.get(item.categoryId);
        const open = () => (selecting ? onToggleSelect(item.id) : actions.edit(item));

        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={open}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open();
              }
            }}
            className={cn(
              'group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-180',
              isSelected
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border/80 hover:border-primary/40 hover:shadow-xs',
            )}
          >
            <div className="relative bg-muted/60">
              <AspectRatio ratio={1} className="overflow-hidden">
                <CatalogPhoto
                  photoRef={item.photos[0] ?? null}
                  alt=""
                  size="lg"
                  className={cn('size-full rounded-none', soldOut && 'grayscale')}
                />
              </AspectRatio>
              {selecting ? (
                <div className="absolute top-2 left-2 z-10 flex size-11 items-center justify-center rounded-xl bg-background/90">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={catalogWords.selectItemAria(item.name)}
                    className="size-5"
                  />
                </div>
              ) : null}
              {selecting ? null : (
                <div className="absolute top-2 right-2 z-10 rounded-xl bg-background/90">
                  <ItemMenu item={item} actions={actions} />
                </div>
              )}
              <div className="absolute bottom-2 left-2 z-10 flex flex-wrap gap-1 empty:hidden">
                <ItemStatusBadges item={item} />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-0.5 p-2.5 md:gap-1 md:p-3">
              <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.name}</p>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="hidden truncate text-muted-foreground md:inline">
                  {category?.name ?? catalogWords.categoryGeneral}
                </span>
                <span className="shrink-0 font-semibold text-foreground tabular">
                  {itemPriceLabel(item)}
                </span>
              </div>
            </div>

            {selecting ? null : (
              <div className="flex items-center border-t border-border/60 px-2.5 md:px-3">
                <LabeledSwitch
                  label={catalogWords.soldOutSwitchToday}
                  ariaLabel={catalogWords.soldOutSwitchAria(item.name)}
                  checked={soldOut}
                  onCheckedChange={(checked) => actions.setSoldOut(item, checked)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
