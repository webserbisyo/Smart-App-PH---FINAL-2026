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
import { words, errorWords, type OwnerItem, type Category } from '@smartapp/core';
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

    setAnnouncement(`Moved ${item.name} to position ${targetIndex + 1} of ${nonArchivedItems.length}`);
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
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-72 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3.5 p-3.5 rounded-2xl border bg-card">
              <Skeleton className="size-14 rounded-xl shrink-0" />
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
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto space-y-4">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <RefreshCwIcon className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground text-base">
            Failed to load catalog
          </h3>
          <p className="text-xs text-muted-foreground">
            {errorWords(errorCodeOf(error))}
          </p>
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
          {words.screens.catalog.tryAgain}
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
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-warning-soft border border-warning/20 text-warning-text text-xs">
          <WifiOffIcon className="size-4 shrink-0" />
          <span>{words.screens.catalog.offlineNotice}</span>
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className="text-left cursor-pointer transition-opacity active:opacity-90"
        >
          <Stat
            className={cn(
              'rounded-2xl border p-3.5 shadow-xs transition-colors',
              filter === 'all'
                ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                : 'border-border/80 bg-card hover:bg-muted/40',
            )}
          >
            <StatLabel>{words.screens.catalog.statTotalItems(kind)}</StatLabel>
            <StatValue className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {totalCount}
            </StatValue>
          </Stat>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'sold_out' ? 'all' : 'sold_out')}
          className="text-left cursor-pointer transition-opacity active:opacity-90"
        >
          <Stat
            className={cn(
              'rounded-2xl border p-3.5 shadow-xs transition-colors',
              filter === 'sold_out'
                ? 'border-warning/50 bg-warning-soft ring-1 ring-warning/30'
                : 'border-border/80 bg-card hover:bg-muted/40',
            )}
          >
            <StatLabel>{words.screens.catalog.statSoldOut}</StatLabel>
            <StatValue className="text-2xl font-bold font-mono tracking-tight text-warning-text">
              {soldOutCount}
            </StatValue>
          </Stat>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'hidden' ? 'all' : 'hidden')}
          className="text-left cursor-pointer transition-opacity active:opacity-90"
        >
          <Stat
            className={cn(
              'rounded-2xl border p-3.5 shadow-xs transition-colors',
              filter === 'hidden'
                ? 'border-primary/50 bg-muted ring-1 ring-primary/20'
                : 'border-border/80 bg-card hover:bg-muted/40',
            )}
          >
            <StatLabel>{words.screens.catalog.statHidden}</StatLabel>
            <StatValue className="text-2xl font-bold font-mono tracking-tight text-muted-foreground">
              {hiddenCount}
            </StatValue>
          </Stat>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input with Clear Button */}
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            placeholder={words.screens.catalog.searchPlaceholder(kind)}
            className="pl-9 pr-9 h-10 rounded-xl bg-card border-border/80 text-sm"
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              aria-label={words.screens.catalog.clearSearch}
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                filter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {words.screens.catalog.filterAll}
              <span className="ml-1.5 text-xs font-mono opacity-80">{totalCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('sold_out')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                filter === 'sold_out'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {words.screens.catalog.filterSoldOut}
              <span className="ml-1.5 text-xs font-mono opacity-80">{soldOutCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('hidden')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                filter === 'hidden'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {words.screens.catalog.filterHidden}
              <span className="ml-1.5 text-xs font-mono opacity-80">{hiddenCount}</span>
            </button>
          </div>

          {/* Reorder Mode Button */}
          {nonArchivedItems.length > 1 && (
            <Button
              type="button"
              variant={isReordering ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => setIsReordering(!isReordering)}
            >
              <ArrowUpDownIcon className="size-3.5 mr-1.5" />
              {isReordering ? words.screens.catalog.doneReordering : words.screens.catalog.reorder}
            </Button>
          )}

          {/* Desktop Add Item Button */}
          <Button
            type="button"
            size="sm"
            className="hidden sm:inline-flex h-8 text-xs shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            onClick={() => navigate({ to: '/catalog/new' })}
          >
            <PlusIcon className="size-3.5 mr-1.5" />
            {words.screens.catalog.addItem(kind)}
          </Button>
        </div>
      </div>

      {/* Main List Content */}
      {nonArchivedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto space-y-4">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <SparklesIcon className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground text-base">
              {words.screens.catalog.emptyItems(kind)}
            </h3>
            <p className="text-xs text-muted-foreground">
              Add your first item or populate with standard samples.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
              onClick={() => navigate({ to: '/catalog/new' })}
            >
              <PlusIcon className="size-3.5 mr-1" />
              {words.screens.catalog.addItem(kind)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleStartWithSamples}
            >
              {words.screens.catalog.startWithSamples}
            </Button>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto space-y-3">
          <p className="text-sm font-medium text-foreground">
            {search ? words.screens.catalog.noSearchResults(search) : 'No items match this filter.'}
          </p>
          {search && (
            <Button variant="outline" size="sm" onClick={() => setSearch('')}>
              {words.screens.catalog.clearSearch}
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
                  <h2 className="text-sm font-bold text-foreground tracking-tight">
                    {category.name}
                  </h2>
                  <Badge variant="secondary" className="text-xs py-0 px-1.5 font-mono">
                    {words.screens.catalog.itemCount(items.length)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2.5">
                {items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    optionGroups={optionGroups}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky Mobile Add Item Button */}
      <div className="sm:hidden fixed bottom-16 left-0 right-0 p-3 bg-background/80 backdrop-blur-md border-t border-border/40 z-30">
        <Button
          type="button"
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md font-semibold text-sm"
          onClick={() => navigate({ to: '/catalog/new' })}
        >
          <PlusIcon className="size-4 mr-1.5" />
          {words.screens.catalog.addItem(kind)}
        </Button>
      </div>
    </div>
  );
}
