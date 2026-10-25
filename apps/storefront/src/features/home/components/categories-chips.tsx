import Link from 'next/link';
import { iconPath, words, type Category } from '@smartapp/core';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import { Scroller } from '@smartapp/ui/components/scroller';

export interface CategoriesChipsProps {
  slug: string;
  categories: readonly Category[];
}

// Round icon tiles with labels (c-icon-tile frame); a tap jumps to that category on the menu.
export function CategoriesChips({ slug, categories }: CategoriesChipsProps) {
  if (categories.length === 0) return null;
  const sorted = [...categories].sort((a, b) => a.sort - b.sort);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold tracking-tight">
        {words.storefrontShell.home.categories}
      </h2>
      <Scroller orientation="horizontal" hideScrollbar className="-mx-4 w-auto px-4">
        <ul className="flex gap-3 pb-1">
          {sorted.map((cat) => (
            <li key={cat.id} className="shrink-0">
              <Link
                href={`/${slug}/menu?cat=${cat.id}`}
                className="flex w-20 pressable flex-col items-center gap-2 rounded-xl py-1 text-center text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <IconTile variant="frame" size="xl" radius="full">
                  <img
                    src={iconPath(cat.icon)}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    className="size-8 object-contain"
                  />
                </IconTile>
                <span className="line-clamp-2 w-full break-words">{cat.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Scroller>
    </section>
  );
}
