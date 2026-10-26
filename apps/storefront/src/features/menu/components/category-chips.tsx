'use client';

import { useCallback, useRef } from 'react';
import { HeartIcon } from 'lucide-react';
import { iconPath, words, type MenuSection } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Scroller } from '@smartapp/ui/components/scroller';
import { Toggle } from '@smartapp/ui/components/toggle';
import { Scrollspy } from '@smartapp/ui/components/reui/scrollspy';
import { cn } from '@smartapp/ui/lib/utils';
import { keepInView, sectionId, type MenuSpy } from './menu-spy';

export interface CategoryChipsProps {
  sections: readonly MenuSection[];
  // Browse: the chips follow the page (ReUI Scrollspy). Favourites: a chip leaves favourites first.
  spy: MenuSpy | null;
  onJump: (categoryId: string) => void;
  hasFavourites: boolean;
  favActive: boolean;
  onToggleFav: () => void;
}

const CHIP =
  'h-11 shrink-0 gap-2 rounded-full px-4 text-sm font-medium data-active:border-transparent data-active:bg-shop-10 data-active:text-shop-10-foreground data-active:hover:bg-shop-10-hover';

/** Phone category chips (c-scrollspy-2): 44 px, the active one in the shop colour, kept in view. */
export function CategoryChips({
  sections,
  spy,
  onJump,
  hasFavourites,
  favActive,
  onToggleFav,
}: CategoryChipsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Scrollspy reports on every scroll; only a new section moves the row. Stable, so the spy's
  // listeners are set up once.
  const lastRef = useRef<string | null>(null);
  const onUpdate = useCallback((id: string) => {
    if (lastRef.current === id) return;
    lastRef.current = id;
    keepInView(scrollerRef.current, id, 'x');
  }, []);

  const chips = (
    <Scroller
      ref={scrollerRef}
      orientation="horizontal"
      hideScrollbar
      className="-mx-4 w-auto px-4"
    >
      <div className="flex items-center gap-2">
        {hasFavourites ? (
          <Toggle
            variant="outline"
            aria-label={words.storefrontShell.menu.filterFavourites}
            pressed={favActive}
            onPressedChange={onToggleFav}
            className="h-11 shrink-0 gap-2 rounded-full px-4 text-sm font-medium aria-pressed:border-transparent aria-pressed:bg-shop-10 aria-pressed:text-shop-10-foreground"
          >
            <HeartIcon aria-hidden="true" className={cn('size-4', favActive && 'fill-current')} />
            {words.storefrontShell.menu.favourites}
          </Toggle>
        ) : null}
        {sections.map(({ category }) => (
          <Button
            key={category.id}
            variant="outline"
            className={CHIP}
            {...(spy
              ? { 'data-scrollspy-anchor': sectionId(category.id) }
              : { onClick: () => onJump(category.id) })}
          >
            <img
              src={iconPath(category.icon)}
              alt=""
              width={20}
              height={20}
              loading="lazy"
              className="size-5 shrink-0 object-contain"
            />
            {category.name}
          </Button>
        ))}
      </div>
    </Scroller>
  );

  if (!spy) return <nav aria-label={words.storefrontShell.menu.categories}>{chips}</nav>;
  return (
    <nav aria-label={words.storefrontShell.menu.categories}>
      <Scrollspy
        key={`${spy.offset}:${spy.smooth}`}
        targetRef={spy.target}
        offset={spy.offset}
        smooth={spy.smooth}
        history={false}
        onUpdate={onUpdate}
      >
        {chips}
      </Scrollspy>
    </nav>
  );
}
