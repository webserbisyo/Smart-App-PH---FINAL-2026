import * as React from 'react';
import { StampIcon, UserPlusIcon } from 'lucide-react';
import { AnimatedList } from '@smartapp/ui/components/animated-list';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { KitSection } from './kit-section.js';

// Recharts loads only when these sections render, like the Members charts (T57, T63).
const ChartPattern = React.lazy(() =>
  import('./examples/c-chart-1').then((m) => ({ default: m.Pattern })),
);
const DonutPattern = React.lazy(() =>
  import('./examples/c-chart-19').then((m) => ({ default: m.Pattern })),
);

const FEED = [
  { id: 'a', icon: <UserPlusIcon />, text: 'Yeng Morales joined', at: '1:15 PM' },
  { id: 'b', icon: <StampIcon />, text: 'Rico Bautista got a stamp', at: '2:02 PM' },
  { id: 'c', icon: <StampIcon />, text: 'Paolo Mendoza got a stamp', at: '2:41 PM' },
  { id: 'd', icon: <StampIcon />, text: 'Liza Garcia got a stamp', at: '3:10 PM' },
];

function FeedDemo() {
  const [run, setRun] = React.useState(0);
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <AnimatedList key={run} delay={350} className="items-stretch gap-1.5">
        {FEED.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-3 rounded-lg bg-muted/60 px-2.5 py-2 text-sm"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-success-soft text-success-text [&_svg]:size-3.5">
              {f.icon}
            </span>
            <span className="flex-1">{f.text}</span>
            <span className="text-xs text-muted-foreground">{f.at}</span>
          </div>
        ))}
      </AnimatedList>
      <Button variant="outline" className="self-start" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
    </div>
  );
}

/** Members pieces on /kit: the shadcn Chart (Recharts) patterns and Magic UI Animated List. */
export function MembersPrimitiveSections() {
  return (
    <>
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
      <KitSection
        title="Chart (c-chart-19 Donut with total)"
        library="shadcn Chart on Recharts 3.8.0 + ReUI c-chart-19, lazy-loaded"
        path="apps/dashboard/src/features/kit/examples/c-chart-19.tsx"
        usedIn="Members Member sales: members against guests with the share in the middle (T63)"
      >
        <React.Suspense fallback={<Skeleton className="h-72 w-full max-w-xs rounded-xl" />}>
          <DonutPattern />
        </React.Suspense>
      </KitSection>
      <KitSection
        title="Animated List"
        library="Magic UI"
        path="packages/ui/src/components/animated-list.tsx"
        usedIn="Members Latest at the counter (T63) and Home Needs you (T83): rows slide in one after another; a plain list under reduced motion"
      >
        <FeedDemo />
      </KitSection>
    </>
  );
}
