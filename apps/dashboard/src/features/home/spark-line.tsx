import { Line, LineChart } from 'recharts';
import { ChartContainer, type ChartConfig } from '@smartapp/ui/components/chart';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';

export interface SparkLineProps {
  values: readonly number[];
  label: string;
  tone?: 'brand' | 'member';
}

/** A small line of the last 7 days under a Today tile (T69). Loaded lazily with Recharts. */
export default function SparkLine({ values, label, tone = 'brand' }: SparkLineProps) {
  const reduced = useReducedMotion();
  const config = {
    value: { label, color: tone === 'member' ? 'var(--member)' : 'var(--chart-1)' },
  } satisfies ChartConfig;
  const data = values.map((value, day) => ({ day, value }));
  return (
    <figure role="img" aria-label={label} className="m-0">
      <ChartContainer config={config} className="aspect-auto h-8 w-full">
        <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
          <Line
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reduced}
            animationDuration={350}
          />
        </LineChart>
      </ChartContainer>
    </figure>
  );
}
