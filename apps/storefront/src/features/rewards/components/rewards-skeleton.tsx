import { Skeleton } from '@smartapp/ui/components/skeleton';

// Sized to the loaded card (c-skeleton-9 look): title, tabs, the stamp grid and the reward.
export function RewardsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-2 pb-6" aria-hidden="true">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-12 w-full rounded-full" />
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="size-16 rounded-xl" />
        </div>
        <div className="grid grid-cols-5 justify-items-center gap-2">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="size-12 rounded-full" />
          ))}
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-3xl" />
      <Skeleton className="h-40 w-full rounded-3xl" />
    </div>
  );
}
