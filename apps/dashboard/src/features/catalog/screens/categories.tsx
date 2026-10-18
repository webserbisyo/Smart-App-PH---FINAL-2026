import { FolderIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';
import { useShop } from '@/app/shop';
import { useCatalogTabs } from '../tabs.js';

export function CatalogCategoriesScreen() {
  const { kind } = useShop();
  return (
    <EmptyPage
      title={words.screens.catalog.title(kind)}
      tabs={useCatalogTabs()}
      icon={<FolderIcon />}
      line={words.screens.catalog.emptyCategories}
    />
  );
}
