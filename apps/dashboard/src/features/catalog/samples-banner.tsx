import * as React from 'react';
import { SparklesIcon } from 'lucide-react';
import {
  actionWords,
  catalogWords,
  errorWords,
  type Category,
  type OwnerItem,
} from '@smartapp/core';
import {
  useOwnerOptionGroups,
  useRemoveCategory,
  useRemoveItem,
  useRemoveOptionGroup,
  useSetItemStatus,
  errorCodeOf,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
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
import { AsyncButton, useAsyncAction } from '@/app/async-button';
import { Notice } from '@/app/notice';

export interface SamplesBannerProps {
  items: readonly OwnerItem[];
  categories: readonly Category[];
}

// One banner for the sample menu instead of a "Sample" tag on every row (decision T42).
// Remove samples touches the menu only: the shop's look and stamp card stay.
export function SamplesBanner({ items, categories }: SamplesBannerProps) {
  const { data: groups = [] } = useOwnerOptionGroups();
  const removeItem = useRemoveItem();
  const setStatus = useSetItemStatus();
  const removeCategory = useRemoveCategory();
  const removeGroup = useRemoveOptionGroup();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const removeAction = useAsyncAction();

  const samples = items.filter((item) => item.sample && item.status !== 'archived');
  if (samples.length === 0) return null;

  const handleRemove = async () => {
    try {
      await removeAction.run(() => removeAll());
      notify({ title: catalogWords.samplesRemoved(samples.length), tone: 'success' });
      setConfirmOpen(false);
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  const removeAll = async () => {
    const sampleIds = new Set(samples.map((item) => item.id));
    // An item with past orders cannot be deleted, so it is archived instead.
    await Promise.all(
      samples.map((item) =>
        item.hasOrders
          ? setStatus.mutateAsync({ id: item.id, status: 'archived' })
          : removeItem.mutateAsync({ id: item.id }),
      ),
    );
    const remaining = items.filter((item) => !sampleIds.has(item.id) || item.hasOrders);
    const sampleCategoryIds = new Set(samples.map((item) => item.categoryId));
    const emptyCategories = categories.filter(
      (c) => sampleCategoryIds.has(c.id) && !remaining.some((item) => item.categoryId === c.id),
    );
    const keptGroupIds = new Set(
      remaining.filter((item) => !sampleIds.has(item.id)).flatMap((item) => item.optionGroupIds),
    );
    const sampleGroupIds = new Set(samples.flatMap((item) => item.optionGroupIds));
    const unusedGroups = groups.filter((g) => sampleGroupIds.has(g.id) && !keptGroupIds.has(g.id));
    await Promise.all([
      ...emptyCategories.map((c) => removeCategory.mutateAsync({ id: c.id })),
      ...unusedGroups.map((g) => removeGroup.mutateAsync({ id: g.id })),
    ]);
  };

  return (
    <>
      <Notice
        tone="brand"
        className="rounded-2xl sm:items-center md:p-4"
        icon={
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <SparklesIcon className="size-4" />
          </span>
        }
        action={
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full shrink-0 bg-card sm:w-auto md:h-9"
            onClick={() => setConfirmOpen(true)}
          >
            {catalogWords.removeSamples}
          </Button>
        }
      >
        <p className="text-sm font-semibold text-foreground">{catalogWords.samplesBannerTitle}</p>
        <p className="text-sm text-muted-foreground">
          {catalogWords.samplesBannerHint(samples.length)}
        </p>
      </Notice>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{catalogWords.removeSamplesTitle}</AlertDialogTitle>
            <AlertDialogDescription>{catalogWords.removeSamplesDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">{catalogWords.cancel}</AlertDialogCancel>
            <AsyncButton
              variant="destructive"
              status={removeAction.status}
              busyLabel={actionWords.removing}
              doneLabel={actionWords.removed}
              onClick={() => void handleRemove()}
              className="h-11 font-semibold md:h-9"
            >
              {catalogWords.removeSamples}
            </AsyncButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
