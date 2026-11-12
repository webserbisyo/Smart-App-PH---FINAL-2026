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
const PieDemo = React.lazy(() =>
  import('./examples/evil-charts').then((m) => ({ default: m.EvilPieDemo })),
);
const RadialDemo = React.lazy(() =>
  import('./examples/evil-charts').then((m) => ({ default: m.EvilRadialDemo })),
);

const EVIL = 'packages/ui/src/components/evilcharts/charts';

/** Home pieces on /kit: the installed evilcharts Bar, Area, Pie and Radial charts (T77, T83). */
export function HomePrimitiveSections() {
  return (
    <>
      <KitSection
        title="evilcharts Bar chart"
        library="evilcharts (shadcn registry @evilcharts) on Recharts 3.8.0 + motion, lazy-loaded"
        path={`${EVIL}/recharts-bar-chart.tsx`}
        usedIn="Home Sales by hour or by day: one gradient bar per slot with a now line (T83)"
      >
        <React.Suspense fallback={<Skeleton className="h-56 w-full max-w-lg rounded-xl" />}>
          <BarDemo />
        </React.Suspense>
      </KitSection>
      <KitSection
        title="evilcharts Area chart"
        library="evilcharts (shadcn registry @evilcharts) on Recharts 3.8.0 + motion, lazy-loaded"
        path={`${EVIL}/recharts-area-chart.tsx`}
        usedIn="Not on a screen since T83 (Home no longer compares periods); kept for Insights in Blueprint B"
      >
        <React.Suspense fallback={<Skeleton className="h-56 w-full max-w-lg rounded-xl" />}>
          <AreaDemo />
        </React.Suspense>
      </KitSection>
      <KitSection
        title="evilcharts Pie chart"
        library="evilcharts (shadcn registry @evilcharts) on Recharts 3.8.0 + motion, lazy-loaded"
        path={`${EVIL}/recharts-pie-chart.tsx`}
        usedIn="Not on a screen since T84 (Home money cards moved to rings); kept on the kit"
      >
        <React.Suspense fallback={<Skeleton className="size-48 rounded-full" />}>
          <PieDemo />
        </React.Suspense>
      </KitSection>
      <KitSection
        title="evilcharts Radial chart"
        library="evilcharts (shadcn registry @evilcharts) on Recharts 3.8.0, lazy-loaded"
        path={`${EVIL}/recharts-radial-chart.tsx`}
        usedIn="Home Sales (one ring per place money lands: drawer, GCash, Maya, each bank) and Where the money came from (T84)"
      >
        <React.Suspense fallback={<Skeleton className="size-48 rounded-full" />}>
          <RadialDemo />
        </React.Suspense>
      </KitSection>
    </>
  );
}
