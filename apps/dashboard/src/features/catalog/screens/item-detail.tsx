import { vocab, words } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';
import { CATALOG_ICONS } from '@/app/nav';
import { useShop } from '@/app/shop';

export function CatalogItemScreen() {
  const { kind } = useShop();
  const Icon = CATALOG_ICONS[vocab(kind).catalogIcon];
  return (
    <EmptyPage
      title={words.screens.catalog.itemTitle(kind)}
      icon={<Icon />}
      line={words.screens.catalog.itemEmpty}
    />
  );
}
