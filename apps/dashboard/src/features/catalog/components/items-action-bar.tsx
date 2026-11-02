import {
  ArchiveIcon,
  BanIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  FolderInputIcon,
  XIcon,
} from 'lucide-react';
import { catalogWords, type Category, type OwnerItem } from '@smartapp/core';
import {
  ActionBar,
  ActionBarClose,
  ActionBarGroup,
  ActionBarItem,
  ActionBarSelection,
  ActionBarSeparator,
} from '@smartapp/ui/components/action-bar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { Button } from '@smartapp/ui/components/button';
import { isItemSoldOut } from './item-actions.js';

export interface ItemsActionBarProps {
  selected: OwnerItem[];
  categories: Category[];
  onClearSelection: () => void;
  onBulkSoldOutToday: (itemIds: string[]) => void;
  onBulkBackOn: (itemIds: string[]) => void;
  onBulkHide: (itemIds: string[]) => void;
  onBulkShow: (itemIds: string[]) => void;
  onBulkMoveCategory: (itemIds: string[], targetCategoryId: string) => void;
  onBulkArchive: (itemIds: string[]) => void;
  // Pixels from the bottom, so the bar clears the phone dock.
  sideOffset?: number | undefined;
}

const action = 'h-11 justify-start gap-1.5 text-sm font-medium whitespace-nowrap md:h-9';

// Bulk actions for the picked items. Only the actions that change something show (finding B3),
// so the bar stays one line on desktop.
export function ItemsActionBar({
  selected,
  categories,
  onClearSelection,
  onBulkSoldOutToday,
  onBulkBackOn,
  onBulkHide,
  onBulkShow,
  onBulkMoveCategory,
  onBulkArchive,
  sideOffset = 24,
}: ItemsActionBarProps) {
  const ids = selected.map((item) => item.id);
  const anyAvailable = selected.some((item) => !isItemSoldOut(item));
  const anySoldOut = selected.some(isItemSoldOut);
  const anyVisible = selected.some((item) => item.status !== 'hidden');
  const anyHidden = selected.some((item) => item.status === 'hidden');
  const moveTargets = categories.filter((c) => selected.some((item) => item.categoryId !== c.id));

  return (
    <ActionBar
      open={selected.length > 0}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClearSelection();
      }}
      side="bottom"
      sideOffset={sideOffset}
      className="w-11/12 max-w-4xl flex-wrap border-border/80 bg-card px-3 py-2 text-card-foreground shadow-xl md:w-auto md:flex-nowrap"
    >
      <ActionBarSelection className="rounded-md border-primary/20 bg-primary/10 px-2.5 py-1 font-semibold whitespace-nowrap text-primary">
        <span>{catalogWords.selectedCount(selected.length)}</span>
      </ActionBarSelection>

      <ActionBarClose
        className="ml-auto flex size-11 items-center justify-center rounded-md hover:bg-muted md:order-last md:ml-0 md:size-9"
        onClick={onClearSelection}
        aria-label={catalogWords.clearSelection}
      >
        <XIcon className="size-4" />
      </ActionBarClose>

      <ActionBarSeparator className="hidden md:order-last md:block" />

      <ActionBarGroup className="grid w-full grid-cols-2 gap-1.5 md:flex md:w-auto md:items-center">
        {anyAvailable ? (
          <ActionBarItem
            variant="secondary"
            size="sm"
            className={action}
            onClick={() => onBulkSoldOutToday(ids)}
          >
            <BanIcon className="size-4 text-warning" />
            <span>{catalogWords.bulkSoldOutToday}</span>
          </ActionBarItem>
        ) : null}
        {anySoldOut ? (
          <ActionBarItem
            variant="secondary"
            size="sm"
            className={action}
            onClick={() => onBulkBackOn(ids)}
          >
            <CheckCircle2Icon className="size-4 text-success" />
            <span>{catalogWords.bulkBackOn}</span>
          </ActionBarItem>
        ) : null}
        {anyVisible ? (
          <ActionBarItem
            variant="secondary"
            size="sm"
            className={action}
            onClick={() => onBulkHide(ids)}
          >
            <EyeOffIcon className="size-4" />
            <span>{catalogWords.bulkHide}</span>
          </ActionBarItem>
        ) : null}
        {anyHidden ? (
          <ActionBarItem
            variant="secondary"
            size="sm"
            className={action}
            onClick={() => onBulkShow(ids)}
          >
            <EyeIcon className="size-4 text-primary" />
            <span>{catalogWords.bulkShow}</span>
          </ActionBarItem>
        ) : null}
        {moveTargets.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="secondary" size="sm" className={action} />}
            >
              <FolderInputIcon className="size-4" />
              <span>{catalogWords.moveTo}</span>
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="center"
              className="max-h-72 w-56 overflow-y-auto"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>{catalogWords.bulkMoveToCategory}</DropdownMenuLabel>
                {moveTargets.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    className="min-h-11 md:min-h-8"
                    onClick={() => onBulkMoveCategory(ids, c.id)}
                  >
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <ActionBarItem
          variant="secondary"
          size="sm"
          className={action}
          onClick={() => onBulkArchive(ids)}
        >
          <ArchiveIcon className="size-4" />
          <span>{catalogWords.bulkArchive}</span>
        </ActionBarItem>
      </ActionBarGroup>
    </ActionBar>
  );
}
