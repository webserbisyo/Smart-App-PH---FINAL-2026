import { useNavigate } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { useShop } from '@/app/shop';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { Button } from '@smartapp/ui/components/button';
import { useCatalogTabs } from '../tabs.js';
import { ItemsList } from '../items-list.js';
import { DevScenarioPanel } from '../dev-scenario-panel.js';

export function CatalogItemsScreen() {
  const { kind } = useShop();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-col pb-16">
      <PageHeader
        title={words.screens.catalog.title(kind)}
        tabs={useCatalogTabs()}
        actions={
          <Button
            type="button"
            variant="default"
            size="sm"
            className="hidden h-9 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90 sm:inline-flex"
            onClick={() => navigate({ to: '/catalog/new' })}
          >
            <PlusIcon className="mr-1.5 size-4" />
            {words.screens.catalog.addItem(kind)}
          </Button>
        }
      />
      <div className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
        <ItemsList />
      </div>
      <DevScenarioPanel />
    </div>
  );
}
