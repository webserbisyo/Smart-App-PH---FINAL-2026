'use client';

import { HeartIcon, SearchXIcon } from 'lucide-react';
import { iconPath, words, type MenuSection } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';

function StackedCardsIllustration() {
  return (
    <div className="relative h-24 w-52" aria-hidden="true">
      {/* Back card */}
      <div className="absolute inset-x-6 top-0 h-6 rounded-t-lg border border-border/50 bg-muted/60 dark:bg-muted/30" />
      {/* Middle card */}
      <div className="absolute inset-x-3 top-3 h-6 rounded-t-lg border border-border/60 bg-muted/80 dark:bg-muted/50" />
      {/* Front card */}
      <div className="absolute inset-x-0 top-6 flex h-16 items-center gap-3 rounded-lg border border-border bg-background px-4 shadow-xs">
        <div className="size-8 shrink-0 rounded bg-muted" />
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="h-2.5 w-3/4 rounded bg-muted" />
          <div className="h-2 w-1/2 rounded bg-muted/60" />
        </div>
      </div>
      {/* Fade overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-b from-background/0 via-background/60 to-background" />
    </div>
  );
}

export interface MenuSearchEmptyProps {
  query: string;
  sections: readonly MenuSection[];
  onClear: () => void;
  // A suggestion chip clears the search and jumps to that category.
  onPick: (categoryId: string) => void;
}

/** No match (c-empty-2): Clear, then the categories as suggestion chips. */
export function MenuSearchEmpty({ query, sections, onClear, onPick }: MenuSearchEmptyProps) {
  return (
    <Empty className="rounded-3xl bg-muted/50 py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>{words.storefrontShell.menu.noMatchTitle(query)}</EmptyTitle>
        <EmptyDescription>{words.storefrontShell.menu.noMatchDescription}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="gap-4">
        <Button onClick={onClear} className="h-11 rounded-full px-6">
          {words.storefrontShell.menu.clear}
        </Button>
        {sections.length > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">{words.storefrontShell.menu.lookIn}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {sections.map(({ category }) => (
                <Button
                  key={category.id}
                  variant="outline"
                  className="h-11 gap-2 rounded-full bg-card px-4"
                  onClick={() => onPick(category.id)}
                >
                  <img
                    src={iconPath(category.icon)}
                    alt=""
                    width={20}
                    height={20}
                    loading="lazy"
                    className="size-5 object-contain"
                  />
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </EmptyContent>
    </Empty>
  );
}

/** Favourites filter with nothing saved: one action back to everything. */
export function MenuFavouritesEmpty({
  catalogName,
  onBrowse,
}: {
  catalogName: string;
  onBrowse: () => void;
}) {
  return (
    <Empty className="rounded-3xl bg-muted/50 py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HeartIcon />
        </EmptyMedia>
        <EmptyTitle>{words.storefrontShell.menu.noFavouritesTitle}</EmptyTitle>
        <EmptyDescription>{words.storefrontShell.menu.noFavouritesDescription}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onBrowse} className="h-11 rounded-full px-6">
          {words.storefrontShell.menu.seeAll(catalogName)}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export interface MenuCatalogEmptyProps {
  catalogName: string;
}

/**
 * Empty catalog (e.g. test-blank or cleared samples) using c-empty-15 pattern.
 */
export function MenuCatalogEmpty({ catalogName }: MenuCatalogEmptyProps) {
  return (
    <div className="flex items-center justify-center py-16">
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia>
            <StackedCardsIllustration />
          </EmptyMedia>
          <EmptyTitle>{words.storefrontShell.menu.emptyTitle(catalogName)}</EmptyTitle>
          <EmptyDescription>{words.storefrontShell.menu.emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
