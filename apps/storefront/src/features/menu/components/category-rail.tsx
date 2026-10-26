'use client';

import { useCallback, useRef } from 'react';
import { iconPath, words, type MenuSection } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Toggle } from '@smartapp/ui/components/toggle';
import { Scrollspy } from '@smartapp/ui/components/reui/scrollspy';
import { cn } from '@smartapp/ui/lib/utils';
import type { MenuPick } from './menu-picks';
import { keepInView, sectionId, type MenuSpy } from './menu-spy';

export interface CategoryRailProps {
  sections: readonly MenuSection[];
  spy: MenuSpy | null;
  onJump: (categoryId: string) => void;
  // Favourites, Best sellers and New, shown when they have something in them.
  picks: readonly MenuPick[];
}

const ROW =
  'h-11 w-full justify-start gap-3 rounded-xl px-3 text-sm font-medium data-active:bg-shop-10-soft data-active:font-semibold data-active:text-shop-10-soft-foreground data-active:hover:bg-shop-10-soft';

/** Desktop category box (c-scrollspy-1) from 1024 px: icons and counts, follows the page. */
export function CategoryRail({ sections, spy, onJump, picks }: CategoryRailProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<string | null>(null);
  const onUpdate = useCallback((id: string) => {
    if (lastRef.current === id) return;
    lastRef.current = id;
    keepInView(listRef.current, id, 'y');
  }, []);

  const rows = (
    <div ref={listRef} className="scrollbar-none flex max-h-vh-60 flex-col gap-0.5 overflow-y-auto">
      {sections.map(({ category, items }) => (
        <Button
          key={category.id}
          variant="ghost"
          className={ROW}
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
          <span className="min-w-0 truncate">{category.name}</span>
          <span className="ml-auto text-xs font-normal text-muted-foreground tabular">
            {items.length}
          </span>
        </Button>
      ))}
    </div>
  );

  return (
    <aside
      aria-label={words.storefrontShell.menu.categories}
      className="sticky sticky-top-37 hidden w-60 shrink-0 self-start lg:block"
    >
      <nav className="flex flex-col gap-1 rounded-2xl border bg-card p-2 shadow-xs">
        <p className="px-3 pt-1 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {words.storefrontShell.menu.categories}
        </p>
        {picks.map((pick) => {
          const Icon = pick.icon;
          return (
            <Toggle
              key={pick.id}
              aria-label={pick.toggleLabel}
              pressed={pick.pressed}
              onPressedChange={pick.onToggle}
              className="h-11 w-full justify-start gap-3 rounded-xl px-3 text-sm font-medium aria-pressed:bg-shop-10-soft aria-pressed:text-shop-10-soft-foreground"
            >
              <Icon
                aria-hidden="true"
                className={cn('size-5 text-shop-10-text', pick.pressed && 'fill-current')}
              />
              {pick.label}
              {pick.count !== undefined ? (
                <span className="ml-auto text-xs font-normal text-muted-foreground tabular">
                  {pick.count}
                </span>
              ) : null}
            </Toggle>
          );
        })}
        {picks.length > 0 ? <div aria-hidden="true" className="mx-3 my-1 border-t" /> : null}
        {spy ? (
          <Scrollspy
            key={`${spy.offset}:${spy.smooth}`}
            targetRef={spy.target}
            offset={spy.offset}
            smooth={spy.smooth}
            history={false}
            onUpdate={onUpdate}
          >
            {rows}
          </Scrollspy>
        ) : (
          rows
        )}
      </nav>
    </aside>
  );
}
