import * as React from 'react';
import {
  CheckIcon,
  GiftIcon,
  HouseIcon,
  InfoIcon,
  PackageIcon,
  UserRoundIcon,
  UtensilsIcon,
} from 'lucide-react';
import { editorWords, type PreviewPage, type ShopKind, vocab } from '@smartapp/core';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@smartapp/ui/components/item';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';

const W = editorWords.pages;

interface PageEntry {
  page: PreviewPage;
  name: string;
  note: string;
  icon: React.ReactNode;
}

/** The pages the preview can show (T78); Rewards only while the stamp card is on. */
export function previewPages(kind: ShopKind, stampsOn: boolean): PageEntry[] {
  const catalog = vocab(kind);
  const catalogIcon = catalog.catalogIcon === 'utensils' ? <UtensilsIcon /> : <PackageIcon />;
  return [
    { page: 'home', name: W.home, note: W.homeNote, icon: <HouseIcon /> },
    {
      page: 'menu',
      name: catalog.catalog,
      note: W.menuNote(catalog.catalog),
      icon: catalogIcon,
    },
    ...(stampsOn
      ? [{ page: 'rewards' as const, name: W.rewards, note: W.rewardsNote, icon: <GiftIcon /> }]
      : []),
    { page: 'account', name: W.account, note: W.accountNote, icon: <UserRoundIcon /> },
    { page: 'about', name: W.about, note: W.aboutNote, icon: <InfoIcon /> },
  ];
}

/** Phones: one row per page in the docked sheet, the shown page ticked. */
export function PagesList({
  pages,
  page,
  onPage,
}: {
  pages: readonly PageEntry[];
  page: PreviewPage;
  onPage: (page: PreviewPage) => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-semibold">{W.title}</h2>
      <ul className="flex flex-col gap-1">
        {pages.map((entry) => {
          const current = entry.page === page;
          return (
            <li key={entry.page}>
              <Item
                variant={current ? 'muted' : 'default'}
                className="min-h-14"
                render={
                  <button
                    type="button"
                    aria-current={current ? 'page' : undefined}
                    onClick={() => onPage(entry.page)}
                  />
                }
              >
                <ItemMedia variant="icon" className="size-10 rounded-xl bg-muted text-foreground">
                  {entry.icon}
                </ItemMedia>
                <ItemContent className="text-left">
                  <ItemTitle>{entry.name}</ItemTitle>
                  <ItemDescription>{entry.note}</ItemDescription>
                </ItemContent>
                {current ? (
                  <CheckIcon aria-hidden className="size-5 shrink-0 text-primary" />
                ) : null}
              </Item>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Tablets and computers: a row of page buttons over the preview. */
export function PagesToggle({
  pages,
  page,
  onPage,
}: {
  pages: readonly PageEntry[];
  page: PreviewPage;
  onPage: (page: PreviewPage) => void;
}) {
  return (
    <ToggleGroup
      aria-label={W.label}
      value={[page]}
      onValueChange={(value) => {
        const next = pages.find((entry) => entry.page === value[0]);
        if (next) onPage(next.page);
      }}
      className="shrink-0 rounded-xl border border-border/80 bg-card p-0.5 shadow-xs"
    >
      {pages.map((entry) => (
        <ToggleGroupItem
          key={entry.page}
          value={entry.page}
          aria-label={entry.name}
          className="h-9 rounded-lg px-3 text-sm font-medium text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
        >
          {entry.icon}
          <span className="hidden xl:inline">{entry.name}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
