import * as React from 'react';
import { UtensilsIcon } from 'lucide-react';
import {
  itemPriceLabel,
  catalogWords,
  imageUrl,
  type OwnerItem,
  type Category,
} from '@smartapp/core';
import { env } from '@/app/env';
import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { Badge } from '@smartapp/ui/components/badge';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { ItemActionGroup } from './item-action-group.js';
import { cn } from 'cn';

export interface ItemsGridProps {
  items: OwnerItem[];
  categories: Category[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onEdit: (item: OwnerItem) => void;
  onDuplicate: (item: OwnerItem) => void;
  onToggleStatus: (item: OwnerItem) => void;
  onSetSoldOut: (item: OwnerItem) => void;
  onArchive: (item: OwnerItem) => void;
  onDelete: (item: OwnerItem) => void;
}

export function ItemsGrid({
  items,
  categories,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onSetSoldOut,
  onArchive,
  onDelete,
}: ItemsGridProps) {
  const categoryMap = React.useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {items.map((item) => {
        const isSelected = selectedSet.has(item.id);
        const isSoldOut = item.variants.every((v) => v.availability === 'sold_out');
        const isHidden = item.status === 'hidden';
        const category = categoryMap.get(item.categoryId);
        const photoRef = item.photos[0];

        const photoSrc = photoRef
          ? photoRef.startsWith('blob:') ||
            photoRef.startsWith('data:') ||
            photoRef.startsWith('http://') ||
            photoRef.startsWith('https://')
            ? photoRef
            : imageUrl(photoRef, 512, env.VITE_STOREFRONT_URL)
          : null;

        return (
          <div
            key={item.id}
            onClick={() => onEdit(item)}
            className={cn(
              'group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border bg-card p-2.5 transition-all duration-180 sm:p-3',
              isSoldOut && 'opacity-65',
              isSelected
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border/80 hover:border-primary/40 hover:shadow-xs',
            )}
          >
            {/* Selection checkbox */}
            <div
              className={cn(
                'absolute top-4 left-4 z-20 transition-opacity',
                isSelected || selectedIds.length > 0
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100',
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(item.id);
              }}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(item.id)}
                className="size-4 bg-background/90 backdrop-blur-xs"
                aria-label={`Select ${item.name}`}
              />
            </div>

            {/* Top: 4:3 Photo */}
            <div className="relative overflow-hidden rounded-lg bg-muted/60">
              <AspectRatio ratio={4 / 3} className="overflow-hidden">
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={item.name}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-180 group-hover:scale-105 motion-reduce:transform-none"
                  />
                ) : (
                  <div
                    className="flex size-full items-center justify-center bg-muted text-muted-foreground"
                    aria-hidden="true"
                  >
                    <UtensilsIcon className="size-8" />
                  </div>
                )}
              </AspectRatio>

              {/* Status badges overlaid on photo */}
              <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
                {isSoldOut && (
                  <Badge
                    variant="destructive"
                    className="px-1.5 py-0 text-xs font-semibold shadow-xs"
                  >
                    {catalogWords.statSoldOut}
                  </Badge>
                )}
                {isHidden && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-xs font-medium shadow-xs">
                    {catalogWords.statHidden}
                  </Badge>
                )}
                {item.sample && (
                  <Badge
                    variant="outline"
                    className="bg-card/80 px-1.5 py-0 text-xs font-medium shadow-xs"
                  >
                    {catalogWords.sampleBadge}
                  </Badge>
                )}
              </div>
            </div>

            {/* Middle: Details */}
            <div className="flex flex-col gap-1 pt-2.5 pb-2">
              <span className="line-clamp-1 text-sm leading-snug font-semibold transition-colors group-hover:text-primary">
                {item.name}
              </span>
              <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
                <span className="truncate">{category?.name ?? 'General'}</span>
                <span className="text-sm font-bold text-foreground tabular">
                  {itemPriceLabel(item)}
                </span>
              </div>
            </div>

            {/* Bottom: Action strip */}
            <div
              className="flex items-center justify-between border-t border-border/40 pt-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ItemActionGroup
                item={item}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onToggleStatus={onToggleStatus}
                onSetSoldOut={onSetSoldOut}
                onArchive={onArchive}
                onDelete={onDelete}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
