import * as React from 'react';
import {
  ArrowUpDownIcon,
  GripVerticalIcon,
  PlusIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  WifiOffIcon,
  FolderIcon,
} from 'lucide-react';
import {
  CATEGORY_ICON_STYLES,
  catalogWords,
  errorWords,
  type Category,
  type CategoryIconStyle,
} from '@smartapp/core';
import {
  useOwnerCategories,
  useOwnerItems,
  useSaveCategory,
  useSaveSortOrder,
  errorCodeOf,
} from '@smartapp/data';
import { useShop } from '@/app/shop';
import { useOnlineStatus } from '@/app/use-online-status';
import { env } from '@/app/env';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { Button } from '@smartapp/ui/components/button';
import { CategoryIcon } from '@smartapp/ui/compositions/category-icon';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Sortable, SortableItem, SortableItemHandle } from '@smartapp/ui/components/reui/sortable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@smartapp/ui/components/select';
import { notify } from '@smartapp/ui/compositions/notify';
import { Notice } from '@/app/notice';
import { PageEmpty, PageError } from '@/app/page-state';

import { FloatingAddButton } from '../floating-add-button.js';
import { shopIconStyle } from '../icon-style.js';
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
  const saveCategory = useSaveCategory();
  const iconStyle = shopIconStyle(categories);
  const styleLabel: Record<CategoryIconStyle, string> = {
    flat: catalogWords.styleFlat,
    color: catalogWords.styleColor,
    '3d': catalogWords.style3d,
  };

  // One icon style for the whole shop (decision T42): changing it restyles every category icon.
  async function handleStyleChange(style: CategoryIconStyle) {
    try {
      await Promise.all(
        categories.flatMap((cat) =>
          cat.icon && typeof cat.icon === 'object' && cat.icon.kind === 'fluent'
            ? [
                saveCategory.mutateAsync({
                  id: cat.id,
                  name: cat.name,
                  icon: { ...cat.icon, style },
                }),
              ]
            : [],
        ),
      );
      notify({ title: catalogWords.iconStyleSaved, tone: 'success' });
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  }

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

  // Moves show at once; only a failed save speaks up, then the list reloads the saved order.
  function reorderFailed() {
    notify({ title: catalogWords.reorderFailed, tone: 'error' });
    void refetchCats();
  }

  function handleReorder(newOrder: Category[]) {
    const ids = newOrder.map((c) => c.id);
    saveSortOrder.mutate({ kind: 'category', ids }, { onError: reorderFailed });
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
    saveSortOrder.mutate(
      { kind: 'category', ids: reordered.map((c) => c.id) },
      { onError: reorderFailed },
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title={catalogWords.title(kind)} tabs={useCatalogTabs()} />

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-4 pb-40 md:p-6 md:pb-16">
        {/* Screen Reader Announcement */}
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>

        {categories.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 basis-60 text-sm text-muted-foreground">
                {catalogWords.categoriesHint}
              </p>
              {categories.length > 1 ? (
                <Button
                  type="button"
                  variant={isReordering ? 'default' : 'outline'}
                  className="h-11 gap-1.5 md:h-9"
                  onClick={() => setIsReordering(!isReordering)}
                >
                  <ArrowUpDownIcon className="size-4" />
                  {isReordering ? catalogWords.doneReordering : catalogWords.reorder}
                </Button>
              ) : null}
              <Button
                type="button"
                className="hidden h-9 gap-1.5 font-semibold md:inline-flex"
                onClick={handleOpenAdd}
              >
                <PlusIcon className="size-4" />
                {catalogWords.addCategory}
              </Button>
            </div>
            {!isReordering ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {catalogWords.iconStyleLabel}
                  </p>
                  <p className="text-sm text-muted-foreground">{catalogWords.iconStyleHelp}</p>
                </div>
                <Select
                  value={iconStyle}
                  onValueChange={(value) => {
                    const next = CATEGORY_ICON_STYLES.find((st) => st === value);
                    if (next && next !== iconStyle) void handleStyleChange(next);
                  }}
                >
                  <SelectTrigger
                    aria-label={catalogWords.iconStyleLabel}
                    className="w-28 shrink-0 bg-card data-size-default:h-11 md:data-size-default:h-9"
                  >
                    <SelectValue>
                      {(value: unknown) =>
                        CATEGORY_ICON_STYLES.find((st) => st === value)
                          ? styleLabel[iconStyle]
                          : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_ICON_STYLES.map((st) => (
                      <SelectItem key={st} value={st} className="min-h-11 md:min-h-8">
                        {styleLabel[st]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Offline Banner */}
        {!isOnline && (
          <Notice tone="warning" icon={<WifiOffIcon />}>
            {catalogWords.offlineNotice}
          </Notice>
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
          <PageError
            title={catalogWords.loadFailed}
            message={errorWords(errorCodeOf(catsError))}
            retryLabel={catalogWords.tryAgain}
            onRetry={() => void refetchCats()}
          />
        ) : categories.length === 0 ? (
          <PageEmpty
            variant="box"
            icon={<FolderIcon />}
            title={catalogWords.emptyCategories}
            description={catalogWords.categoriesHint}
            action={
              <Button className="h-11 gap-1.5 font-semibold md:h-9" onClick={handleOpenAdd}>
                <PlusIcon className="size-4" />
                {catalogWords.addCategory}
              </Button>
            }
          />
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
                          className="flex size-11 cursor-grab items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground active:cursor-grabbing md:size-9"
                          aria-label={catalogWords.reorder}
                        >
                          <GripVerticalIcon className="size-5" />
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

      {categories.length > 0 && !isReordering ? (
        <FloatingAddButton label={catalogWords.addCategory} onClick={handleOpenAdd} />
      ) : null}

      <DevScenarioPanel />
    </div>
  );
}
