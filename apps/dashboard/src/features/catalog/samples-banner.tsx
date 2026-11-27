import * as React from 'react';
import { SparklesIcon } from 'lucide-react';
import { actionWords, catalogWords, errorWords, type OwnerItem } from '@smartapp/core';
import { useClearSamples, errorCodeOf } from '@smartapp/data';
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
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { Notice } from '@/app/notice';
import { useShop } from '@/app/shop';

export interface SamplesBannerProps {
  items: readonly OwnerItem[];
}

// One banner for the sample menu instead of a "Sample" tag on every row (decision T42).
// Remove samples is one server call (api.md "Samples (owner)", audit F-11): the sample items, pictures and the
// categories and add-ons they leave empty go, an ordered sample is archived, and the card turns off.
const SEEN_KEY = 'smartapp.dashboard.samplesSeen';

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function SamplesBanner({ items }: SamplesBannerProps) {
  const { slug } = useShop();
  const clearSamples = useClearSamples();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const removeAction = useAsyncAction();
  // The full card shows on the first visit; after that it is one line (T93), remembered on this device.
  const [seen] = React.useState(readSeen);
  React.useEffect(() => {
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Private mode: the full card shows again next time, which is fine.
    }
  }, []);

  const samples = items.filter((item) => item.sample && item.status !== 'archived');
  if (samples.length === 0) return null;

  const handleRemove = async () => {
    try {
      await removeAction.run(() => clearSamples.mutateAsync({ slug }));
      notify({ title: catalogWords.samplesRemoved(samples.length), tone: 'success' });
      setConfirmOpen(false);
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  return (
    <>
      {seen ? (
        <div
          data-slot="samples-line"
          className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 py-1 pr-1 pl-3"
        >
          <SparklesIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 truncate text-sm font-medium">
            {catalogWords.samplesCompact(samples.length)}
          </p>
          <Button
            type="button"
            variant="ghost"
            className="h-11 shrink-0 font-semibold md:h-9"
            onClick={() => setConfirmOpen(true)}
          >
            {catalogWords.removeSamples}
          </Button>
        </div>
      ) : (
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
      )}

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
