import * as React from 'react';
import {
  BanIcon,
  CheckCircle2Icon,
  EyeOffIcon,
  EyeIcon,
  FolderInputIcon,
  ArchiveIcon,
  XIcon,
} from 'lucide-react';
import { catalogWords, type Category } from '@smartapp/core';
import {
  ActionBar,
  ActionBarClose,
  ActionBarGroup,
  ActionBarItem,
  ActionBarSelection,
  ActionBarSeparator,
} from '@smartapp/ui/components/action-bar';
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@smartapp/ui/components/select';
import { Button } from '@smartapp/ui/components/button';

export interface ItemsActionBarProps {
  selectedIds: string[];
  categories: Category[];
  onClearSelection: () => void;
  onBulkSoldOutToday: (itemIds: string[]) => void;
  onBulkBackOn: (itemIds: string[]) => void;
  onBulkHide: (itemIds: string[]) => void;
  onBulkShow: (itemIds: string[]) => void;
  onBulkMoveCategory: (itemIds: string[], targetCategoryId: string) => void;
  onBulkArchive: (itemIds: string[]) => void;
}

export function ItemsActionBar({
  selectedIds,
  categories,
  onClearSelection,
  onBulkSoldOutToday,
  onBulkBackOn,
  onBulkHide,
  onBulkShow,
  onBulkMoveCategory,
  onBulkArchive,
}: ItemsActionBarProps) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [selectedCatId, setSelectedCatId] = React.useState<string | null>(null);

  const open = selectedIds.length > 0;

  const handleMoveConfirm = () => {
    if (selectedCatId) {
      onBulkMoveCategory(selectedIds, selectedCatId);
      setPopoverOpen(false);
      setSelectedCatId(null);
    }
  };

  return (
    <ActionBar
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClearSelection();
      }}
      side="bottom"
      sideOffset={24}
      className="mx-4 max-w-full flex-wrap border-border/80 bg-card px-3 py-2 text-card-foreground shadow-xl"
    >
      <ActionBarSelection className="rounded-md border-primary/20 bg-primary/10 px-2.5 py-1 font-semibold text-primary">
        <span>{catalogWords.selectedCount(selectedIds.length)}</span>
      </ActionBarSelection>

      <ActionBarSeparator />

      <ActionBarGroup className="flex flex-wrap items-center gap-1.5">
        {/* Sold out today */}
        <ActionBarItem
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium"
          onClick={() => onBulkSoldOutToday(selectedIds)}
        >
          <BanIcon className="size-3.5 text-warning" />
          <span>{catalogWords.bulkSoldOutToday}</span>
        </ActionBarItem>

        {/* Back on */}
        <ActionBarItem
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium"
          onClick={() => onBulkBackOn(selectedIds)}
        >
          <CheckCircle2Icon className="size-3.5 text-success" />
          <span>{catalogWords.bulkBackOn}</span>
        </ActionBarItem>

        {/* Hide */}
        <ActionBarItem
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium"
          onClick={() => onBulkHide(selectedIds)}
        >
          <EyeOffIcon className="size-3.5" />
          <span>{catalogWords.bulkHide}</span>
        </ActionBarItem>

        {/* Show */}
        <ActionBarItem
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium"
          onClick={() => onBulkShow(selectedIds)}
        >
          <EyeIcon className="size-3.5 text-primary" />
          <span>{catalogWords.bulkShow}</span>
        </ActionBarItem>

        {/* Move to category (select in a popover) */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium"
              />
            }
          >
            <FolderInputIcon className="size-3.5" />
            <span>{catalogWords.bulkMoveToCategory}</span>
          </PopoverTrigger>
          <PopoverContent align="center" side="top" className="w-64 gap-3 p-3">
            <span className="text-xs font-semibold text-foreground">
              {catalogWords.selectCategory}
            </span>
            <Select
              value={selectedCatId ?? ''}
              onValueChange={(val) => setSelectedCatId(val ?? null)}
            >
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder={catalogWords.selectCategory} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPopoverOpen(false)}
              >
                {catalogWords.cancel}
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={!selectedCatId}
                className="h-7 text-xs"
                onClick={handleMoveConfirm}
              >
                {catalogWords.confirm}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Archive */}
        <ActionBarItem
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium"
          onClick={() => onBulkArchive(selectedIds)}
        >
          <ArchiveIcon className="size-3.5" />
          <span>{catalogWords.bulkArchive}</span>
        </ActionBarItem>
      </ActionBarGroup>

      <ActionBarSeparator />

      <ActionBarClose
        className="flex size-7 min-w-7 items-center justify-center rounded-md p-1 hover:bg-muted"
        onClick={onClearSelection}
        aria-label="Clear selection"
      >
        <XIcon className="size-3.5" />
      </ActionBarClose>
    </ActionBar>
  );
}
