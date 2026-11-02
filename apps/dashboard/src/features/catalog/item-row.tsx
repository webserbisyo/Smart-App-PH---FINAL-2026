import type * as React from 'react';
import {
  ArchiveIcon,
  BanIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeOffIcon,
  GripVerticalIcon,
  RotateCcwIcon,
} from 'lucide-react';
import { itemPriceLabel, catalogWords, type OwnerItem } from '@smartapp/core';
import { Status, StatusLabel } from '@smartapp/ui/components/status';
import { Button } from '@smartapp/ui/components/button';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { Item } from '@smartapp/ui/components/item';
import { Switch } from '@smartapp/ui/components/switch';
import { CatalogPhoto } from './catalog-photo.js';
import { ItemMenu } from './components/item-menu.js';
import { isItemSoldOut, type ItemActions } from './components/item-actions.js';
import { cn } from 'cn';

export interface ItemRowProps {
  item: OwnerItem;
  actions: ItemActions;
  addOnCount?: number | undefined;
  selecting?: boolean | undefined;
  selected?: boolean | undefined;
  onToggleSelect?: (() => void) | undefined;
  isReordering?: boolean | undefined;
  canMoveUp?: boolean | undefined;
  canMoveDown?: boolean | undefined;
  onMoveUp?: (() => void) | undefined;
  onMoveDown?: (() => void) | undefined;
  dragHandle?: React.ReactNode | undefined;
  highlighted?: boolean | undefined;
}

const statusLook = 'gap-1 px-2 py-0.5 font-semibold';

// Item states on the installed DiceUI Status (icon + word + colour), the same on every view (decision T43).
export function ItemStatusBadges({ item }: { item: OwnerItem }) {
  if (item.status === 'archived') {
    return (
      <Status className={cn(statusLook, 'border-border bg-muted text-muted-foreground')}>
        <ArchiveIcon aria-hidden="true" className="size-3" />
        <StatusLabel>{catalogWords.archivedBadge}</StatusLabel>
      </Status>
    );
  }
  const soldOut = isItemSoldOut(item);
  return (
    <>
      {soldOut ? (
        <Status className={cn(statusLook, 'border-warning/40 bg-warning-soft text-warning-text')}>
          <BanIcon aria-hidden="true" className="size-3" />
          <StatusLabel>{catalogWords.soldOutBadge}</StatusLabel>
        </Status>
      ) : null}
      {item.status === 'hidden' ? (
        <Status className={cn(statusLook, 'border-border bg-secondary text-secondary-foreground')}>
          <EyeOffIcon aria-hidden="true" className="size-3" />
          <StatusLabel>{catalogWords.hiddenBadge}</StatusLabel>
        </Status>
      ) : null}
    </>
  );
}

export function LabeledSwitch({
  label,
  ariaLabel,
  checked,
  onCheckedChange,
}: {
  label: string;
  // Names the item for screen readers, since every row has the same visible word.
  ariaLabel?: string | undefined;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-foreground md:min-h-9"
      onClick={(e) => e.stopPropagation()}
    >
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={ariaLabel} />
      {label}
    </label>
  );
}

export function ItemRow({
  item,
  actions,
  addOnCount = 0,
  selecting = false,
  selected = false,
  onToggleSelect,
  isReordering = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  dragHandle,
  highlighted = false,
}: ItemRowProps) {
  const soldOut = isItemSoldOut(item);
  const meta = [
    item.axes.length > 0 ? catalogWords.versionCount(item.variants.length) : null,
    addOnCount > 0 ? catalogWords.addOnGroupCount(addOnCount) : null,
  ].filter((part) => part !== null);

  const handleOpen = () => {
    if (isReordering) return;
    if (selecting) onToggleSelect?.();
    else actions.edit(item);
  };

  // The row is the installed shadcn Item (decision T43).
  return (
    <Item
      variant="outline"
      role={isReordering ? undefined : 'button'}
      tabIndex={isReordering ? undefined : 0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      }}
      className={cn(
        // items-stretch: the installed Item centres its children, which centred short rows on phones.
        'group flex flex-col items-stretch gap-2 rounded-2xl border bg-card p-3 transition-all duration-180 md:flex-row md:items-center md:gap-4',
        !isReordering && 'cursor-pointer hover:border-primary/40 hover:shadow-xs',
        selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border/80',
        highlighted && 'ring-2 ring-primary/40',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {selecting ? (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect?.()}
            onClick={(e) => e.stopPropagation()}
            aria-label={catalogWords.selectItemAria(item.name)}
            className="size-5"
          />
        ) : null}
        {isReordering
          ? (dragHandle ?? <GripVerticalIcon className="size-5 text-muted-foreground" />)
          : null}

        <CatalogPhoto
          photoRef={item.photos[0] ?? null}
          alt=""
          size="md"
          className={cn('size-14 shrink-0 rounded-xl', soldOut && 'grayscale')}
        />

        <div className="min-w-0 flex-1 space-y-1">
          <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.name}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular">{itemPriceLabel(item)}</span>
            {meta.length > 0 ? <span className="truncate">{meta.join(' · ')}</span> : null}
          </div>
          <div className="flex flex-wrap gap-1 empty:hidden">
            <ItemStatusBadges item={item} />
          </div>
        </div>

        {isReordering ? (
          <div className="flex shrink-0 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 md:size-9"
              disabled={!canMoveUp}
              aria-label={catalogWords.moveUp}
              onClick={onMoveUp}
            >
              <ChevronUpIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 md:size-9"
              disabled={!canMoveDown}
              aria-label={catalogWords.moveDown}
              onClick={onMoveDown}
            >
              <ChevronDownIcon className="size-4" />
            </Button>
          </div>
        ) : selecting ? null : (
          <ItemMenu item={item} actions={actions} className="shrink-0 md:hidden" />
        )}
      </div>

      {/* One quick switch per row (decision T42): Sold out. Hide and Show live in the ⋯ menu. */}
      {item.status === 'archived' && !selecting ? (
        <div className="flex items-center gap-2 pl-17 md:pl-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-1.5 md:h-9"
            onClick={(e) => {
              e.stopPropagation();
              actions.restore(item);
            }}
          >
            <RotateCcwIcon className="size-4" />
            {catalogWords.restore}
          </Button>
          <ItemMenu item={item} actions={actions} className="hidden md:inline-flex" />
        </div>
      ) : !isReordering && !selecting ? (
        <div className="flex items-center gap-2 pl-17 md:pl-0">
          <LabeledSwitch
            label={catalogWords.soldOutSwitch}
            ariaLabel={catalogWords.soldOutSwitchAria(item.name)}
            checked={soldOut}
            onCheckedChange={(checked) => actions.setSoldOut(item, checked)}
          />
          <ItemMenu item={item} actions={actions} className="hidden md:inline-flex" />
        </div>
      ) : null}
    </Item>
  );
}
