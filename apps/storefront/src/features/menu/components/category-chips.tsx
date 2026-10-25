'use client';

import { iconPath, words, type Category } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Scroller } from '@smartapp/ui/components/scroller';
import { Toggle } from '@smartapp/ui/components/toggle';
import { HeartIcon } from 'lucide-react';

export interface CategoryChipsProps {
  categories: readonly Category[];
  selectedCat: string | null;
  onSelectCat: (catId: string | null) => void;
  hasFavourites: boolean;
  favActive: boolean;
  onToggleFav: () => void;
}

/**
 * Category chips in a horizontal Scroller (c-scrollspy-2 pattern),
 * with the Favourites chip (c-toggle-6 pattern) shown first when customer has saved items.
 */
export function CategoryChips({
  categories,
  selectedCat,
  onSelectCat,
  hasFavourites,
  favActive,
  onToggleFav,
}: CategoryChipsProps) {
  const sorted = [...categories].sort((a, b) => a.sort - b.sort);

  return (
    <Scroller orientation="horizontal" hideScrollbar className="w-full">
      <div className="flex items-center gap-2 py-1">
        {hasFavourites ? (
          <Toggle
            variant="outline"
            size="sm"
            aria-label="Filter favourites"
            aria-pressed={favActive}
            pressed={favActive}
            onPressedChange={onToggleFav}
            className={`h-9 shrink-0 gap-1.5 rounded-full px-3.5 text-xs font-medium ${
              favActive ? 'bg-primary text-primary-foreground' : ''
            }`}
          >
            <HeartIcon
              className={`size-3.5 ${favActive ? 'fill-current text-primary-foreground' : 'text-primary'}`}
              aria-hidden="true"
            />
            <span>{words.storefrontShell.menu.favourites}</span>
          </Toggle>
        ) : null}

        <Button
          size="sm"
          variant={selectedCat === null && !favActive ? 'default' : 'outline'}
          className="h-9 shrink-0 rounded-full px-4 text-xs font-medium"
          onClick={() => onSelectCat(null)}
        >
          {words.storefrontShell.menu.all}
        </Button>

        {sorted.map((cat) => {
          const isSelected = selectedCat === cat.id && !favActive;
          return (
            <Button
              key={cat.id}
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
              className="h-9 shrink-0 gap-1.5 rounded-full px-3.5 text-xs font-medium"
              onClick={() => onSelectCat(cat.id)}
            >
              <img
                src={iconPath(cat.icon)}
                alt=""
                width={20}
                height={20}
                loading="lazy"
                className="size-4 shrink-0 object-contain"
              />
              <span>{cat.name}</span>
            </Button>
          );
        })}
      </div>
    </Scroller>
  );
}
