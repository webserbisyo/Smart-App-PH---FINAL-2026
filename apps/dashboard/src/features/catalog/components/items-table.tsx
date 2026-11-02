// Hidden from the Menu page for launch (decision T41); it comes back for shops with big menus.
import * as React from 'react';
import { Columns3Icon } from 'lucide-react';
import {
  itemPriceLabel,
  catalogWords,
  type OwnerItem,
  type Category,
  type OwnerOptionGroup,
} from '@smartapp/core';
import {
  DataGrid,
  DataGridColumnHeader,
  DataGridColumnVisibility,
  DataGridTableDndRowHandle,
  DataGridTableDndRows,
  dataGridFeatures,
  useTable,
  type ColumnDef,
  type DataGridFeatures,
  type DragEndEvent,
} from '@smartapp/ui/components/reui/data-grid/index';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/badge';
import { Switch } from '@smartapp/ui/components/switch';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { BadgeOverflow } from '@smartapp/ui/components/badge-overflow';
import { CatalogPhoto } from '../catalog-photo.js';
import { ItemMenu } from './item-menu.js';
import { isItemSoldOut, type ItemActions } from './item-actions.js';

export interface ItemsTableProps {
  items: OwnerItem[];
  categories: Category[];
  optionGroups?: OwnerOptionGroup[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (all: boolean) => void;
  onReorder: (ids: string[]) => void;
  actions: ItemActions;
}

export function ItemsTable({
  items,
  categories,
  optionGroups = [],
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onReorder,
  actions,
}: ItemsTableProps) {
  const categoryMap = React.useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  const columns = React.useMemo<ColumnDef<DataGridFeatures, OwnerItem, unknown>[]>(() => {
    return [
      // 0. DnD Handle
      {
        id: 'dnd',
        header: () => null,
        cell: () => <DataGridTableDndRowHandle className="size-6 text-muted-foreground" />,
        enableSorting: false,
        enableHiding: false,
        size: 36,
      },
      // 1. Selection Checkbox
      {
        id: 'select',
        header: () => (
          <div className="flex items-center justify-center p-1">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
              aria-label={catalogWords.selectAll}
            />
          </div>
        ),
        cell: ({ row }) => {
          const item = row.original;
          const isChecked = selectedSet.has(item.id);
          return (
            <div
              className="flex items-center justify-center p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggleSelect(item.id)}
                aria-label={catalogWords.selectItemAria(item.name)}
              />
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      // 2. Photo
      {
        id: 'photo',
        meta: { headerTitle: catalogWords.colPhoto },
        header: () => <span className="text-xs font-semibold">{catalogWords.colPhoto}</span>,
        cell: ({ row }) => (
          <div className="flex items-center py-1">
            <CatalogPhoto
              photoRef={row.original.photos[0]}
              alt={row.original.name}
              size="sm"
              className="rounded-lg"
            />
          </div>
        ),
        enableSorting: false,
        size: 56,
      },
      // 3. Name
      {
        id: 'name',
        meta: { headerTitle: catalogWords.colName },
        accessorKey: 'name',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={catalogWords.colName} />
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex min-w-0 items-center gap-2 pr-2">
              <span
                onClick={() => actions.edit(item)}
                className="cursor-pointer truncate text-sm font-medium text-foreground hover:text-primary"
              >
                {item.name}
              </span>
              {item.sample && (
                <Badge variant="outline" className="shrink-0 px-1 py-0 text-xs font-normal">
                  {catalogWords.sampleBadge}
                </Badge>
              )}
            </div>
          );
        },
        size: 200,
      },
      // 4. Category
      {
        id: 'category',
        meta: { headerTitle: catalogWords.colCategory },
        accessorFn: (row) => categoryMap.get(row.categoryId)?.name ?? catalogWords.categoryGeneral,
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={catalogWords.colCategory} />
        ),
        cell: ({ row }) => {
          const cat = categoryMap.get(row.original.categoryId);
          return (
            <span className="truncate text-xs text-muted-foreground">
              {cat?.name ?? catalogWords.categoryGeneral}
            </span>
          );
        },
        size: 130,
      },
      // 5. Price
      {
        id: 'price',
        meta: { headerTitle: catalogWords.colPrice },
        accessorFn: (row) => row.variants[0]?.price ?? 0,
        header: ({ column }) => (
          <div className="flex w-full justify-end">
            <DataGridColumnHeader column={column} title={catalogWords.colPrice} />
          </div>
        ),
        cell: ({ row }) => (
          <div className="pr-2 text-right">
            <span className="text-sm font-bold text-foreground tabular">
              {itemPriceLabel(row.original)}
            </span>
          </div>
        ),
        size: 110,
      },
      // 6. Add-ons
      {
        id: 'addOns',
        meta: { headerTitle: catalogWords.colAddOns },
        header: () => <span className="text-xs font-semibold">{catalogWords.colAddOns}</span>,
        cell: ({ row }) => {
          const itemGroups = optionGroups.filter((g) => row.original.optionGroupIds.includes(g.id));
          if (itemGroups.length === 0) {
            return <span className="text-xs text-muted-foreground/60">—</span>;
          }
          return (
            <BadgeOverflow
              items={itemGroups}
              getBadgeLabel={(g) => g.name}
              lineCount={1}
              className="max-w-44"
              renderBadge={(g) => (
                <Badge
                  key={g.id}
                  variant="outline"
                  className="px-1.5 py-0 text-xs font-normal text-muted-foreground"
                >
                  {g.name}
                </Badge>
              )}
              renderOverflow={(count) => (
                <Badge variant="secondary" className="px-1 py-0 font-mono text-xs">
                  +{count}
                </Badge>
              )}
            />
          );
        },
        enableSorting: false,
        size: 160,
      },
      // 7. Visible switch
      {
        id: 'visible',
        meta: { headerTitle: catalogWords.colVisible },
        header: () => <span className="text-xs font-semibold">{catalogWords.colVisible}</span>,
        cell: ({ row }) => {
          const item = row.original;
          const isVisible = item.status !== 'hidden';
          return (
            <div
              className="flex items-center justify-center p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Switch
                checked={isVisible}
                onCheckedChange={() => actions.setVisible(item, item.status === 'hidden')}
                aria-label={`${catalogWords.colVisible} ${item.name}`}
              />
            </div>
          );
        },
        enableSorting: false,
        size: 75,
      },
      // 8. Sold out switch
      {
        id: 'soldOut',
        meta: { headerTitle: catalogWords.colSoldOut },
        header: () => <span className="text-xs font-semibold">{catalogWords.colSoldOut}</span>,
        cell: ({ row }) => {
          const item = row.original;
          const isSoldOut = item.variants.every((v) => v.availability === 'sold_out');
          return (
            <div
              className="flex items-center justify-center p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Switch
                checked={isSoldOut}
                onCheckedChange={() => actions.setSoldOut(item, !isItemSoldOut(item))}
                aria-label={`${catalogWords.colSoldOut} ${item.name}`}
              />
            </div>
          );
        },
        enableSorting: false,
        size: 85,
      },
      // 9. Actions
      {
        id: 'actions',
        meta: { headerTitle: catalogWords.colActions },
        header: () => <span className="text-xs font-semibold">{catalogWords.colActions}</span>,
        cell: ({ row }) => (
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            <ItemMenu item={row.original} actions={actions} />
          </div>
        ),
        enableSorting: false,
        size: 64,
      },
    ];
  }, [
    allSelected,
    someSelected,
    selectedSet,
    categoryMap,
    optionGroups,
    onSelectAll,
    onToggleSelect,
    actions,
  ]);

  const table = useTable({
    features: dataGridFeatures,
    data: items,
    columns,
    getRowId: (row) => row.id,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...items];
    const [removed] = reordered.splice(oldIndex, 1);
    if (removed) {
      reordered.splice(newIndex, 0, removed);
      onReorder(reordered.map((i) => i.id));
    }
  };

  const itemIds = React.useMemo(() => items.map((i) => i.id), [items]);

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/80 bg-card p-3 shadow-xs">
      {/* ReUI Data Grid with DnD rows */}
      <DataGrid
        table={table}
        recordCount={items.length}
        tableLayout={{
          dense: false,
        }}
        tableClassNames={{
          headerSticky:
            'sticky top-0 z-30 bg-muted/90 font-medium text-foreground backdrop-blur-xs',
          bodyRow:
            'h-14 transition-colors hover:bg-muted/40 data-[state=selected]:bg-primary/5 cursor-default',
        }}
      >
        {/* Table toolbar: inside DataGrid, because the column menu reads its context */}
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs text-muted-foreground">
            {catalogWords.itemCount(items.length)}
          </span>
          <DataGridColumnVisibility
            table={table}
            trigger={
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
                <Columns3Icon className="size-3.5" />
                <span>{catalogWords.columnsToggle}</span>
              </Button>
            }
          />
        </div>

        {/* Wide tables scroll inside the card, never the page */}
        <div className="w-full overflow-x-auto">
          <DataGridTableDndRows handleDragEnd={handleDragEnd} dataIds={itemIds} />
        </div>
      </DataGrid>
    </div>
  );
}
