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
import {
  words,
  iconPath,
  errorWords,
  type Category,
} from '@smartapp/core';
import {
  useOwnerCategories,
  useOwnerItems,
  useSaveSortOrder,
  errorCodeOf,
} from '@smartapp/data';
import { useShop } from '@/app/shop';
import { useOnlineStatus } from '@/app/use-online-status';
import { env } from '@/app/env';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/badge';
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

    setAnnouncement(`Moved ${cat.name} to position ${targetIndex + 1} of ${categories.length}`);
    saveSortOrder.mutate({ kind: 'category', ids: reordered.map((c) => c.id) });
  }

  return (
    <div className="flex flex-col min-h-full pb-16">
      <PageHeader
        title={words.screens.catalog.title(kind)}
        tabs={useCatalogTabs()}
        actions={
          <div className="flex items-center gap-2">
            {categories.length > 1 && (
              <Button
                type="button"
                variant={isReordering ? 'default' : 'outline'}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setIsReordering(!isReordering)}
              >
                {isReordering ? words.screens.catalog.doneReordering : words.screens.catalog.reorder}
              </Button>
            )}
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-9 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleOpenAdd}
            >
              <PlusIcon className="size-4 mr-1.5" />
              {words.screens.catalog.addCategory}
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4">
        {/* Screen Reader Announcement */}
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>

        {/* Offline Banner */}
        {!isOnline && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-warning-soft border border-warning/20 text-warning-text text-xs">
            <WifiOffIcon className="size-4 shrink-0" />
            <span>{words.screens.catalog.offlineNotice}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {catsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card"
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
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto space-y-4">
            <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <FolderIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-base">
                Failed to load categories
              </h3>
              <p className="text-xs text-muted-foreground">
                {errorWords(errorCodeOf(catsError))}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => void refetchCats()}
            >
              <RefreshCwIcon className="size-3.5" />
              {words.screens.catalog.tryAgain}
            </Button>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto space-y-4 border border-dashed border-border rounded-2xl p-8 bg-card/50">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <FolderIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-base">
                {words.screens.catalog.emptyCategories}
              </h3>
              <p className="text-xs text-muted-foreground">
                Organize dishes or merchandise into customer-facing sections.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
              onClick={handleOpenAdd}
            >
              <PlusIcon className="size-3.5 mr-1" />
              {words.screens.catalog.addCategory}
            </Button>
          </div>
        ) : isReordering ? (
          <Sortable
            value={categories}
            getItemValue={(cat) => cat.id}
            onValueChange={handleReorder}
          >
            <div className="space-y-2.5">
              {categories.map((cat, index) => {
                const count = itemCounts.get(cat.id) ?? 0;
                const iconSrc = `${env.VITE_STOREFRONT_URL.replace(/\/+$/, '')}${iconPath(cat.icon)}`;

                return (
                  <SortableItem key={cat.id} value={cat.id}>
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card shadow-xs transition-shadow hover:shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <SortableItemHandle
                          className="p-1.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing rounded-md hover:bg-muted/50"
                          aria-label={`Drag to reorder ${cat.name}`}
                        >
                          <GripVerticalIcon className="size-4" />
                        </SortableItemHandle>

                        <div className="size-10 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-center shrink-0 p-1.5">
                          <img
                            src={iconSrc}
                            alt=""
                            className="size-6 object-contain pointer-events-none"
                            loading="lazy"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {cat.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {words.screens.catalog.itemCount(count)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          disabled={index === 0}
                          aria-label={`Move ${cat.name} up`}
                          onClick={() => handleMove(cat, -1)}
                        >
                          <ChevronUpIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          disabled={index === categories.length - 1}
                          aria-label={`Move ${cat.name} down`}
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
            {categories.map((cat, index) => {
              const count = itemCounts.get(cat.id) ?? 0;
              const iconSrc = `${env.VITE_STOREFRONT_URL.replace(/\/+$/, '')}${iconPath(cat.icon)}`;

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
                    'group flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card shadow-xs',
                    'transition-all duration-180 hover:border-primary/40 hover:shadow-sm cursor-pointer select-none text-left',
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-10 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center shrink-0 p-1.5 transition-transform group-hover:scale-105">
                      <img
                        src={iconSrc}
                        alt=""
                        className="size-6 object-contain pointer-events-none"
                        loading="lazy"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {cat.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {words.screens.catalog.itemCount(count)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-mono">
                      #{index + 1}
                    </Badge>
                    <ChevronRightIcon className="size-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CategorySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        category={selectedCat}
      />

      <DevScenarioPanel />
    </div>
  );
}
