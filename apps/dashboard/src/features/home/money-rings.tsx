import { EvilRadialChart } from '@smartapp/ui/components/evilcharts/charts/recharts-radial-chart';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';

export interface RingSlice {
  key: string;
  // Share of the period's sales, 0 to 100.
  percent: number;
  // A chart colour token, "var(--chart-1)".
  color: string;
}

/**
 * One place's share as a ring (T84) on the installed evilcharts Radial chart: a full grey track and the
 * share in the place's own colour, the budget-ring look without ECharts. Loaded lazily with Recharts.
 */
export default function MoneyRing({ slice }: { slice: RingSlice }) {
  const reduced = useReducedMotion();
  const config = { [slice.key]: { label: slice.key, colors: { light: [slice.color] } } };
  return (
    <EvilRadialChart
      data={[{ name: slice.key, share: slice.percent }]}
      config={config}
      nameKey="name"
      max={100}
      innerRadius="78%"
      outerRadius="100%"
      className="aspect-square size-full"
    >
      <EvilRadialChart.RadialBar
        dataKey="share"
        barSize={8}
        cornerRadius={8}
        showBackground
        radialBarProps={{ isAnimationActive: !reduced, animationDuration: 350 }}
      />
    </EvilRadialChart>
  );
}
