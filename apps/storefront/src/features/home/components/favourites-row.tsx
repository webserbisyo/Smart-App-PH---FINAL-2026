'use client';

import { words, type Catalog } from '@smartapp/core';
import { useFavourites } from '@smartapp/data';
import { ClientOnly } from '@smartapp/ui/components/client-only';
import { ProductRow } from './best-sellers-row';

export interface FavouritesRowProps {
  slug: string;
  catalog: Catalog;
}

// Saved items live on this phone only, so the row waits for the client and hides when empty.
function FavouritesRowContent({ slug, catalog }: FavouritesRowProps) {
  const favourites = useFavourites(slug);
  const items = catalog.items.filter((item) => item.status === 'active' && favourites.has(item.id));
  return (
    <ProductRow
      slug={slug}
      title={words.storefrontShell.home.favourites}
      items={items}
      catalog={catalog}
    />
  );
}

export function FavouritesRow(props: FavouritesRowProps) {
  return (
    <ClientOnly fallback={null}>
      <FavouritesRowContent {...props} />
    </ClientOnly>
  );
}
