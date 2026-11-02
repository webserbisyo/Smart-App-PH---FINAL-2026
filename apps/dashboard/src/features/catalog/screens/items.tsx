import { catalogWords } from '@smartapp/core';
import { useShop } from '@/app/shop';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { useCatalogTabs } from '../tabs.js';
import { ItemsList } from '../items-list.js';
import { DevScenarioPanel } from '../dev-scenario-panel.js';

// The Add button lives in the list's toolbar (desktop) and floats above the dock (phone), so the
// header holds only the tabs.
export function CatalogItemsScreen() {
  const { kind } = useShop();

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title={catalogWords.title(kind)} tabs={useCatalogTabs()} />
      <div className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
        <ItemsList />
      </div>
      <DevScenarioPanel />
    </div>
  );
}
