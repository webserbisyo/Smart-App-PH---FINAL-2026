import { Card, CardContent } from '@smartapp/ui/components/card';
import { Skeleton } from '@smartapp/ui/components/skeleton';

/**
 * Menu loading skeleton using c-skeleton-7 / c-skeleton-8 patterns.
 */
export function MenuSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading menu">
      {/* Search and Chips Skeleton */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
        <div className="flex gap-2 overflow-hidden py-1">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>

      {/* Grid Skeleton: 2 cols on mobile, 3 cols on desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border-border bg-card">
            <Skeleton className="aspect-square w-full" />
            <CardContent className="flex flex-col gap-2 p-3">
              <Skeleton className="h-4 w-3/4 rounded-sm" />
              <Skeleton className="h-3 w-1/2 rounded-sm" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-4 w-16 rounded-sm" />
                <Skeleton className="size-8 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
