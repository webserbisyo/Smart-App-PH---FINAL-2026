import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { actionWords, catalogWords, errorWords, type OwnerItem } from '@smartapp/core';
import { useBulkSetSoldOut, useRemoveItem, useSetItemStatus, errorCodeOf } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@smartapp/ui/components/item';
import { AsyncButton, useAsyncAction } from '@/app/async-button';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { notify } from '@smartapp/ui/compositions/notify';

export interface ItemActions {
  edit: (item: OwnerItem) => void;
  duplicate: (item: OwnerItem) => void;
  setVisible: (item: OwnerItem, visible: boolean) => void;
  setSoldOut: (item: OwnerItem, soldOut: boolean) => void;
  archive: (item: OwnerItem) => void;
  remove: (item: OwnerItem) => void;
  restore: (item: OwnerItem) => void;
}

export function isItemSoldOut(item: OwnerItem): boolean {
  return item.variants.every((v) => v.availability === 'sold_out');
}

const DAY_MS = 24 * 3600 * 1000;

function showError(err: unknown) {
  notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
}

/**
 * Every single-item action of the Menu list in one place, so the list row, the grid card and the
 * table behave the same. Render `dialogs` once next to the list.
 */
export function useItemActions(): { actions: ItemActions; dialogs: React.ReactNode } {
  const navigate = useNavigate();
  const setStatus = useSetItemStatus();
  const setSoldOutMany = useBulkSetSoldOut();
  const removeItem = useRemoveItem();
  const [soldOutTarget, setSoldOutTarget] = React.useState<OwnerItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<OwnerItem | null>(null);
  const deleteAction = useAsyncAction();

  const markSoldOut = (item: OwnerItem, soldOutUntil: string | null) => {
    setSoldOutMany.mutate(
      {
        items: item.variants.map((v) => ({
          variantId: v.id,
          availability: 'sold_out' as const,
          soldOutUntil,
        })),
      },
      { onError: showError },
    );
  };

  const actions: ItemActions = {
    edit: (item) => {
      void navigate({ to: '/catalog/$itemId', params: { itemId: item.id } });
    },
    duplicate: (item) => {
      void navigate({ to: '/catalog/new', search: { from: item.id } });
    },
    setVisible: (item, visible) => {
      const previous = item.status;
      setStatus.mutate(
        { id: item.id, status: visible ? 'active' : 'hidden' },
        {
          onError: showError,
          // The change shows on the row, but Hide is in a menu, so the toast confirms it and offers Undo.
          onSuccess: () =>
            notify({
              title: visible
                ? catalogWords.itemShown(item.name)
                : catalogWords.itemHidden(item.name),
              tone: 'success',
              action: {
                label: catalogWords.undo,
                onClick: () => setStatus.mutate({ id: item.id, status: previous }),
              },
            }),
        },
      );
    },
    setSoldOut: (item, soldOut) => {
      if (soldOut) {
        setSoldOutTarget(item);
        return;
      }
      setSoldOutMany.mutate(
        {
          items: item.variants.map((v) => ({
            variantId: v.id,
            availability: 'available' as const,
            soldOutUntil: null,
          })),
        },
        { onError: showError },
      );
    },
    archive: (item) => {
      const previous = item.status;
      setStatus.mutate(
        { id: item.id, status: 'archived' },
        {
          onError: showError,
          onSuccess: () =>
            notify({
              title: catalogWords.itemArchived(item.name),
              tone: 'success',
              action: {
                label: catalogWords.undo,
                onClick: () => setStatus.mutate({ id: item.id, status: previous }),
              },
            }),
        },
      );
    },
    remove: (item) => setDeleteTarget(item),
    // A restored item comes back hidden, so it never reaches customers by surprise (decision T43).
    restore: (item) => {
      setStatus.mutate(
        { id: item.id, status: 'hidden' },
        {
          onError: showError,
          onSuccess: () =>
            notify({
              title: catalogWords.itemRestored(item.name),
              tone: 'success',
              action: {
                label: catalogWords.showNow,
                onClick: () =>
                  setStatus.mutate({ id: item.id, status: 'active' }, { onError: showError }),
              },
            }),
        },
      );
    },
  };

  const forever = deleteTarget?.status === 'archived';
  const handleDelete = async () => {
    const target = deleteTarget;
    if (!target) return;
    try {
      await deleteAction.run(() => removeItem.mutateAsync({ id: target.id }));
      setDeleteTarget(null);
      notify({ title: catalogWords.itemDeleted(target.name), tone: 'success' });
    } catch (err: unknown) {
      setDeleteTarget(null);
      showError(err);
    }
  };

  const dialogs = (
    <>
      <ResponsiveDialog
        open={soldOutTarget !== null}
        onOpenChange={(open) => {
          if (!open) setSoldOutTarget(null);
        }}
        title={catalogWords.soldOutTitle}
        description={
          soldOutTarget && soldOutTarget.variants.length > 1
            ? `${catalogWords.soldOutDescription} ${catalogWords.soldOutAllHint}`
            : catalogWords.soldOutDescription
        }
      >
        <div className="space-y-2.5 pb-1">
          {(
            [
              ['today', catalogWords.soldOutToday, catalogWords.soldOutTodayDesc],
              [
                'indefinite',
                catalogWords.soldOutIndefinitely,
                catalogWords.soldOutIndefinitelyDesc,
              ],
            ] as const
          ).map(([choice, title, desc]) => (
            <Item
              key={choice}
              variant="outline"
              render={
                <button
                  type="button"
                  onClick={() => {
                    if (soldOutTarget) {
                      markSoldOut(
                        soldOutTarget,
                        choice === 'today' ? new Date(Date.now() + DAY_MS).toISOString() : null,
                      );
                    }
                    setSoldOutTarget(null);
                  }}
                />
              }
              className="min-h-14 w-full rounded-xl border-border/80 bg-card p-3.5 text-left hover:border-primary/50 hover:bg-muted/40"
            >
              <ItemContent>
                <ItemTitle className="font-semibold">{title}</ItemTitle>
                <ItemDescription>{desc}</ItemDescription>
              </ItemContent>
            </Item>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full md:h-9"
            onClick={() => setSoldOutTarget(null)}
          >
            {catalogWords.cancel}
          </Button>
        </div>
      </ResponsiveDialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {forever
                ? catalogWords.deleteForeverTitle(deleteTarget?.name ?? '')
                : catalogWords.deleteItemTitle(deleteTarget?.name ?? '')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {forever ? catalogWords.deleteForeverDescription : catalogWords.deleteItemDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">{catalogWords.cancel}</AlertDialogCancel>
            <AsyncButton
              variant="destructive"
              className="h-11 font-semibold md:h-9"
              status={deleteAction.status}
              busyLabel={actionWords.deleting}
              doneLabel={actionWords.deleted}
              onClick={() => void handleDelete()}
            >
              {forever ? catalogWords.deleteForever : catalogWords.delete}
            </AsyncButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return { actions, dialogs };
}
