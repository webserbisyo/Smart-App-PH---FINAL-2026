import { words } from '@smartapp/core';
import { Skeleton } from '@smartapp/ui/components/skeleton';

const CARD = 'rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 sm:p-6';

/** The receipt's own shape while it loads (c-skeleton-3 look): header, track, slip. */
export function ReceiptSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label={words.receipt.progress}
      className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-6"
    >
      <div className={`${CARD} flex flex-col gap-5`}>
        <div className="flex items-start gap-4">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <Skeleton className="h-6 w-3/4 rounded-sm" />
            <Skeleton className="h-4 w-full rounded-sm" />
            <div className="flex gap-1.5">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-5 border-t border-dashed pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-12 rounded-sm" />
            <Skeleton className="h-12 w-36 rounded-lg" />
            <Skeleton className="h-4 w-28 rounded-sm" />
          </div>
          <Skeleton className="size-44 self-center rounded-2xl" />
        </div>
      </div>

      <div className={`${CARD} flex flex-col gap-4`}>
        <Skeleton className="h-3 w-28 rounded-sm" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <Skeleton className="h-3 w-10 rounded-sm" />
              <Skeleton className="h-1 w-full rounded-full" />
              <Skeleton className="h-3 w-14 rounded-sm" />
            </div>
          ))}
        </div>
      </div>

      <div className={`${CARD} flex flex-col gap-3`}>
        <Skeleton className="mx-auto h-4 w-32 rounded-sm" />
        <Skeleton className="mx-auto h-3 w-40 rounded-sm" />
        <div className="my-2 border-t border-dashed" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex justify-between gap-4">
            <Skeleton className="h-4 w-40 rounded-sm" />
            <Skeleton className="h-4 w-14 rounded-sm" />
          </div>
        ))}
        <div className="my-2 border-t border-dashed" />
        <div className="flex justify-between">
          <Skeleton className="h-5 w-16 rounded-sm" />
          <Skeleton className="h-5 w-20 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
