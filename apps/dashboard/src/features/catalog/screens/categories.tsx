import * as React from 'react';
import {
  GripVerticalIcon,
  PlusIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  RefreshCwIcon,
  WifiOffIcon,
  FolderIcon,
} from 'lucide-react';
import { catalogWords, errorWords, type Category } from '@smartapp/core';
import { useOwnerCategories, useOwnerItems, useSaveSortOrder, errorCodeOf } from '@smartapp/data';
import { useShop } from '@/app/shop';
import { useOnlineStatus } from '@/app/use-online-status';
import { env } from '@/app/env';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { Button } from '@smartapp/ui/components/button';
import { CategoryIcon } from '@smartapp/ui/compositions/category-icon';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Sortable, SortableItem, SortableItemHandle } from '@smartapp/ui/components/reui/sortable';
import { useCatalogTabs } from '../tabs.js';
import { CategorySheet } from '../category-sheet.js';
import { DevScenarioPanel } from '../dev-scenario-panel.js';
import { cn } from 'cn';

export function CatalogCategoriesScreen() {
  const { kind } = useShop();
  const isOnline = useOnlineStatus();

  const {
    data: categories = [],
    isLoading: catsLoading,
    error: catsError,
    refetch: refetchCats,
  } = useOwnerCategories();

  const { data: items = [] } = useOwnerItems();
  const saveSortOrder = useSaveSortOrder();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selectedCat, setSelectedCat] = React.useState<Category | null>(null);
  const [isReordering, setIsReordering] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState('');

  // Item counts per category
  const itemCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.status !== 'archived') {
        counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);

  function handleOpenAdd() {
    setSelectedCat(null);
    setSheetOpen(true);
  }

  function handleOpenEdit(cat: Category) {
    setSelectedCat(cat);
    setSheetOpen(true);
  }

  function handleReorder(newOrder: Category[]) {
    const ids = newOrder.map((c) => c.id);
    saveSortOrder.mutate({ kind: 'category', ids });
  }

  function handleMove(cat: Category, direction: -1 | 1) {
    const currentIndex = categories.findIndex((c) => c.id === cat.id);
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(currentIndex, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    setAnnouncement(catalogWords.movedAnnouncement(cat.name, targetIndex + 1, categories.length));
    saveSortOrder.mutate({ kind: 'category', ids: reordered.map((c) => c.id) });
  }

  return (
    <div className="flex min-h-full flex-col pb-16">
      <PageHeader
        title={catalogWords.title(kind)}
        tabs={useCatalogTabs()}
        actions={
          <div className="flex items-center gap-2">
            {categories.length > 1 && (
              <Button
                type="button"
                variant={isReordering ? 'default' : 'outline'}
                size="sm"
                className="h-11 md:h-9"
                onClick={() => setIsReordering(!isReordering)}
              >
                {isReordering ? catalogWords.doneReordering : catalogWords.reorder}
              </Button>
            )}
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-11 rounded-xl font-semibold md:h-9"
              onClick={handleOpenAdd}
            >
              <PlusIcon className="mr-1.5 size-4" />
              {catalogWords.addCategory}
            </Button>
          </div>
        }
      />

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-4 md:p-6">
        {/* Screen Reader Announcement */}
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>

        {categories.length > 0 ? (
          <p className="text-sm text-muted-foreground">{catalogWords.categoriesHint}</p>
        ) : null}

        {/* Offline Banner */}
        {!isOnline && (
          <div className="flex items-center gap-2.5 rounded-xl border border-warning/20 bg-warning-soft p-3 text-xs text-warning-text">
            <WifiOffIcon className="size-4 shrink-0" />
            <span>{catalogWords.offlineNotice}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {catsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4"
              >
                <div className="flex items-center gap-3.5">
                  <Skeleton className="size-10 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : catsError ? (
          <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-4 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <FolderIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">{catalogWords.loadFailed}</h3>
              <p className="text-xs text-muted-foreground">{errorWords(errorCodeOf(catsError))}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => void refetchCats()}
            >
              <RefreshCwIcon className="size-3.5" />
              {catalogWords.tryAgain}
            </Button>
          </div>
        ) : categories.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-border bg-card/50 p-8 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FolderIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                {catalogWords.emptyCategories}
              </h3>
              <p className="text-xs text-muted-foreground">{catalogWords.categoriesHint}</p>
            </div>
            <Button
              size="sm"
              className="bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={handleOpenAdd}
            >
              <PlusIcon className="mr-1 size-3.5" />
              {catalogWords.addCategory}
            </Button>
          </div>
        ) : isReordering ? (
          <Sortable value={categories} getItemValue={(cat) => cat.id} onValueChange={handleReorder}>
            <div className="space-y-2.5">
              {categories.map((cat, index) => {
                const count = itemCounts.get(cat.id) ?? 0;

                return (
                  <SortableItem key={cat.id} value={cat.id}>
                    <div className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-xs transition-shadow hover:shadow-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <SortableItemHandle
                          className="cursor-grab rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground active:cursor-grabbing"
                          aria-label={catalogWords.reorder}
                        >
                          <GripVerticalIcon className="size-4" />
                        </SortableItemHandle>

                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30 p-1.5">
                          <CategoryIcon
                            icon={cat.icon}
                            size={24}
                            assetOrigin={env.VITE_STOREFRONT_URL}
                            className="pointer-events-none size-6 object-contain"
                            textClassName="text-xl leading-none"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {cat.name}
                          </p>
                          <p className="text-sm text-muted-foreground tabular">
                            {catalogWords.itemCount(count)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 text-muted-foreground hover:text-foreground md:size-9"
                          disabled={index === 0}
                          aria-label={catalogWords.moveUp}
                          onClick={() => handleMove(cat, -1)}
                        >
                          <ChevronUpIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 text-muted-foreground hover:text-foreground md:size-9"
                          disabled={index === categories.length - 1}
                          aria-label={catalogWords.moveDown}
                          onClick={() => handleMove(cat, 1)}
                        >
                          <ChevronDownIcon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </SortableItem>
                );
              })}
            </div>
          </Sortable>
        ) : (
          <div className="space-y-2.5">
            {categories.map((cat) => {
              const count = itemCounts.get(cat.id) ?? 0;

              return (
                <div
                  key={cat.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenEdit(cat)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenEdit(cat);
                    }
                  }}
                  className={cn(
                    'group flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-xs',
                    'cursor-pointer text-left transition-all duration-180 select-none hover:border-primary/40 hover:shadow-sm',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 p-1.5 transition-transform group-hover:scale-105">
                      <CategoryIcon
                        icon={cat.icon}
                        size={24}
                        assetOrigin={env.VITE_STOREFRONT_URL}
                        className="pointer-events-none size-6 object-contain"
                        textClassName="text-xl leading-none"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                        {cat.name}
                      </p>
                      <p className="text-sm text-muted-foreground tabular">
                        {catalogWords.itemCount(count)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CategorySheet open={sheetOpen} onOpenChange={setSheetOpen} category={selectedCat} />

      <DevScenarioPanel />
    </div>
  );
}
