import { ListPlusIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';
import { useShop } from '@/app/shop';
import { useCatalogTabs } from '../tabs.js';

export function CatalogAddOnsScreen() {
  const { kind } = useShop();
  return (
    <EmptyPage
      title={words.screens.catalog.title(kind)}
      tabs={useCatalogTabs()}
      icon={<ListPlusIcon />}
      line={words.screens.catalog.emptyAddOns}
    />
  );
}
