import { Area, Bar, CartesianGrid, Cell, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import {
  formatManila,
  formatPeso,
  formatPesoShort,
  homeWords,
  manilaToDate,
  type HomeTrendDay,
} from '@smartapp/core';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@smartapp/ui/components/chart';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';

const W = homeWords.trends;

export interface TrendChartProps {
  days: readonly HomeTrendDay[];
  before: readonly HomeTrendDay[];
}

function dayLabel(date: string, last: boolean, long: boolean): string {
  if (last) return W.today;
  const at = manilaToDate(date, '12:00');
  return formatManila(at, long ? 'date' : 'day');
}

/**
 * Last 7 or 30 days (H12): daily sales, with the days before as a dashed line on the same days. 7 days are
 * bars (today paler, as it isn't over); 30 days are an area. Loaded lazily with Recharts.
 */
export default function TrendChart({ days, before }: TrendChartProps) {
  const reduced = useReducedMotion();
  const long = days.length > 7;
  const config = {
    sales: { label: W.sales, color: 'var(--chart-1)' },
    before: { label: W.before, color: 'var(--muted-foreground)' },
  } satisfies ChartConfig;
  const data = days.map((d, i) => ({
    date: d.date,
    label: dayLabel(d.date, i === days.length - 1, long),
    sales: d.sales,
    orders: d.orders,
    before: before[i]?.sales ?? 0,
  }));
  const animation = { isAnimationActive: !reduced, animationDuration: 350 };
  return (
    <figure role="img" aria-label={W.chartAria(days.length)} className="m-0">
      <ChartContainer config={config} className="aspect-auto h-52 w-full md:h-60">
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={long ? 24 : 4}
            interval={long ? 'preserveStartEnd' : 0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => formatPesoShort(v)}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const date = String(payload[0]?.payload?.date ?? '');
                  return date ? formatManila(manilaToDate(date, '12:00'), 'date') : '';
                }}
                formatter={(v, name, item) => (
                  <span className="flex w-full justify-between gap-3">
                    <span className="text-muted-foreground">
                      {name === 'sales' ? W.sales : W.before}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatPeso(Number(v))}
                      {name === 'sales'
                        ? ` · ${W.tipOrders(Number(item.payload?.orders ?? 0))}`
                        : ''}
                    </span>
                  </span>
                )}
              />
            }
          />
          {long ? (
            <Area
              dataKey="sales"
              type="monotone"
              stroke="var(--color-sales)"
              strokeWidth={2}
              fill="var(--color-sales)"
              fillOpacity={0.12}
              {...animation}
            />
          ) : (
            <Bar dataKey="sales" fill="var(--color-sales)" radius={4} barSize={28} {...animation}>
              {data.map((d, i) => (
                <Cell key={d.date} fillOpacity={i === data.length - 1 ? 0.55 : 1} />
              ))}
            </Bar>
          )}
          <Line
            dataKey="before"
            type="monotone"
            stroke="var(--color-before)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            {...animation}
          />
        </ComposedChart>
      </ChartContainer>
    </figure>
  );
}
