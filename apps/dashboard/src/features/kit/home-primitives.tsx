import * as React from 'react';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { KitSection } from './kit-section.js';

// Recharts and motion load only when these sections render, like Home (T77).
const BarDemo = React.lazy(() =>
  import('./examples/evil-charts').then((m) => ({ default: m.EvilBarDemo })),
);
const AreaDemo = React.lazy(() =>
  import('./examples/evil-charts').then((m) => ({ default: m.EvilAreaDemo })),
);
const RadialDemo = React.lazy(() =>
  import('./examples/evil-charts').then((m) => ({ default: m.EvilRadialDemo })),
);

const EVIL = 'packages/ui/src/components/evilcharts/charts';

/** Home pieces on /kit: the installed evilcharts Bar, Area and Radial charts (T77). */
export function HomePrimitiveSections() {
  return (
    <>
      <KitSection
        title="evilcharts Bar chart"
        library="evilcharts (shadcn registry @evilcharts) on Recharts 3.8.0 + motion, lazy-loaded"
        path={`${EVIL}/recharts-bar-chart.tsx`}
        usedIn="Home Hour by hour: a usual day hatched beside today's gradient bars (T77)"
      >
        <React.Suspense fallback={<Skeleton className="h-56 w-full max-w-lg rounded-xl" />}>
          <BarDemo />
        </React.Suspense>
      </KitSection>
      <KitSection
        title="evilcharts Area chart"
        library="evilcharts (shadcn registry @evilcharts) on Recharts 3.8.0 + motion, lazy-loaded"
        path={`${EVIL}/recharts-area-chart.tsx`}
        usedIn="Home Last 7 or 30 days: sales as a gradient over the days before (T77)"
      >
        <React.Suspense fallback={<Skeleton className="h-56 w-full max-w-lg rounded-xl" />}>
          <AreaDemo />
        </React.Suspense>
      </KitSection>
      <KitSection
        title="evilcharts Radial chart"
        library="evilcharts (shadcn registry @evilcharts) on Recharts 3.8.0, lazy-loaded"
        path={`${EVIL}/recharts-radial-chart.tsx`}
        usedIn="Home Today ring: today against a usual day by this hour (T77)"
      >
        <React.Suspense fallback={<Skeleton className="size-48 rounded-full" />}>
          <RadialDemo />
        </React.Suspense>
      </KitSection>
    </>
  );
}
