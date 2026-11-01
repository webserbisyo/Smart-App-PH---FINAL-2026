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
    </>
  );
}
