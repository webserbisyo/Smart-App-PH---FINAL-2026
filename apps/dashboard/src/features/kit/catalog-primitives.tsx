import * as React from 'react';
import { GripVerticalIcon, UploadCloudIcon } from 'lucide-react';
import { Stat, StatLabel, StatValue } from '@smartapp/ui/components/stat';
import { BadgeOverflow } from '@smartapp/ui/components/badge-overflow';
import { Badge } from '@smartapp/ui/components/badge';
import { Sortable, SortableItem, SortableItemHandle } from '@smartapp/ui/components/reui/sortable';
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadTrigger,
  FileUploadList,
} from '@smartapp/ui/components/file-upload';
import { Button } from '@smartapp/ui/components/button';
import {
  ActionBar,
  ActionBarClose,
  ActionBarGroup,
  ActionBarItem,
  ActionBarSelection,
  ActionBarSeparator,
} from '@smartapp/ui/components/action-bar';
import { ButtonGroup, ButtonGroupSeparator } from '@smartapp/ui/components/button-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@smartapp/ui/components/select';
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
import {
  DataGrid,
  DataGridTable,
  useTable,
  dataGridFeatures,
  type ColumnDef,
} from '@smartapp/ui/components/reui/data-grid/index';
import { EmojiPicker } from '@smartapp/ui/components/reui/emoji-picker';
import { KitSection } from './kit-section.js';

interface DemoSortItem {
  id: string;
  name: string;
}

const DEMO_ITEMS: DemoSortItem[] = [
  { id: '1', name: 'Classic Burger' },
  { id: '2', name: 'Double Cheese' },
  { id: '3', name: 'Crispy Fries' },
  { id: '4', name: 'Iced Tea' },
];

const DEMO_TAGS = [
  'Size: Regular',
  'Size: Large',
  'Extra Patty',
  'Cheese Sauce',
  'Spicy Jalapeños',
  'Bacon Strips',
  'Caramelized Onions',
];

export function CatalogPrimitiveSections() {
  const [items, setItems] = React.useState<DemoSortItem[]>(DEMO_ITEMS);

  return (
    <>
      <KitSection
        title="Stat"
        library="DiceUI"
        path="packages/ui/src/components/stat.tsx"
        usedIn="catalog items list header stats, kit"
      >
        <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
            <StatLabel className="text-xs font-medium text-muted-foreground">All items</StatLabel>
            <StatValue className="font-mono text-2xl font-bold tracking-tight text-foreground">
              24
            </StatValue>
          </Stat>
          <Stat className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
            <StatLabel className="text-xs font-medium text-muted-foreground">Sold out</StatLabel>
            <StatValue className="font-mono text-2xl font-bold tracking-tight text-warning-text">
              2
            </StatValue>
          </Stat>
          <Stat className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
            <StatLabel className="text-xs font-medium text-muted-foreground">Hidden</StatLabel>
            <StatValue className="font-mono text-2xl font-bold tracking-tight text-muted-foreground">
              1
            </StatValue>
          </Stat>
        </div>
      </KitSection>

      <KitSection
        title="Badge Overflow"
        library="DiceUI"
        path="packages/ui/src/components/badge-overflow.tsx"
        usedIn="catalog item row add-ons preview, kit"
      >
        <div className="max-w-md space-y-2 rounded-xl border border-border/80 bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Compact multi-badge row with overflow counter:
          </p>
          <BadgeOverflow
            items={DEMO_TAGS}
            lineCount={1}
            renderBadge={(tag) => (
              <Badge key={tag} variant="secondary" className="h-5 px-2 py-0 text-xs font-medium">
                {tag}
              </Badge>
            )}
            renderOverflow={(count) => (
              <Badge variant="outline" className="h-5 px-1.5 py-0 font-mono text-xs">
                +{count}
              </Badge>
            )}
          />
        </div>
      </KitSection>

      <KitSection
        title="Sortable"
        library="ReUI"
        path="packages/ui/src/components/reui/sortable.tsx"
        usedIn="catalog items list, categories reorder, add-on options reorder, photos reorder, kit"
      >
        <div className="max-w-md space-y-2">
          <p className="text-xs text-muted-foreground">Drag items with mouse or keyboard:</p>
          <Sortable value={items} getItemValue={(item) => item.id} onValueChange={setItems}>
            <div className="space-y-1.5">
              {items.map((item) => (
                <SortableItem key={item.id} value={item.id}>
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-2.5 text-sm shadow-xs">
                    <span className="font-semibold text-foreground">{item.name}</span>
                    <SortableItemHandle
                      className="cursor-grab rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                      aria-label={`Drag ${item.name}`}
                    >
                      <GripVerticalIcon className="size-4" />
                    </SortableItemHandle>
                  </div>
                </SortableItem>
              ))}
            </div>
          </Sortable>
        </div>
      </KitSection>

      <KitSection
        title="File Upload"
        library="DiceUI"
        path="packages/ui/src/components/file-upload.tsx"
        usedIn="catalog item editor photo upload section, kit"
      >
        <div className="max-w-md space-y-2">
          <FileUpload maxFiles={5} accept="image/*">
            <FileUploadDropzone className="flex flex-col items-center justify-center space-y-2 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50">
              <UploadCloudIcon className="size-8 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">Drag photos here or browse</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WebP up to 15 MB</p>
              </div>
              <FileUploadTrigger
                render={
                  <Button variant="outline" size="sm" className="mt-2 h-8 text-xs">
                    Choose photos
                  </Button>
                }
              />
            </FileUploadDropzone>
            <FileUploadList />
          </FileUpload>
        </div>
      </KitSection>

      <KitSection
        title="Action Bar"
        library="DiceUI"
        path="packages/ui/src/components/action-bar.tsx"
        usedIn="catalog items bulk actions bar, kit"
      >
        <ActionBarDemo />
      </KitSection>

      <KitSection
        title="Button Group"
        library="shadcn (base-nova)"
        path="packages/ui/src/components/button-group.tsx"
        usedIn="photo zoom in Change picture and the customer picture picker (T83), kit"
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Segmented action controls in a grouped row:
          </p>
          <ButtonGroup>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Available
            </Button>
            <ButtonGroupSeparator />
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Sold out
            </Button>
            <ButtonGroupSeparator />
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Hidden
            </Button>
          </ButtonGroup>
        </div>
      </KitSection>

      <KitSection
        title="Select"
        library="shadcn (base-nova)"
        path="packages/ui/src/components/select.tsx"
        usedIn="catalog items table column visibility, kit"
      >
        <div className="max-w-xs space-y-2">
          <p className="text-xs text-muted-foreground">Single selection dropdown:</p>
          <Select defaultValue="burgers">
            <SelectTrigger className="w-48 text-xs">
              <SelectValue placeholder="Pick a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="burgers">Burgers</SelectItem>
              <SelectItem value="chicken">Chicken & Rice</SelectItem>
              <SelectItem value="drinks">Drinks & Shakes</SelectItem>
              <SelectItem value="desserts">Desserts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </KitSection>

      <KitSection
        title="Popover"
        library="shadcn (base-nova)"
        path="packages/ui/src/components/popover.tsx"
        usedIn="catalog column visibility picker, kit"
      >
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Floating overlay panel:</p>
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Open popover
                </Button>
              }
            />
            <PopoverContent className="w-64 p-3 text-xs">
              <p className="font-semibold text-foreground">Column visibility</p>
              <p className="mt-1 text-muted-foreground">
                Toggle table columns to customise the catalog view.
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </KitSection>

      <KitSection
        title="Data Grid"
        library="ReUI"
        path="packages/ui/src/components/reui/data-grid/data-grid.tsx"
        usedIn="catalog items table, kit"
      >
        <DataGridDemo />
      </KitSection>

      <KitSection
        title="Emoji Picker"
        library="ReUI"
        path="packages/ui/src/components/reui/emoji-picker.tsx"
        usedIn="category icon dialog (Any emoji tab), kit"
      >
        <EmojiPickerDemo />
      </KitSection>
    </>
  );
}

function ActionBarDemo() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        className="h-8 text-xs"
      >
        {open ? 'Hide action bar' : 'Show action bar demo'}
      </Button>

      <ActionBar open={open} onOpenChange={setOpen}>
        <ActionBarSelection>3 items selected</ActionBarSelection>
        <ActionBarSeparator />
        <ActionBarGroup>
          <ActionBarItem onClick={() => setOpen(false)}>Mark available</ActionBarItem>
          <ActionBarItem onClick={() => setOpen(false)}>Mark sold out</ActionBarItem>
        </ActionBarGroup>
        <ActionBarSeparator />
        <ActionBarClose />
      </ActionBar>
    </div>
  );
}

interface DemoItemRow {
  id: string;
  name: string;
  price: string;
  status: string;
}

const DEMO_GRID_DATA: DemoItemRow[] = [
  { id: '1', name: 'Cheeseburger', price: '₱149', status: 'Available' },
  { id: '2', name: 'Crispy Fries', price: '₱79', status: 'Available' },
  { id: '3', name: 'Vanilla Shake', price: '₱119', status: 'Sold out' },
];

function DataGridDemo() {
  const columns = React.useMemo<ColumnDef<typeof dataGridFeatures, DemoItemRow, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: () => <span className="text-xs font-semibold">Item name</span>,
        cell: (info) => <span className="text-xs font-medium">{String(info.getValue())}</span>,
      },
      {
        id: 'price',
        accessorKey: 'price',
        header: () => <span className="text-xs font-semibold">Price</span>,
        cell: (info) => <span className="font-mono text-xs">{String(info.getValue())}</span>,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: () => <span className="text-xs font-semibold">Status</span>,
        cell: (info) => (
          <Badge variant="secondary" className="text-xs">
            {String(info.getValue())}
          </Badge>
        ),
      },
    ],
    [],
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: DEMO_GRID_DATA,
    getRowId: (row) => row.id,
  });

  return (
    <div className="max-w-xl overflow-hidden rounded-xl border border-border/80 bg-card">
      <DataGrid table={table} recordCount={DEMO_GRID_DATA.length} tableLayout={{ dense: true }}>
        <DataGridTable />
      </DataGrid>
    </div>
  );
}

function EmojiPickerDemo() {
  const [selectedEmoji, setSelectedEmoji] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-3">
      {selectedEmoji && (
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs">
          <span className="text-base">{selectedEmoji}</span>
          <span className="text-muted-foreground">Selected emoji</span>
        </div>
      )}
      <div className="max-w-xs">
        <EmojiPicker
          dataUrl="/emojibase"
          onEmojiSelect={(selection) => setSelectedEmoji(selection.value)}
        />
      </div>
    </div>
  );
}
