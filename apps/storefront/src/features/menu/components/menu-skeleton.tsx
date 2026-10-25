import { words } from '@smartapp/core';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ProductCardSkeleton } from '@smartapp/ui/compositions/product-card';

/** The Menu's own shape while it loads: the glass bar, chips, category boxes of grey cards. */
export function MenuSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label={words.storefrontShell.menu.loading}
    >
      <div className="-mx-4 flex flex-col gap-2 border-b px-4 py-2 lg:mx-0 lg:flex-row lg:justify-end lg:rounded-2xl lg:border lg:px-3 lg:py-3">
        <Skeleton className="h-11 w-full rounded-full lg:max-w-md" />
        <div className="flex gap-2 overflow-hidden lg:hidden">
          <Skeleton className="h-11 w-28 shrink-0 rounded-full" />
          <Skeleton className="h-11 w-24 shrink-0 rounded-full" />
          <Skeleton className="h-11 w-32 shrink-0 rounded-full" />
          <Skeleton className="h-11 w-24 shrink-0 rounded-full" />
        </div>
      </div>

      <div className="flex items-start gap-6">
        <div className="hidden w-60 shrink-0 flex-col gap-1 rounded-2xl border p-2 lg:flex">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {[0, 1].map((box) => (
            <div key={box} className="flex flex-col gap-3 rounded-3xl bg-muted/50 p-3 lg:p-4">
              <div className="flex items-center gap-3 px-1">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-5 w-32 rounded-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {Array.from({ length: box === 0 ? 3 : 2 }, (_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
