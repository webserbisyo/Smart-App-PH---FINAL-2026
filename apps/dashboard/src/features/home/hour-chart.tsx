import { ReferenceLine } from 'recharts';
import { formatPeso, formatPesoShort, homeWords, type HomeHour } from '@smartapp/core';
import { EvilBarChart } from '@smartapp/ui/components/evilcharts/charts/recharts-bar-chart';
import { ChartTip } from './chart-tip.js';

const W = homeWords.hours;

export interface HourChartProps {
  hours: readonly HomeHour[];
  metric: 'sales' | 'orders';
  // The hour the now line sits on, or null for a past day.
  nowHour: number | null;
  usualLabel: string;
  todayLabel: string;
}

/**
 * Hour by hour (H7, T77): a usual day as hatched bars beside today's in a brand gradient, on the installed
 * evilcharts Bar chart, with a now line. Loaded lazily with Recharts.
 */
export default function HourChart({
  hours,
  metric,
  nowHour,
  usualLabel,
  todayLabel,
}: HourChartProps) {
  const data = hours.map((h) => ({
    hour: h.hour,
    label: W.hourShort(h.hour),
    usual: metric === 'sales' ? h.usualSales : h.usualOrders,
    today: metric === 'sales' ? h.sales : h.orders,
  }));
  const config = {
    usual: { label: usualLabel, colors: { light: ['var(--muted-foreground)'] } },
    today: { label: todayLabel, colors: { light: ['var(--chart-1)'] } },
  };
  const nowLabel = nowHour === null ? null : (data.find((d) => d.hour === nowHour)?.label ?? null);
  // A box of its own: the chart grows with flex-1, which would shrink it to nothing inside the card.
  return (
    <div className="h-52 w-full md:h-60">
      <EvilBarChart
        data={data}
        config={config}
        className="aspect-auto h-full w-full"
        barRadius={6}
        barGap={2}
      >
        <EvilBarChart.Grid />
        <EvilBarChart.XAxis dataKey="label" />
        <EvilBarChart.YAxis
          width={44}
          allowDecimals={metric === 'orders'}
          tickFormatter={(v: number) => (metric === 'sales' ? formatPesoShort(v) : String(v))}
        />
        <ChartTip
          rows={[
            { key: 'today', label: todayLabel },
            { key: 'usual', label: usualLabel },
          ]}
          title={(row) => W.hour(Number(row.hour ?? 0))}
          value={(v) => (metric === 'sales' ? formatPeso(v) : W.ordersCount(v))}
        />
        <EvilBarChart.Bar dataKey="usual" variant="hatched" />
        <EvilBarChart.Bar dataKey="today" variant="gradient" />
        {nowLabel ? (
          <ReferenceLine
            x={nowLabel}
            stroke="var(--destructive)"
            strokeDasharray="3 3"
            label={{ value: W.now, position: 'top', fill: 'var(--destructive)', fontSize: 11 }}
          />
        ) : null}
      </EvilBarChart>
    </div>
  );
}
