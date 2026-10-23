import { words, vocab } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';
import { CATALOG_ICONS } from '@/app/nav';
import { useShop } from '@/app/shop';
import { useCatalogTabs } from '../tabs.js';

export function CatalogItemsScreen() {
  const { kind } = useShop();
  const Icon = CATALOG_ICONS[vocab(kind).catalogIcon];
  return (
    <EmptyPage
      title={words.screens.catalog.title(kind)}
      tabs={useCatalogTabs()}
      icon={<Icon />}
      line={words.screens.catalog.emptyItems(kind)}
    />
  );
}
