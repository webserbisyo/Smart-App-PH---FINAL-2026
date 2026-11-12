import { formatPeso } from '@smartapp/core';
import { EvilPieChart } from '@smartapp/ui/components/evilcharts/charts/recharts-pie-chart';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { ChartTip } from './chart-tip.js';

export interface DonutSlice {
  key: string;
  label: string;
  sales: number;
  // A chart colour token, "var(--chart-1)".
  color: string;
}

/**
 * Where the money came from (T83) on the installed evilcharts Pie chart as a gradient donut, the Revenue
 * Mix look. Its own tooltip prints raw centavos, so it uses Home's ChartTip. Loaded lazily with Recharts.
 */
export default function MixDonut({ slices }: { slices: readonly DonutSlice[] }) {
  const reduced = useReducedMotion();
  const data = slices.map((s) => ({ name: s.key, label: s.label, sales: s.sales }));
  const config = Object.fromEntries(
    slices.map((s) => [s.key, { label: s.label, colors: { light: [s.color] } }]),
  );
  return (
    <EvilPieChart
      data={data}
      config={config}
      dataKey="sales"
      nameKey="name"
      className="aspect-square h-full w-full"
    >
      <EvilPieChart.Pie
        innerRadius="62%"
        outerRadius="96%"
        cornerRadius={6}
        paddingAngle={3}
        pieProps={{ isAnimationActive: !reduced, animationDuration: 350 }}
      />
      <ChartTip
        rows={slices.map((s) => ({ key: s.key, label: s.label }))}
        title={(row) => String(row.label ?? '')}
        value={(v) => formatPeso(v)}
      />
    </EvilPieChart>
  );
}
