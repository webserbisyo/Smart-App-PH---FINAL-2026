import * as React from 'react';
import {
  PencilIcon,
  CopyIcon,
  EyeOffIcon,
  EyeIcon,
  BanIcon,
  ArchiveIcon,
  Trash2Icon,
} from 'lucide-react';
import { catalogWords, type OwnerItem } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { ButtonGroup } from '@smartapp/ui/components/button-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@smartapp/ui/components/tooltip';
import { cn } from 'cn';

export interface ItemActionGroupProps {
  item: OwnerItem;
  onEdit: (item: OwnerItem) => void;
  onDuplicate: (item: OwnerItem) => void;
  onToggleStatus: (item: OwnerItem) => void;
  onSetSoldOut: (item: OwnerItem) => void;
  onArchive: (item: OwnerItem) => void;
  onDelete: (item: OwnerItem) => void;
  className?: string;
}

export function ItemActionGroup({
  item,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onSetSoldOut,
  onArchive,
  onDelete,
  className,
}: ItemActionGroupProps) {
  const isHidden = item.status === 'hidden';
  const isSoldOut = item.variants.every((v) => v.availability === 'sold_out');

  return (
    <ButtonGroup className={cn('items-center', className)}>
      {/* Edit */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 min-h-8 min-w-8"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              aria-label={catalogWords.edit}
            />
          }
        >
          <PencilIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent>{catalogWords.edit}</TooltipContent>
      </Tooltip>

      {/* Duplicate */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 min-h-8 min-w-8"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(item);
              }}
              aria-label={catalogWords.duplicate}
            />
          }
        >
          <CopyIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent>{catalogWords.duplicate}</TooltipContent>
      </Tooltip>

      {/* Hide or Show */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 min-h-8 min-w-8"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus(item);
              }}
              aria-label={isHidden ? catalogWords.show : catalogWords.hide}
            />
          }
        >
          {isHidden ? (
            <EyeIcon className="size-3.5 text-primary" />
          ) : (
            <EyeOffIcon className="size-3.5 text-muted-foreground" />
          )}
        </TooltipTrigger>
        <TooltipContent>{isHidden ? catalogWords.show : catalogWords.hide}</TooltipContent>
      </Tooltip>

      {/* Sold out toggle */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                'size-8 min-h-8 min-w-8',
                isSoldOut && 'border-warning/40 text-warning',
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSetSoldOut(item);
              }}
              aria-label={isSoldOut ? catalogWords.markAvailable : catalogWords.statSoldOut}
            />
          }
        >
          <BanIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent>
          {isSoldOut ? catalogWords.markAvailable : catalogWords.statSoldOut}
        </TooltipContent>
      </Tooltip>

      {/* Archive */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 min-h-8 min-w-8"
              onClick={(e) => {
                e.stopPropagation();
                onArchive(item);
              }}
              aria-label={catalogWords.archive}
            />
          }
        >
          <ArchiveIcon className="size-3.5 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>{catalogWords.archive}</TooltipContent>
      </Tooltip>

      {/* Delete (only when hasOrders is false) */}
      {!item.hasOrders && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 min-h-8 min-w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                }}
                aria-label={catalogWords.delete}
              />
            }
          >
            <Trash2Icon className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{catalogWords.delete}</TooltipContent>
        </Tooltip>
      )}
    </ButtonGroup>
  );
}
