import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  PlusIcon,
  SearchIcon,
  XIcon,
  ArrowUpDownIcon,
  RefreshCwIcon,
  WifiOffIcon,
  SparklesIcon,
} from 'lucide-react';
import { catalogWords, errorWords, type OwnerItem, type Category } from '@smartapp/core';
import {
  useOwnerItems,
  useOwnerCategories,
  useOwnerOptionGroups,
  useSaveSortOrder,
  useAdapters,
  errorCodeOf,
} from '@smartapp/data';
import { useShop } from '@/app/shop';
import { useOnlineStatus } from '@/app/use-online-status';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Badge } from '@smartapp/ui/components/badge';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Stat, StatLabel, StatValue } from '@smartapp/ui/components/stat';
import { Sortable, SortableItem } from '@smartapp/ui/components/reui/sortable';
import { ItemRow } from './item-row.js';
import { cn } from 'cn';

type FilterTab = 'all' | 'sold_out' | 'hidden';

const FALLBACK_GENERAL_CATEGORY: Category = {
  id: 'uncategorized',
  name: 'General',
  sort: 0,
  icon: 'burger',
};

const FALLBACK_OTHER_CATEGORY: Category = {
  id: 'other',
  name: 'Other',
  sort: 999,
  icon: 'other',
};

export function ItemsList() {
  const navigate = useNavigate();
  const { kind, slug } = useShop();
  const isOnline = useOnlineStatus();
  const { ownerSamples } = useAdapters();

  const {
    data: items,
    isLoading: itemsLoading,
    error: itemsError,
    refetch: refetchItems,
  } = useOwnerItems();

  const {
    data: categories,
    isLoading: catsLoading,
    error: catsError,
    refetch: refetchCats,
  } = useOwnerCategories();

  const { data: optionGroups = [] } = useOwnerOptionGroups();
  const saveSortOrder = useSaveSortOrder();

  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<FilterTab>('all');
  const [isReordering, setIsReordering] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState('');

  const nonArchivedItems = React.useMemo(() => {
    return (items ?? []).filter((item) => item.status !== 'archived');
  }, [items]);

  // Statistics
  const totalCount = nonArchivedItems.length;
  const soldOutCount = React.useMemo(() => {
    return nonArchivedItems.filter((item) =>
      item.variants.every((v) => v.availability === 'sold_out'),
    ).length;
  }, [nonArchivedItems]);

  const hiddenCount = React.useMemo(() => {
    return nonArchivedItems.filter((item) => item.status === 'hidden').length;
  }, [nonArchivedItems]);

  // Filtered items
  const filteredItems = React.useMemo(() => {
    return nonArchivedItems.filter((item) => {
      // Filter tab
      if (filter === 'sold_out') {
        const itemSoldOut = item.variants.every((v) => v.availability === 'sold_out');
        if (!itemSoldOut) return false;
      } else if (filter === 'hidden') {
        if (item.status !== 'hidden') return false;
      }

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [nonArchivedItems, filter, search]);

  // Grouped by Category in order
  const groupedSections = React.useMemo(() => {
    if (!categories || categories.length === 0) {
      if (filteredItems.length === 0) return [];
      return [
        {
          category: FALLBACK_GENERAL_CATEGORY,
          items: filteredItems,
        },
      ];
    }

    const sections: { category: Category; items: OwnerItem[] }[] = [];
    const catMap = new Map<string, OwnerItem[]>();

    for (const item of filteredItems) {
      const list = catMap.get(item.categoryId) ?? [];
      list.push(item);
      catMap.set(item.categoryId, list);
    }

    for (const cat of categories) {
      const catItems = catMap.get(cat.id);
      if (catItems && catItems.length > 0) {
        sections.push({
          category: cat,
          items: catItems,
        });
      }
    }

    // Catch items with non-matching categoryId
    const listedIds = new Set(categories.map((c) => c.id));
    const orphans = filteredItems.filter((i) => !listedIds.has(i.categoryId));
    if (orphans.length > 0) {
      sections.push({
        category: FALLBACK_OTHER_CATEGORY,
        items: orphans,
      });
    }

    return sections;
  }, [categories, filteredItems]);

  const handleReorder = (newItems: OwnerItem[]) => {
    const ids = newItems.map((item) => item.id);
    saveSortOrder.mutate({ kind: 'item', ids });
  };

  const handleMove = (item: OwnerItem, direction: -1 | 1) => {
    const currentIndex = nonArchivedItems.findIndex((i) => i.id === item.id);
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= nonArchivedItems.length) return;

    const reordered = [...nonArchivedItems];
    const [moved] = reordered.splice(currentIndex, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    setAnnouncement(
      `Moved ${item.name} to position ${targetIndex + 1} of ${nonArchivedItems.length}`,
    );
    saveSortOrder.mutate({ kind: 'item', ids: reordered.map((i) => i.id) });
  };

  const handleStartWithSamples = async () => {
    try {
      await ownerSamples.applySamplePack({
        slug,
        packSlug: kind === 'food' ? 'burger-joint' : 'clothing-boutique',
      });
      await refetchItems();
      await refetchCats();
    } catch {
      // Ignored
    }
  };

  const isLoading = itemsLoading || catsLoading;
  const error = itemsError || catsError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-72 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3.5 rounded-2xl border bg-card p-3.5">
              <Skeleton className="size-14 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-4 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <RefreshCwIcon className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Failed to load catalog</h3>
          <p className="text-xs text-muted-foreground">{errorWords(errorCodeOf(error))}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => {
            void refetchItems();
            void refetchCats();
          }}
        >
          <RefreshCwIcon className="size-3.5" />
          {catalogWords.tryAgain}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Screen Reader Announcement for Drag */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="flex items-center gap-2.5 rounded-xl border border-warning/20 bg-warning-soft p-3 text-xs text-warning-text">
          <WifiOffIcon className="size-4 shrink-0" />
          <span>{catalogWords.offlineNotice}</span>
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className="cursor-pointer text-left transition-opacity active:opacity-90"
        >
          <Stat
            className={cn(
              'rounded-2xl border p-3.5 shadow-xs transition-colors',
              filter === 'all'
                ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                : 'border-border/80 bg-card hover:bg-muted/40',
            )}
          >
            <StatLabel>{catalogWords.statTotalItems(kind)}</StatLabel>
            <StatValue className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {totalCount}
            </StatValue>
          </Stat>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'sold_out' ? 'all' : 'sold_out')}
          className="cursor-pointer text-left transition-opacity active:opacity-90"
        >
          <Stat
            className={cn(
              'rounded-2xl border p-3.5 shadow-xs transition-colors',
              filter === 'sold_out'
                ? 'border-warning/50 bg-warning-soft ring-1 ring-warning/30'
                : 'border-border/80 bg-card hover:bg-muted/40',
            )}
          >
            <StatLabel>{catalogWords.statSoldOut}</StatLabel>
            <StatValue className="font-mono text-2xl font-bold tracking-tight text-warning-text">
              {soldOutCount}
            </StatValue>
          </Stat>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'hidden' ? 'all' : 'hidden')}
          className="cursor-pointer text-left transition-opacity active:opacity-90"
        >
          <Stat
            className={cn(
              'rounded-2xl border p-3.5 shadow-xs transition-colors',
              filter === 'hidden'
                ? 'border-primary/50 bg-muted ring-1 ring-primary/20'
                : 'border-border/80 bg-card hover:bg-muted/40',
            )}
          >
            <StatLabel>{catalogWords.statHidden}</StatLabel>
            <StatValue className="font-mono text-2xl font-bold tracking-tight text-muted-foreground">
              {hiddenCount}
            </StatValue>
          </Stat>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        {/* Search Input with Clear Button */}
        <div className="relative max-w-md flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            placeholder={catalogWords.searchPlaceholder(kind)}
            className="h-10 rounded-xl border-border/80 bg-card pr-9 pl-9 text-sm"
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              aria-label={catalogWords.clearSearch}
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
                filter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {catalogWords.filterAll}
              <span className="ml-1.5 font-mono text-xs opacity-80">{totalCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('sold_out')}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
                filter === 'sold_out'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {catalogWords.filterSoldOut}
              <span className="ml-1.5 font-mono text-xs opacity-80">{soldOutCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('hidden')}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
                filter === 'hidden'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {catalogWords.filterHidden}
              <span className="ml-1.5 font-mono text-xs opacity-80">{hiddenCount}</span>
            </button>
          </div>

          {/* Reorder Mode Button */}
          {nonArchivedItems.length > 1 && (
            <Button
              type="button"
              variant={isReordering ? 'default' : 'outline'}
              size="sm"
              className="h-8 shrink-0 text-xs"
              onClick={() => setIsReordering(!isReordering)}
            >
              <ArrowUpDownIcon className="mr-1.5 size-3.5" />
              {isReordering ? catalogWords.doneReordering : catalogWords.reorder}
            </Button>
          )}

          {/* Desktop Add Item Button */}
          <Button
            type="button"
            size="sm"
            className="hidden h-8 shrink-0 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 sm:inline-flex"
            onClick={() => navigate({ to: '/catalog/new' })}
          >
            <PlusIcon className="mr-1.5 size-3.5" />
            {catalogWords.addItem(kind)}
          </Button>
        </div>
      </div>

      {/* Main List Content */}
      {nonArchivedItems.length === 0 ? (
        <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-4 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SparklesIcon className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              {catalogWords.emptyItems(kind)}
            </h3>
            <p className="text-xs text-muted-foreground">
              Add your first item or populate with standard samples.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              className="bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate({ to: '/catalog/new' })}
            >
              <PlusIcon className="mr-1 size-3.5" />
              {catalogWords.addItem(kind)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleStartWithSamples}
            >
              {catalogWords.startWithSamples}
            </Button>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-3 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            {search ? catalogWords.noSearchResults(search) : 'No items match this filter.'}
          </p>
          {search && (
            <Button variant="outline" size="sm" onClick={() => setSearch('')}>
              {catalogWords.clearSearch}
            </Button>
          )}
        </div>
      ) : isReordering ? (
        /* Reorder Mode with Sortable */
        <Sortable
          value={nonArchivedItems}
          getItemValue={(item) => item.id}
          onValueChange={handleReorder}
        >
          <div className="space-y-2">
            {nonArchivedItems.map((item, index) => (
              <SortableItem key={item.id} value={item.id}>
                <ItemRow
                  item={item}
                  optionGroups={optionGroups}
                  isReordering
                  canMoveUp={index > 0}
                  canMoveDown={index < nonArchivedItems.length - 1}
                  onMoveUp={() => handleMove(item, -1)}
                  onMoveDown={() => handleMove(item, 1)}
                  dragHandleProps={{ className: 'cursor-grab' }}
                />
              </SortableItem>
            ))}
          </div>
        </Sortable>
      ) : (
        /* Grouped Category Sections */
        <div className="space-y-8">
          {groupedSections.map(({ category, items }) => (
            <div key={category.id} className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-foreground">
                    {category.name}
                  </h2>
                  <Badge variant="secondary" className="px-1.5 py-0 font-mono text-xs">
                    {catalogWords.itemCount(items.length)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2.5">
                {items.map((item) => (
                  <ItemRow key={item.id} item={item} optionGroups={optionGroups} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky Mobile Add Item Button */}
      <div className="fixed right-0 bottom-16 left-0 z-30 border-t border-border/40 bg-background/80 p-3 backdrop-blur-md sm:hidden">
        <Button
          type="button"
          className="h-11 w-full bg-primary text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
          onClick={() => navigate({ to: '/catalog/new' })}
        >
          <PlusIcon className="mr-1.5 size-4" />
          {catalogWords.addItem(kind)}
        </Button>
      </div>
    </div>
  );
}
