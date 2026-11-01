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
    <div className="flex flex-col min-h-full pb-16">
      <PageHeader
        title={words.screens.catalog.title(kind)}
        tabs={useCatalogTabs()}
        actions={
          <Button
            type="button"
            variant="default"
            size="sm"
            className="hidden sm:inline-flex h-9 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate({ to: '/catalog/new' })}
          >
            <PlusIcon className="size-4 mr-1.5" />
            {words.screens.catalog.addItem(kind)}
          </Button>
        }
      />
      <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        <ItemsList />
      </div>
      <DevScenarioPanel />
    </div>
  );
}
