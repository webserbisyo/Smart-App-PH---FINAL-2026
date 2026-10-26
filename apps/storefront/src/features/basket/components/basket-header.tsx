'use client';

import { useState } from 'react';
import { MoreHorizontalIcon, Trash2Icon } from 'lucide-react';
import { words } from '@smartapp/core';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';

export interface BasketHeaderProps {
  count: number;
  onClear: () => void;
}

// Basket header with item count, More menu (c-dropdown-menu-16) and confirm alert dialog (c-alert-dialog-2).
export function BasketHeader({ count, onClear }: BasketHeaderProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{words.basket.title}</h2>
          {count > 0 ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
              {count}
            </Badge>
          ) : null}
        </div>

        {count > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="rounded-full text-muted-foreground hover:text-foreground"
                  aria-label={words.basket.moreOptions}
                />
              }
            >
              <MoreHorizontalIcon className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2Icon className="size-4" aria-hidden="true" />
                  <span>{words.basket.clearBasket}</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {/* Pattern c-alert-dialog-2 (small size confirm) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{words.basket.clearBasketTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {words.basket.clearBasketConfirm(count)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{words.basket.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onClear();
                setConfirmOpen(false);
              }}
            >
              {words.basket.clearBasket}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
