import * as React from 'react';
import { SparklesIcon } from 'lucide-react';
import { catalogWords, errorWords, type Category, type OwnerItem } from '@smartapp/core';
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { notify } from '@smartapp/ui/compositions/notify';

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
  const [busy, setBusy] = React.useState(false);

  const samples = items.filter((item) => item.sample && item.status !== 'archived');
  if (samples.length === 0) return null;

  const handleRemove = async () => {
    setBusy(true);
    try {
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
      const unusedGroups = groups.filter(
        (g) => sampleGroupIds.has(g.id) && !keptGroupIds.has(g.id),
      );
      await Promise.all([
        ...emptyCategories.map((c) => removeCategory.mutateAsync({ id: c.id })),
        ...unusedGroups.map((g) => removeGroup.mutateAsync({ id: g.id })),
      ]);
      notify({ title: catalogWords.samplesRemoved(samples.length), tone: 'success' });
      setConfirmOpen(false);
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center md:p-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SparklesIcon className="size-4" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-foreground">{catalogWords.samplesBannerTitle}</p>
          <p className="text-sm text-muted-foreground">
            {catalogWords.samplesBannerHint(samples.length)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-11 shrink-0 bg-card md:h-9"
        onClick={() => setConfirmOpen(true)}
      >
        {catalogWords.removeSamples}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{catalogWords.removeSamplesTitle}</AlertDialogTitle>
            <AlertDialogDescription>{catalogWords.removeSamplesDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">{catalogWords.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => void handleRemove()}
              className="h-11 bg-destructive font-semibold text-destructive-foreground hover:bg-destructive/90 md:h-9"
            >
              {busy ? catalogWords.saving : catalogWords.removeSamples}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
