import * as React from 'react';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { KitSection } from './kit-section.js';

// Recharts loads only when this section renders, like the Members chart (T57).
const ChartPattern = React.lazy(() =>
  import('./examples/c-chart-1').then((m) => ({ default: m.Pattern })),
);

/** Members pieces on /kit: the shadcn Chart (Recharts) through the ReUI c-chart-1 bar pattern. */
export function MembersPrimitiveSections() {
  return (
    <KitSection
      title="Chart (c-chart-1 Basic bar chart)"
      library="shadcn Chart on Recharts 3.8.0 + ReUI c-chart-1, lazy-loaded"
      path="packages/ui/src/components/chart.tsx"
      usedIn="Members Card progress: members by stamps, tap a bar to filter the list (T57)"
    >
      <React.Suspense fallback={<Skeleton className="h-72 w-full max-w-md rounded-xl" />}>
        <ChartPattern />
      </React.Suspense>
    </KitSection>
  );
}
