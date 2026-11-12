import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  PlusIcon,
  ArchiveIcon,
  ArrowUpDownIcon,
  WifiOffIcon,
  SearchXIcon,
  SparklesIcon,
  ListIcon,
  LayoutGridIcon,
  ListChecksIcon,
  GripVerticalIcon,
} from 'lucide-react';
import { catalogWords, errorWords, type OwnerItem, type Category } from '@smartapp/core';
import {
  useOwnerItems,
  useOwnerCategories,
  useSaveSortOrder,
  useSaveItem,
  useSetItemStatus,
  useBulkSetSoldOut,
  useBulkSetItemStatus,
  useBulkMoveCategory,
  useAdapters,
  errorCodeOf,
} from '@smartapp/data';
import { useShop } from '@/app/shop';
import { useOnlineStatus } from '@/app/use-online-status';
import { useDockClearance } from '@/app/use-dock-clearance';
import { Notice } from '@/app/notice';
import { SearchField } from '@/app/search-field';
import { PageEmpty, PageError } from '@/app/page-state';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/badge';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Sortable, SortableItem, SortableItemHandle } from '@smartapp/ui/components/reui/sortable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { notify } from '@smartapp/ui/compositions/notify';
import { ItemRow } from './item-row.js';
import { ItemsGrid } from './components/items-grid.js';
import { ItemsActionBar } from './components/items-action-bar.js';
import { SamplesBanner } from './samples-banner.js';
import { FloatingAddButton } from './floating-add-button.js';
import { isItemSoldOut, useItemActions } from './components/item-actions.js';
import { cn } from 'cn';
import { CATALOG_FILTERS, type CatalogFilter } from './tabs.js';

type FilterTab = CatalogFilter;
// Table view is hidden for launch (decision T41); it comes back for big menus.
type CatalogView = 'list' | 'grid';
const FILTERS: readonly FilterTab[] = CATALOG_FILTERS;

const LOCAL_STORAGE_VIEW_KEY = 'smartapp:catalog:view';

const FALLBACK_GENERAL_CATEGORY: Category = {
  id: 'uncategorized',
  name: catalogWords.categoryGeneral,
  sort: 0,
  icon: { kind: 'fluent', key: 'other', style: 'flat' },
};

const FALLBACK_OTHER_CATEGORY: Category = {
  id: 'other',
  name: catalogWords.categoryOther,
  sort: 999,
  icon: { kind: 'fluent', key: 'other', style: 'flat' },
};

function getDefaultView(): CatalogView {
  if (typeof window === 'undefined') return 'grid';
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_VIEW_KEY);
    if (saved === 'list' || saved === 'grid') {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return window.innerWidth < 768 ? 'list' : 'grid';
}

export function ItemsList() {
  const navigate = useNavigate();
  const { kind, slug } = useShop();
  const isOnline = useOnlineStatus();
  const dockClearance = useDockClearance();
  const { ownerSamples } = useAdapters();
  const { actions, dialogs } = useItemActions();

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

  const saveSortOrder = useSaveSortOrder();
  const saveItem = useSaveItem();
  const setStatus = useSetItemStatus();
  const bulkSetSoldOut = useBulkSetSoldOut();
  const bulkSetStatus = useBulkSetItemStatus();
  const bulkMoveCategory = useBulkMoveCategory();

  const [view, setView] = React.useState<CatalogView>(getDefaultView);
  const [selecting, setSelecting] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  // Search and filter live in the address too, so Back from an item restores them (decision T47).
  const listSearch = useSearch({ strict: false });
  const [search, setSearch] = React.useState(listSearch.q ?? '');
  const [filter, setFilter] = React.useState<FilterTab>(listSearch.filter ?? 'all');
  const urlQ = listSearch.q;
  const urlFilter = listSearch.filter;
  React.useEffect(() => {
    const q = search.trim() ? search : undefined;
    const f = filter === 'all' ? undefined : filter;
    if (q === urlQ && f === urlFilter) return;
    void navigate({ to: '/catalog', search: { q, filter: f }, replace: true });
  }, [search, filter, urlQ, urlFilter, navigate]);
  const [isReordering, setIsReordering] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState('');

  const nonArchivedItems = React.useMemo(
    () => (items ?? []).filter((item) => item.status !== 'archived'),
    [items],
  );

  const archivedItems = React.useMemo(
    () => (items ?? []).filter((item) => item.status === 'archived'),
    [items],
  );
  const isArchived = filter === 'archived';

  const counts: Record<FilterTab, number> = {
    all: nonArchivedItems.length,
    sold_out: nonArchivedItems.filter(isItemSoldOut).length,
    hidden: nonArchivedItems.filter((item) => item.status === 'hidden').length,
    archived: archivedItems.length,
  };
  const filterLabel: Record<FilterTab, string> = {
    all: catalogWords.filterAll,
    sold_out: catalogWords.filterSoldOut,
    hidden: catalogWords.filterHidden,
    archived: catalogWords.filterArchived,
  };

  const filteredItems = React.useMemo(() => {
    const query = search.toLowerCase().trim();
    // Archived items show only under their own filter (decision T43).
    const source = filter === 'archived' ? archivedItems : nonArchivedItems;
    return source.filter((item) => {
      if (filter === 'sold_out' && !isItemSoldOut(item)) return false;
      if (filter === 'hidden' && item.status !== 'hidden') return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [nonArchivedItems, archivedItems, filter, search]);

  const groupedSections = React.useMemo(() => {
    if (!categories || categories.length === 0) {
      return filteredItems.length === 0
        ? []
        : [{ category: FALLBACK_GENERAL_CATEGORY, items: filteredItems }];
    }
    const byCategory = new Map<string, OwnerItem[]>();
    for (const item of filteredItems) {
      const list = byCategory.get(item.categoryId) ?? [];
      list.push(item);
      byCategory.set(item.categoryId, list);
    }
    const sections: { category: Category; items: OwnerItem[] }[] = [];
    for (const cat of categories) {
      const catItems = byCategory.get(cat.id);
      if (catItems && catItems.length > 0) sections.push({ category: cat, items: catItems });
    }
    const listedIds = new Set(categories.map((c) => c.id));
    const orphans = filteredItems.filter((i) => !listedIds.has(i.categoryId));
    if (orphans.length > 0) sections.push({ category: FALLBACK_OTHER_CATEGORY, items: orphans });
    return sections;
  }, [categories, filteredItems]);

  const handleViewChange = (nextView: string) => {
    if (nextView !== 'list' && nextView !== 'grid') return;
    setView(nextView);
    try {
      localStorage.setItem(LOCAL_STORAGE_VIEW_KEY, nextView);
    } catch {
      // Private mode: the view is only remembered for this visit.
    }
  };

  const stopSelecting = () => {
    setSelecting(false);
    setSelectedIds([]);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleReorder = (newItems: OwnerItem[]) => {
    // The list moves at once; only a failed save speaks up (it rolls back on refetch).
    saveSortOrder.mutate(
      { kind: 'item', ids: newItems.map((i) => i.id) },
      {
        onError: () => {
          notify({ title: catalogWords.reorderFailed, tone: 'error' });
          void refetchItems();
        },
      },
    );
  };

  const handleMove = (item: OwnerItem, delta: number) => {
    const idx = nonArchivedItems.findIndex((i) => i.id === item.id);
    const targetIdx = idx + delta;
    if (idx < 0 || targetIdx < 0 || targetIdx >= nonArchivedItems.length) return;
    const list = [...nonArchivedItems];
    const [moved] = list.splice(idx, 1);
    if (!moved) return;
    list.splice(targetIdx, 0, moved);
    handleReorder(list);
    setAnnouncement(catalogWords.movedAnnouncement(item.name, targetIdx + 1, list.length));
  };

  const addOnCount = (item: OwnerItem) => item.optionGroupIds.length;

  // Bulk actions: each one can be undone from its toast.
  const restoreVariants = (previous: OwnerItem[]) =>
    bulkSetSoldOut.mutate({
      items: previous.flatMap((i) =>
        i.variants.map((v) => ({
          variantId: v.id,
          availability: v.availability,
          soldOutUntil: v.soldOutUntil,
        })),
      ),
    });
  const restoreStatus = (previous: OwnerItem[]) => {
    for (const item of previous) setStatus.mutate({ id: item.id, status: item.status });
  };
  const runBulk = async (
    ids: string[],
    run: (previous: OwnerItem[]) => Promise<unknown>,
    title: string,
    undo: (previous: OwnerItem[]) => void,
  ) => {
    const previous = (items ?? []).filter((i) => ids.includes(i.id));
    try {
      await run(previous);
      stopSelecting();
      notify({
        title,
        tone: 'success',
        action: { label: catalogWords.undo, onClick: () => undo(previous) },
      });
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  const handleBulkSoldOutToday = (ids: string[]) => {
    const until = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    void runBulk(
      ids,
      (previous) =>
        bulkSetSoldOut.mutateAsync({
          items: previous.flatMap((i) =>
            i.variants.map((v) => ({
              variantId: v.id,
              availability: 'sold_out' as const,
              soldOutUntil: until,
            })),
          ),
        }),
      catalogWords.bulkUpdated(ids.length),
      restoreVariants,
    );
  };
  const handleBulkBackOn = (ids: string[]) => {
    void runBulk(
      ids,
      (previous) =>
        bulkSetSoldOut.mutateAsync({
          items: previous.flatMap((i) =>
            i.variants.map((v) => ({
              variantId: v.id,
              availability: 'available' as const,
              soldOutUntil: null,
            })),
          ),
        }),
      catalogWords.bulkUpdated(ids.length),
      restoreVariants,
    );
  };
  const handleBulkStatus = (ids: string[], status: 'hidden' | 'active' | 'archived') => {
    void runBulk(
      ids,
      () => bulkSetStatus.mutateAsync({ itemIds: ids, status }),
      status === 'archived'
        ? catalogWords.bulkArchived(ids.length)
        : catalogWords.bulkUpdated(ids.length),
      restoreStatus,
    );
  };
  const handleBulkMoveCategory = (ids: string[], targetCategoryId: string) => {
    const catName = categories?.find((c) => c.id === targetCategoryId)?.name ?? '';
    void runBulk(
      ids,
      (previous) => bulkMoveCategory.mutateAsync({ items: previous, targetCategoryId }),
      catalogWords.bulkMoved(ids.length, catName),
      (previous) => {
        for (const item of previous) {
          saveItem.mutate({
            id: item.id,
            draft: {
              categoryId: item.categoryId,
              name: item.name,
              description: item.description,
              photos: item.photos,
              basePrice: item.basePrice,
              axes: item.axes,
              variants: item.variants,
              optionGroupIds: item.optionGroupIds,
              pairingIds: item.pairingIds,
              featured: item.featured,
              isNew: item.isNew,
              noticeDays: item.noticeDays,
              dailyLimit: item.dailyLimit,
              status: item.status,
            },
          });
        }
      },
    );
  };

  const handlePopulateSamples = async () => {
    if (!ownerSamples) return;
    try {
      await ownerSamples.applySamplePack({ slug, packSlug: slug });
      void refetchItems();
      void refetchCats();
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  const goNew = (name?: string) => {
    void navigate({ to: '/catalog/new', search: name ? { name } : {} });
  };

  const startReorder = () => {
    // Reorder works on the list, so grid switches to it first (finding B9).
    if (view !== 'list') handleViewChange('list');
    setSearch('');
    setFilter('all');
    setIsReordering(true);
  };

  const visibleIds = filteredItems.map((item) => item.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  if (itemsLoading || catsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-11 w-full rounded-xl sm:w-72" />
          <Skeleton className="h-11 w-56 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
              <Skeleton className="size-14 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const error = itemsError ?? catsError;
  if (error) {
    return (
      <PageError
        title={catalogWords.loadFailed}
        message={errorWords(errorCodeOf(error))}
        retryLabel={catalogWords.tryAgain}
        onRetry={() => {
          void refetchItems();
          void refetchCats();
        }}
      />
    );
  }

  const toolbarButton = 'h-11 shrink-0 gap-1.5 md:h-9';

  return (
    <div className="space-y-4 pb-40 md:pb-12">
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {!isOnline ? (
        <Notice tone="warning" icon={<WifiOffIcon />}>
          {catalogWords.offlineNotice}
        </Notice>
      ) : null}

      {!selecting && !isReordering && !isArchived ? (
        <SamplesBanner items={items ?? []} categories={categories ?? []} />
      ) : null}

      {(items ?? []).length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SearchField
              value={search}
              onChange={setSearch}
              ariaLabel={catalogWords.searchPlaceholder(kind)}
              placeholder={catalogWords.searchPlaceholder(kind)}
              clearLabel={catalogWords.clearSearch}
              className="min-w-0 flex-1 md:max-w-md"
            />

            <div className="flex shrink-0 items-center gap-2">
              {selecting ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={toolbarButton}
                  disabled={visibleIds.length === 0}
                  onClick={() => setSelectedIds(allSelected ? [] : visibleIds)}
                >
                  {allSelected ? catalogWords.selectNone : catalogWords.selectAll}
                </Button>
              ) : null}

              {isArchived ? null : !isReordering ? (
                <Button
                  type="button"
                  variant={selecting ? 'default' : 'outline'}
                  className={toolbarButton}
                  onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
                >
                  <ListChecksIcon className="size-4" />
                  <span className={cn(!selecting && 'sr-only sm:not-sr-only')}>
                    {selecting ? catalogWords.selectDone : catalogWords.select}
                  </span>
                </Button>
              ) : (
                <Button
                  type="button"
                  className={toolbarButton}
                  onClick={() => setIsReordering(false)}
                >
                  {catalogWords.doneReordering}
                </Button>
              )}

              {!isReordering && !selecting && !isArchived ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className={toolbarButton}
                        aria-label={catalogWords.viewMenu}
                      />
                    }
                  >
                    {view === 'grid' ? (
                      <LayoutGridIcon className="size-4" />
                    ) : (
                      <ListIcon className="size-4" />
                    )}
                    <span className="hidden sm:inline">{catalogWords.viewMenu}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{catalogWords.viewMenu}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={view} onValueChange={handleViewChange}>
                        <DropdownMenuRadioItem
                          value="list"
                          closeOnClick
                          className="min-h-11 md:min-h-8"
                        >
                          <ListIcon className="size-4" />
                          {catalogWords.viewAsList}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem
                          value="grid"
                          closeOnClick
                          className="min-h-11 md:min-h-8"
                        >
                          <LayoutGridIcon className="size-4" />
                          {catalogWords.viewAsGrid}
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                    {nonArchivedItems.length > 1 ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="min-h-11 md:min-h-8" onClick={startReorder}>
                          <ArrowUpDownIcon className="size-4" />
                          {catalogWords.reorder}
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            <Button
              type="button"
              className={cn(toolbarButton, 'ml-auto hidden font-semibold md:inline-flex')}
              onClick={() => goNew()}
            >
              <PlusIcon className="size-4" />
              {catalogWords.addItem(kind)}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* The installed Toggle Group: one filter at a time, arrow keys move between them. */}
            <ToggleGroup
              value={[filter]}
              onValueChange={(value) => {
                const next = FILTERS.find((tab) => tab === value[0]);
                if (!next) return;
                setFilter(next);
                if (next === 'archived') stopSelecting();
              }}
              aria-label={catalogWords.filterLabel}
              spacing={1}
              className="max-w-full flex-wrap rounded-xl border border-border/60 bg-muted/60 p-1"
            >
              {FILTERS.map((tab) => (
                <ToggleGroupItem
                  key={tab}
                  value={tab}
                  className="h-11 gap-1 rounded-lg px-2.5 text-sm font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs sm:gap-1.5 sm:px-3 md:h-8"
                >
                  {filterLabel[tab]}
                  <span className="text-xs text-muted-foreground tabular">{counts[tab]}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      ) : null}

      {isArchived && archivedItems.length > 0 ? (
        <Notice tone="info" icon={<ArchiveIcon />}>
          {catalogWords.archivedHint}
        </Notice>
      ) : null}

      {(items ?? []).length === 0 ? (
        <PageEmpty
          className="py-16"
          icon={<SparklesIcon />}
          title={catalogWords.emptyItems(kind)}
          description={catalogWords.emptyItemsHint}
          action={
            <>
              <Button className="h-11 gap-1.5 font-semibold md:h-9" onClick={() => goNew()}>
                <PlusIcon className="size-4" />
                {catalogWords.addItem(kind)}
              </Button>
              {ownerSamples ? (
                <Button
                  variant="outline"
                  className="h-11 md:h-9"
                  onClick={() => void handlePopulateSamples()}
                >
                  {catalogWords.startWithSamples}
                </Button>
              ) : null}
            </>
          }
        />
      ) : filteredItems.length === 0 ? (
        <PageEmpty
          icon={isArchived && !search ? <ArchiveIcon /> : <SearchXIcon />}
          description={
            search
              ? catalogWords.noSearchResults(search)
              : isArchived
                ? catalogWords.emptyArchived
                : catalogWords.noFilterMatch
          }
          action={
            <>
              {search.trim() && !isArchived ? (
                <Button
                  className="h-11 gap-1.5 font-semibold md:h-9"
                  onClick={() => goNew(search.trim())}
                >
                  <PlusIcon className="size-4" />
                  {catalogWords.addNamed(search.trim())}
                </Button>
              ) : null}
              <Button
                variant="outline"
                className="h-11 md:h-9"
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                }}
              >
                {search ? catalogWords.clearSearch : catalogWords.showAll}
              </Button>
            </>
          }
        />
      ) : isReordering ? (
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
                  actions={actions}
                  isReordering
                  canMoveUp={index > 0}
                  canMoveDown={index < nonArchivedItems.length - 1}
                  onMoveUp={() => handleMove(item, -1)}
                  onMoveDown={() => handleMove(item, 1)}
                  dragHandle={
                    <SortableItemHandle
                      className="flex size-11 cursor-grab items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing md:size-9"
                      aria-label={catalogWords.reorder}
                    >
                      <GripIcon />
                    </SortableItemHandle>
                  }
                />
              </SortableItem>
            ))}
          </div>
        </Sortable>
      ) : view === 'grid' && !isArchived ? (
        <ItemsGrid
          items={filteredItems}
          categories={categories ?? []}
          actions={actions}
          selecting={selecting}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
      ) : (
        <div className="space-y-6">
          {groupedSections.map(({ category, items: sectionItems }) => (
            <section key={category.id} className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <h2 className="text-sm font-bold text-foreground">{category.name}</h2>
                <Badge variant="secondary" className="tabular">
                  {catalogWords.itemCount(sectionItems.length)}
                </Badge>
              </div>
              <div className="space-y-2">
                {sectionItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    actions={actions}
                    addOnCount={addOnCount(item)}
                    selecting={selecting}
                    selected={selectedIds.includes(item.id)}
                    onToggleSelect={() => handleToggleSelect(item.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ItemsActionBar
        selected={nonArchivedItems.filter((item) => selectedIds.includes(item.id))}
        categories={categories ?? []}
        sideOffset={dockClearance}
        onClearSelection={stopSelecting}
        onBulkSoldOutToday={handleBulkSoldOutToday}
        onBulkBackOn={handleBulkBackOn}
        onBulkHide={(ids) => handleBulkStatus(ids, 'hidden')}
        onBulkShow={(ids) => handleBulkStatus(ids, 'active')}
        onBulkMoveCategory={handleBulkMoveCategory}
        onBulkArchive={(ids) => handleBulkStatus(ids, 'archived')}
      />

      {dialogs}

      {nonArchivedItems.length > 0 && !selecting && !isReordering && !isArchived ? (
        <FloatingAddButton label={catalogWords.addItem(kind)} onClick={() => goNew()} />
      ) : null}
    </div>
  );
}

function GripIcon() {
  return <GripVerticalIcon className="size-5" />;
}
