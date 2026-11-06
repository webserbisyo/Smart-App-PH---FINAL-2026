import { EvilRadialChart } from '@smartapp/ui/components/evilcharts/charts/recharts-radial-chart';

export interface TodayRingProps {
  sales: number;
  usualByNow: number;
  usualDay: number;
  todayLabel: string;
  usualLabel: string;
}

/**
 * Today's ring (T77): the outer ring is today's sales, the inner ring a usual day by this hour, both out of
 * a usual whole day, on the installed evilcharts Radial chart. Loaded lazily with Recharts.
 */
export default function TodayRing({
  sales,
  usualByNow,
  usualDay,
  todayLabel,
  usualLabel,
}: TodayRingProps) {
  // Inner row first: Recharts draws the first row closest to the middle.
  const data = [
    { name: 'usual', value: usualByNow },
    { name: 'today', value: sales },
  ];
  const config = {
    // A softer grey than the axis words, so today's ring leads.
    usual: {
      label: usualLabel,
      colors: { light: ['color-mix(in oklab, var(--muted-foreground) 45%, transparent)'] },
    },
    today: { label: todayLabel, colors: { light: ['var(--chart-1)'] } },
  };
  return (
    <EvilRadialChart
      data={data}
      config={config}
      nameKey="name"
      max={Math.max(usualDay, sales, 1)}
      innerRadius="62%"
      outerRadius="100%"
      className="aspect-square size-full"
    >
      <EvilRadialChart.RadialBar dataKey="value" barSize={12} cornerRadius={8} />
    </EvilRadialChart>
  );
}
