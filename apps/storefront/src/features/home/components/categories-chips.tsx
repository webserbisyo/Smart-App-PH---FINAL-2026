import Link from 'next/link';
import { iconPath, words, type Category } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Scroller } from '@smartapp/ui/components/scroller';

export interface CategoriesChipsProps {
  slug: string;
  categories: readonly Category[];
}

export function CategoriesChips({ slug, categories }: CategoriesChipsProps) {
  if (categories.length === 0) return null;

  const sorted = [...categories].sort((a, b) => a.sort - b.sort);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold tracking-tight">
        {words.storefrontShell.home.categories}
      </h2>
      <Scroller orientation="horizontal" hideScrollbar className="w-full">
        <div className="flex gap-2 pb-1">
          {sorted.map((cat) => (
            <Button
              key={cat.id}
              render={<Link href={`/${slug}/menu?cat=${cat.id}`} />}
              nativeButton={false}
              variant="outline"
              className="h-11 shrink-0 rounded-full px-4 text-sm font-medium"
            >
              <img
                src={iconPath(cat.icon)}
                alt=""
                width={32}
                height={32}
                loading="lazy"
                className="size-6 shrink-0 object-contain"
              />
              <span>{cat.name}</span>
            </Button>
          ))}
        </div>
      </Scroller>
    </section>
  );
}
