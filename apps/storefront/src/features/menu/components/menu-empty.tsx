import { artPath, iconPath, words, type MenuSection } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { EmptyState } from '@smartapp/ui/compositions/empty-state';

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
    <EmptyState
      art={artPath('search_empty')}
      title={words.storefrontShell.menu.noMatchTitle(query)}
      description={words.storefrontShell.menu.noMatchDescription}
      action={
        <Button onClick={onClear} className="h-11 rounded-full px-6">
          {words.storefrontShell.menu.clear}
        </Button>
      }
    >
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
    </EmptyState>
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
    <EmptyState
      art={artPath('favourites_empty')}
      title={words.storefrontShell.menu.noFavouritesTitle}
      description={words.storefrontShell.menu.noFavouritesDescription}
      action={
        <Button onClick={onBrowse} className="h-11 rounded-full px-6">
          {words.storefrontShell.menu.seeAll(catalogName)}
        </Button>
      }
    />
  );
}

/** A shop with nothing on its menu yet (a new shop, or the samples cleared). */
export function MenuCatalogEmpty({ catalogName }: { catalogName: string }) {
  return (
    <EmptyState
      art={artPath('placed')}
      title={words.storefrontShell.menu.emptyTitle(catalogName)}
      description={words.storefrontShell.menu.emptyDescription}
      className="mt-6"
    />
  );
}
