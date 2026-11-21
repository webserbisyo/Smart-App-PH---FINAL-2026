import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { membersWords } from '@smartapp/core';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@smartapp/ui/components/chart';
import { evenRows, noColumns } from '@smartapp/ui/lib/chart-grid';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';

// Five values on the side, a grid line on each, placed without measuring (T110).
const VALUE_TICKS = 5;
const GRID_ROWS = evenRows(VALUE_TICKS);

const W = membersWords.chart;

const config = {
  members: { label: W.series, color: 'var(--chart-1)' },
} satisfies ChartConfig;

export interface ProgressChartProps {
  // progress[i] = members with i stamps; the last bar is everyone at or over the goal.
  progress: readonly number[];
  goal: number;
  selected: number | null;
  onPick: (stamps: number | null) => void;
}

/**
 * Card progress (T57, ReUI c-chart-1 look on shadcn Chart): one bar per stamp count, the ready bar in the
 * members colour. Tapping a bar filters the list to those members; tapping it again clears it. Loaded
 * lazily so Recharts stays out of the first load.
 */
export default function ProgressChart({ progress, goal, selected, onPick }: ProgressChartProps) {
  const reduced = useReducedMotion();
  const data = progress.map((members, stamps) => ({
    stamps,
    label: stamps >= goal ? W.ready : String(stamps),
    members,
  }));
  const ready = progress[goal] ?? 0;
  const most = data.slice(0, goal).reduce((a, b) => (b.members > a.members ? b : a), {
    stamps: 0,
    label: '0',
    members: 0,
  });

  return (
    <figure className="flex flex-col gap-1">
      <ChartContainer config={config} className="aspect-auto h-40 w-full md:h-44">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            horizontalCoordinatesGenerator={GRID_ROWS}
            verticalCoordinatesGenerator={noColumns}
          />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
          {/* interval 0: no on-screen label measuring (T110). */}
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={48}
            interval={0}
            tickCount={VALUE_TICKS}
            // A top that splits into whole steps, so every grid line sits on a whole number.
            domain={[
              0,
              (most: number) =>
                Math.max(VALUE_TICKS - 1, Math.ceil(most / (VALUE_TICKS - 1)) * (VALUE_TICKS - 1)),
            ]}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_, payload) => {
                  const stamps = Number(payload[0]?.payload?.stamps ?? 0);
                  return W.bar(stamps, goal);
                }}
                formatter={(value) => W.count(Number(value))}
              />
            }
          />
          <Bar
            // Grows in under 400 ms, off under reduced motion (T110).
            isAnimationActive={!reduced}
            animationDuration={350}
            dataKey="members"
            radius={6}
            className="cursor-pointer"
            onClick={(_, index) => onPick(selected === index ? null : index)}
          >
            {data.map((d) => (
              <Cell
                key={d.stamps}
                fill={d.stamps >= goal ? 'var(--chart-3)' : 'var(--color-members)'}
                fillOpacity={selected === null || selected === d.stamps ? 1 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <figcaption className="sr-only">{W.summary(most.stamps, most.members, ready)}</figcaption>
    </figure>
  );
}
