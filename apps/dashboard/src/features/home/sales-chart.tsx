import { ReferenceLine } from 'recharts';
import {
  formatManila,
  formatPeso,
  formatPesoShort,
  homeWords,
  manilaToDate,
  type HomeSlot,
} from '@smartapp/core';
import { EvilBarChart } from '@smartapp/ui/components/evilcharts/charts/recharts-bar-chart';
import { ChartTip } from './chart-tip.js';

const W = homeWords;

export interface SalesChartProps {
  slots: readonly HomeSlot[];
  // The hour the now line sits on (today only), or null.
  nowHour: number | null;
}

function slotLabel(slot: HomeSlot, days: number): string {
  if (slot.hour !== null) return W.hours.hourShort(slot.hour);
  const date = manilaToDate(slot.date, '12:00');
  // A week reads best with the weekday; a month only fits the day of the month.
  return days <= 7
    ? formatManila(date, 'date').split(' ').slice(0, 2).join(' ')
    : slot.date.slice(8).replace(/^0/, '');
}

/**
 * Sales by hour (one day) or by day (T83) on the installed evilcharts Bar chart: one gradient bar per slot,
 * a now line on today, and no "usual" bars. Loaded lazily with Recharts.
 */
export default function SalesChart({ slots, nowHour }: SalesChartProps) {
  const data = slots.map((s) => ({
    label: slotLabel(s, slots.length),
    hour: s.hour,
    date: s.date,
    orders: s.orders,
    sales: s.sales,
  }));
  const config = { sales: { label: W.sales.byHour, colors: { light: ['var(--chart-1)'] } } };
  const nowLabel = nowHour === null ? null : (data.find((d) => d.hour === nowHour)?.label ?? null);
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
        <EvilBarChart.XAxis dataKey="label" interval="preserveStartEnd" minTickGap={8} />
        <EvilBarChart.YAxis width={44} tickFormatter={(v: number) => formatPesoShort(v)} />
        <ChartTip
          rows={[{ key: 'sales', label: W.money.title }]}
          title={(row) => {
            const orders = W.sales.tipOrders(Number(row.orders ?? 0));
            const when =
              typeof row.hour === 'number'
                ? W.hours.hour(row.hour)
                : formatManila(manilaToDate(String(row.date), '12:00'), 'date');
            return `${when} · ${orders}`;
          }}
          value={(v) => formatPeso(v)}
        />
        <EvilBarChart.Bar dataKey="sales" variant="gradient" />
        {nowLabel ? (
          <ReferenceLine
            x={nowLabel}
            stroke="var(--destructive)"
            strokeDasharray="3 3"
            label={{
              value: W.sales.now,
              position: 'top',
              fill: 'var(--destructive)',
              fontSize: 11,
            }}
          />
        ) : null}
      </EvilBarChart>
    </div>
  );
}
