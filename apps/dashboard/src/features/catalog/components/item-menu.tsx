import {
  ArchiveIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react';
import { catalogWords, type OwnerItem } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { cn } from 'cn';
import type { ItemActions } from './item-actions.js';

export interface ItemMenuProps {
  item: OwnerItem;
  actions: ItemActions;
  className?: string | undefined;
}

// The one "more" menu for an item, with words, on every view (list row, grid card, table).
export function ItemMenu({ item, actions, className }: ItemMenuProps) {
  const isHidden = item.status === 'hidden';
  // The menu opens in a portal, but React still bubbles its clicks to the row or card around it, which
  // would open the editor; stop them here.
  return (
    <span className="contents" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'size-11 text-muted-foreground hover:text-foreground md:size-9',
                className,
              )}
              aria-label={catalogWords.itemActionsAria(item.name)}
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <MoreHorizontalIcon className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {item.status === 'archived' ? (
            <>
              <DropdownMenuItem
                className="min-h-11 md:min-h-8"
                onClick={() => actions.restore(item)}
              >
                <RotateCcwIcon className="size-4" />
                {catalogWords.restore}
              </DropdownMenuItem>
              {/* Only an item nobody ever ordered can go for good (decision T43). */}
              {!item.hasOrders ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    className="min-h-11 md:min-h-8"
                    onClick={() => actions.remove(item)}
                  >
                    <Trash2Icon className="size-4" />
                    {catalogWords.deleteForever}
                  </DropdownMenuItem>
                </>
              ) : null}
            </>
          ) : (
            <ActiveItemMenu item={item} actions={actions} isHidden={isHidden} />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

function ActiveItemMenu({
  item,
  actions,
  isHidden,
}: {
  item: OwnerItem;
  actions: ItemActions;
  isHidden: boolean;
}) {
  return (
    <>
      <DropdownMenuItem onClick={() => actions.edit(item)}>
        <PencilIcon className="size-4" />
        {catalogWords.edit}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => actions.duplicate(item)}>
        <CopyIcon className="size-4" />
        {catalogWords.duplicate}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => actions.setVisible(item, isHidden)}>
        {isHidden ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
        {isHidden ? catalogWords.show : catalogWords.hide}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {item.hasOrders ? (
        <DropdownMenuItem onClick={() => actions.archive(item)}>
          <ArchiveIcon className="size-4" />
          {catalogWords.archive}
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem variant="destructive" onClick={() => actions.remove(item)}>
          <Trash2Icon className="size-4" />
          {catalogWords.delete}
        </DropdownMenuItem>
      )}
    </>
  );
}
