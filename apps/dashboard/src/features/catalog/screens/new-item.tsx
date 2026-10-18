import { PlusIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';
import { useShop } from '@/app/shop';

export function NewCatalogItemScreen() {
  const { kind } = useShop();
  return (
    <EmptyPage
      title={words.screens.catalog.newTitle(kind)}
      icon={<PlusIcon />}
      line={words.screens.catalog.newEmpty}
    />
  );
}
