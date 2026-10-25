import { Skeleton } from '@smartapp/ui/components/skeleton';

/** Pattern c-skeleton-4: Checkout page loading state. */
export function CheckoutSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-160 flex-col gap-6 py-4">
      {/* Back button skeleton */}
      <Skeleton className="h-4 w-28" />

      {/* Summary card skeleton */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>

      {/* How card skeleton */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
        <Skeleton className="h-6 w-44" />
      </div>

      {/* Who card skeleton */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>

      {/* Pay card skeleton */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-4 w-28" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>

      {/* Place order button skeleton */}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
