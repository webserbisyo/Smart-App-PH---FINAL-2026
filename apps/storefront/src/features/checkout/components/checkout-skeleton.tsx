import { words } from '@smartapp/core';
import { Skeleton } from '@smartapp/ui/components/skeleton';

const CARD =
  'flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 sm:p-6';

function StepHead() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="size-8 rounded-full" />
      <Skeleton className="h-5 w-36 rounded-sm" />
    </div>
  );
}

/** Pattern c-skeleton-4: the checkout's own shape while it loads. */
export function CheckoutSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label={words.checkout.title}
      className="mx-auto flex w-full max-w-160 flex-col gap-4 pt-2 pb-40"
    >
      <Skeleton className="h-11 w-32 rounded-full" />
      <Skeleton className="h-8 w-40 rounded-md" />
      <div className="flex min-h-16 items-center gap-3 rounded-3xl bg-card px-4 py-3 ring-1 ring-foreground/8">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="h-4 w-40 rounded-sm" />
      </div>
      <div className={CARD}>
        <StepHead />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
      <div className={CARD}>
        <StepHead />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className={CARD}>
        <StepHead />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}
