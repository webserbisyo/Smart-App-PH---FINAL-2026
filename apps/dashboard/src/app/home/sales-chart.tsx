import * as React from 'react';
import { ReferenceLine } from 'recharts';
import {
  formatManila,
  formatPeso,
  formatPesoShort,
  homeWords,
  manilaToDate,
  type HomeSlot,
} from '@smartapp/core';
import { evenRows, noColumns } from '@smartapp/ui/lib/chart-grid';
import { EvilBarChart } from '@smartapp/ui/components/evilcharts/charts/recharts-bar-chart';
import { ChartTip } from './chart-tip.js';

const W = homeWords;
const CONFIG = { sales: { label: W.sales.byHour, colors: { light: ['var(--chart-1)'] } } };

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

// At most this many labels under the bars. A fixed step (T110): Recharts' "preserve" spacing measures every
// label on screen, which froze Home for up to a second while the page was still changing.
const MAX_LABELS = 6;
const labelStep = (count: number) => Math.max(0, Math.ceil(count / MAX_LABELS) - 1);
// Four values on the side, and a grid line on each one, placed without measuring (T110).
const VALUE_TICKS = 4;
const GRID_ROWS = evenRows(VALUE_TICKS);

/**
 * Sales by hour (one day) or by day (T83) on the installed evilcharts Bar chart: one gradient bar per slot,
 * a now line on today, and no "usual" bars. Loaded lazily with Recharts.
 */
function SalesChart({ slots, nowHour }: SalesChartProps) {
  // Rebuilt only when the slots change, so a Home refresh with the same numbers doesn't redraw the chart.
  const data = React.useMemo(
    () =>
      slots.map((s) => ({
        label: slotLabel(s, slots.length),
        hour: s.hour,
        date: s.date,
        orders: s.orders,
        sales: s.sales,
      })),
    [slots],
  );
  const nowLabel = nowHour === null ? null : (data.find((d) => d.hour === nowHour)?.label ?? null);
  return (
    <div className="h-52 w-full md:h-60">
      <EvilBarChart
        data={data}
        config={CONFIG}
        className="aspect-auto h-full w-full"
        barRadius={6}
        barGap={2}
      >
        <EvilBarChart.Grid
          horizontalCoordinatesGenerator={GRID_ROWS}
          verticalCoordinatesGenerator={noColumns}
        />
        <EvilBarChart.XAxis dataKey="label" interval={labelStep(data.length)} />
        <EvilBarChart.YAxis
          width={44}
          interval={0}
          tickCount={VALUE_TICKS}
          tickFormatter={(v: number) => formatPesoShort(v)}
        />
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

export default React.memo(SalesChart);
