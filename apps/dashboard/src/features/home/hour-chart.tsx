import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import { formatPeso, formatPesoShort, homeWords, type HomeHour } from '@smartapp/core';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@smartapp/ui/components/chart';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';

const W = homeWords.hours;

export interface HourChartProps {
  hours: readonly HomeHour[];
  metric: 'sales' | 'orders';
  // The hour the now line sits on, or null for a past day.
  nowHour: number | null;
  usualLabel: string;
}

/**
 * Hour by hour (H7): today's bars in blue over a usual day's in grey, with a now line. The grey bars sit on a
 * hidden second axis so the two overlap instead of standing side by side. Loaded lazily with Recharts.
 */
export default function HourChart({ hours, metric, nowHour, usualLabel }: HourChartProps) {
  const reduced = useReducedMotion();
  const config = {
    today: { label: W.today, color: 'var(--chart-1)' },
    usual: { label: usualLabel, color: 'var(--muted-foreground)' },
  } satisfies ChartConfig;
  const data = hours.map((h) => ({
    hour: h.hour,
    label: W.hourShort(h.hour),
    today: metric === 'sales' ? h.sales : h.orders,
    usual: metric === 'sales' ? h.usualSales : h.usualOrders,
  }));
  const value = (v: number) => (metric === 'sales' ? formatPeso(v) : W.ordersCount(v));
  const nowLabel = nowHour === null ? null : (data.find((d) => d.hour === nowHour)?.label ?? null);
  return (
    <ChartContainer config={config} className="aspect-auto h-52 w-full md:h-60">
      <BarChart accessibilityLayer data={data} margin={{ top: 16, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          xAxisId="today"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={8}
        />
        <XAxis xAxisId="usual" dataKey="label" hide />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          allowDecimals={metric === 'orders'}
          tickFormatter={(v: number) => (metric === 'sales' ? formatPesoShort(v) : String(v))}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => W.hour(Number(payload[0]?.payload?.hour ?? 0))}
              formatter={(v, name) => (
                <span className="flex w-full justify-between gap-3">
                  <span className="text-muted-foreground">
                    {name === 'today' ? W.today : usualLabel}
                  </span>
                  <span className="font-semibold tabular-nums">{value(Number(v))}</span>
                </span>
              )}
            />
          }
        />
        <Bar
          xAxisId="usual"
          dataKey="usual"
          fill="var(--color-usual)"
          fillOpacity={0.2}
          radius={4}
          isAnimationActive={!reduced}
          animationDuration={350}
        />
        <Bar
          xAxisId="today"
          dataKey="today"
          fill="var(--color-today)"
          radius={4}
          barSize={12}
          isAnimationActive={!reduced}
          animationDuration={350}
        />
        {nowLabel ? (
          <ReferenceLine
            xAxisId="today"
            x={nowLabel}
            stroke="var(--destructive)"
            strokeDasharray="3 3"
            label={{ value: W.now, position: 'top', fill: 'var(--destructive)', fontSize: 11 }}
          />
        ) : null}
      </BarChart>
    </ChartContainer>
  );
}
