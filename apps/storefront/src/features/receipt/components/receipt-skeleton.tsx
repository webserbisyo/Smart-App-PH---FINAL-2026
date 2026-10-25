import { Skeleton } from '@smartapp/ui/components/skeleton';

export function ReceiptSkeleton() {
  return (
    <div className="animate-in fade-in-50 mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      {/* Header skeleton */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border bg-card p-5 sm:flex-row">
        <div className="flex w-full flex-col gap-2 sm:w-1/2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="size-28 rounded-lg" />
      </div>

      {/* Status track skeleton */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-3">
            <Skeleton className="size-6 rounded-full" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="size-6 rounded-full" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="size-6 rounded-full" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Slip skeleton */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
        <div className="flex flex-col items-center gap-1.5 py-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="my-2 border-t border-dashed" />
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
        <div className="my-2 border-t border-dashed" />
        <div className="flex justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  );
}
