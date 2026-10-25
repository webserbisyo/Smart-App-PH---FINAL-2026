'use client';

import { iconPath, words, type Category } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { HeartIcon } from 'lucide-react';

export interface CategoryRailProps {
  categories: readonly Category[];
  selectedCat: string | null;
  onSelectCat: (catId: string | null) => void;
  hasFavourites: boolean;
  favActive: boolean;
  onToggleFav: () => void;
}

/**
 * Desktop category rail (c-scrollspy-1 pattern) on 1024px+ screens.
 */
export function CategoryRail({
  categories,
  selectedCat,
  onSelectCat,
  hasFavourites,
  favActive,
  onToggleFav,
}: CategoryRailProps) {
  const sorted = [...categories].sort((a, b) => a.sort - b.sort);

  return (
    <aside
      aria-label={words.storefrontShell.home.categories}
      className="sticky top-20 hidden w-48 shrink-0 self-start lg:block"
    >
      <nav className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-2 shadow-xs">
        {hasFavourites ? (
          <Button
            size="sm"
            variant={favActive ? 'default' : 'ghost'}
            aria-label="Filter favourites"
            className="w-full justify-start gap-2.5 rounded-lg px-3 py-2 text-sm font-medium"
            onClick={onToggleFav}
          >
            <HeartIcon
              className={`size-4 ${favActive ? 'fill-current text-primary-foreground' : 'text-primary'}`}
              aria-hidden="true"
            />
            <span>{words.storefrontShell.menu.favourites}</span>
          </Button>
        ) : null}

        <Button
          size="sm"
          variant={selectedCat === null && !favActive ? 'default' : 'ghost'}
          className="w-full justify-start rounded-lg px-3 py-2 text-sm font-medium"
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
              variant={isSelected ? 'default' : 'ghost'}
              className="w-full justify-start gap-2.5 rounded-lg px-3 py-2 text-sm font-medium"
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
              <span className="truncate">{cat.name}</span>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
