import Link from 'next/link';
import { SearchIcon } from 'lucide-react';
import { vocab, words, type ShopKind } from '@smartapp/core';

// "Search the menu": opens the menu with its search box (#search).
export function SearchPill({ slug, kind }: { slug: string; kind: ShopKind }) {
  return (
    <Link
      href={`/${slug}/menu#search`}
      className="flex h-12 items-center gap-3 rounded-full border bg-card px-4 text-base text-muted-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <SearchIcon aria-hidden="true" className="size-5 shrink-0" />
      {words.storefrontShell.home.searchMenu(vocab(kind).catalog)}
    </Link>
  );
}
