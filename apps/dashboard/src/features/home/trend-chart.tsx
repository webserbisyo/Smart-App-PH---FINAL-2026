import {
  formatManila,
  formatPeso,
  formatPesoShort,
  homeWords,
  manilaToDate,
  type HomeTrendDay,
} from '@smartapp/core';
import { EvilAreaChart } from '@smartapp/ui/components/evilcharts/charts/recharts-area-chart';
import { ChartTip } from './chart-tip.js';

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
 * Last 7 or 30 days (H12, T77): daily sales as a gradient area on the installed evilcharts Area chart, with
 * the days before as a dotted area behind it. The chart skips its intro for reduced motion by itself.
 */
export default function TrendChart({ days, before }: TrendChartProps) {
  const long = days.length > 7;
  const data = days.map((d, i) => ({
    date: d.date,
    label: dayLabel(d.date, i === days.length - 1, long),
    before: before[i]?.sales ?? 0,
    sales: d.sales,
    orders: d.orders,
  }));
  const config = {
    before: { label: W.before, colors: { light: ['var(--muted-foreground)'] } },
    sales: { label: W.sales, colors: { light: ['var(--chart-1)'] } },
  };
  return (
    <figure role="img" aria-label={W.chartAria(days.length)} className="m-0 h-52 md:h-60">
      <EvilAreaChart
        data={data}
        config={config}
        className="aspect-auto h-full w-full"
        curveType="monotone"
        // Room on the right so the last label, Today, isn't cut.
        chartProps={{ margin: { top: 8, right: 16, left: 0, bottom: 0 } }}
      >
        <EvilAreaChart.Grid />
        <EvilAreaChart.XAxis
          dataKey="label"
          minTickGap={long ? 24 : 4}
          interval={long ? 'preserveStartEnd' : 0}
        />
        <EvilAreaChart.YAxis width={44} tickFormatter={(v: number) => formatPesoShort(v)} />
        <ChartTip
          rows={[
            { key: 'sales', label: W.sales },
            { key: 'before', label: W.before },
          ]}
          title={(row) => {
            const date = String(row.date ?? '');
            return date ? formatManila(manilaToDate(date, '12:00'), 'date') : '';
          }}
          value={(v, key, row) =>
            key === 'sales'
              ? `${formatPeso(v)} · ${W.tipOrders(Number(row.orders ?? 0))}`
              : formatPeso(v)
          }
        />
        <EvilAreaChart.Area dataKey="before" variant="dotted" />
        <EvilAreaChart.Area dataKey="sales" variant="gradient" strokeVariant="solid">
          <EvilAreaChart.ActiveDot variant="colored-border" />
        </EvilAreaChart.Area>
      </EvilAreaChart>
    </figure>
  );
}
