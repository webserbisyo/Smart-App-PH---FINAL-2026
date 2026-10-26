import { Skeleton } from '@smartapp/ui/components/skeleton';

// Same size as the loaded page (c-skeleton-7 look): title, tabs and two cards.
export function OrdersSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-2 pb-6" aria-hidden="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-12 w-full rounded-full" />
      {Array.from({ length: 2 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/8 sm:p-5"
        >
          <div className="flex justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-5.5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-10 w-full rounded-2xl" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-2xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
