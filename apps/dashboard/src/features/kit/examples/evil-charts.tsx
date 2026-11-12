import { EvilAreaChart } from '@smartapp/ui/components/evilcharts/charts/recharts-area-chart';
import { EvilBarChart } from '@smartapp/ui/components/evilcharts/charts/recharts-bar-chart';
import { EvilPieChart } from '@smartapp/ui/components/evilcharts/charts/recharts-pie-chart';
import { EvilRadialChart } from '@smartapp/ui/components/evilcharts/charts/recharts-radial-chart';

// Kit sample numbers only (pesos), shaped like Home's (T77).
const HOURS = [
  { label: '11a', usual: 2400, today: 3100 },
  { label: '12p', usual: 6800, today: 5200 },
  { label: '1p', usual: 7400, today: 8100 },
  { label: '2p', usual: 2100, today: 1600 },
  { label: '5p', usual: 3900, today: 4400 },
  { label: '6p', usual: 7100, today: 6300 },
  { label: '7p', usual: 6200, today: 0 },
];
const DAYS = [
  { label: 'Sat', before: 44000, sales: 66000 },
  { label: 'Sun', before: 47000, sales: 29000 },
  { label: 'Mon', before: 29000, sales: 33000 },
  { label: 'Tue', before: 33000, sales: 45000 },
  { label: 'Wed', before: 52000, sales: 29000 },
  { label: 'Thu', before: 25000, sales: 51000 },
  { label: 'Today', before: 56000, sales: 56000 },
];
const RING = [
  { name: 'usual', value: 49600 },
  { name: 'today', value: 56500 },
];
const MIX = [
  { name: 'pickup', sales: 18200 },
  { name: 'walk_in', sales: 12400 },
  { name: 'delivery', sales: 6900 },
];
const grey = 'color-mix(in oklab, var(--muted-foreground) 45%, transparent)';

/** evilcharts Bar: a usual day hatched beside today's gradient bars. */
export function EvilBarDemo() {
  return (
    <div className="h-56 w-full max-w-lg">
      <EvilBarChart
        data={HOURS}
        config={{
          usual: { label: 'A usual Friday', colors: { light: ['var(--muted-foreground)'] } },
          today: { label: 'Today', colors: { light: ['var(--chart-1)'] } },
        }}
        className="aspect-auto h-full w-full"
        barRadius={6}
      >
        <EvilBarChart.Grid />
        <EvilBarChart.XAxis dataKey="label" />
        <EvilBarChart.YAxis width={44} />
        <EvilBarChart.Legend />
        <EvilBarChart.Bar dataKey="usual" variant="hatched" />
        <EvilBarChart.Bar dataKey="today" variant="gradient" />
      </EvilBarChart>
    </div>
  );
}

/** evilcharts Area: sales as a gradient over the days before, dotted. */
export function EvilAreaDemo() {
  return (
    <div className="h-56 w-full max-w-lg">
      <EvilAreaChart
        data={DAYS}
        config={{
          before: { label: 'Days before', colors: { light: ['var(--muted-foreground)'] } },
          sales: { label: 'Sales', colors: { light: ['var(--chart-1)'] } },
        }}
        className="aspect-auto h-full w-full"
        curveType="monotone"
        chartProps={{ margin: { top: 8, right: 16, left: 0, bottom: 0 } }}
      >
        <EvilAreaChart.Grid />
        <EvilAreaChart.XAxis dataKey="label" />
        <EvilAreaChart.YAxis width={44} />
        <EvilAreaChart.Legend />
        <EvilAreaChart.Area dataKey="before" variant="dotted" />
        <EvilAreaChart.Area dataKey="sales" variant="gradient" strokeVariant="solid" />
      </EvilAreaChart>
    </div>
  );
}

/** evilcharts Radial: today (outer) against a usual day by now (inner), out of a usual whole day. */
export function EvilRadialDemo() {
  return (
    <div className="size-48">
      <EvilRadialChart
        data={RING}
        config={{
          usual: { label: 'Usual by now', colors: { light: [grey] } },
          today: { label: 'Today', colors: { light: ['var(--chart-1)'] } },
        }}
        nameKey="name"
        max={57500}
        innerRadius="62%"
        outerRadius="100%"
        className="aspect-square size-full"
      >
        <EvilRadialChart.RadialBar dataKey="value" barSize={12} cornerRadius={8} />
      </EvilRadialChart>
    </div>
  );
}

/** evilcharts Pie: a gradient donut, Home's "Where the money came from" (T83). */
export function EvilPieDemo() {
  return (
    <div className="size-48">
      <EvilPieChart
        data={MIX}
        config={{
          pickup: { label: 'Pickup', colors: { light: ['var(--chart-1)'] } },
          walk_in: { label: 'Walk-in', colors: { light: ['var(--chart-2)'] } },
          delivery: { label: 'Delivery', colors: { light: ['var(--chart-3)'] } },
        }}
        dataKey="sales"
        nameKey="name"
        className="aspect-square size-full"
      >
        <EvilPieChart.Pie innerRadius="62%" outerRadius="96%" cornerRadius={6} paddingAngle={3} />
        <EvilPieChart.Tooltip />
      </EvilPieChart>
    </div>
  );
}
