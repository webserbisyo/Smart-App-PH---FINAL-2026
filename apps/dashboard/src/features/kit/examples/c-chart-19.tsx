import { Cell, Label, Pie, PieChart } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartapp/ui/components/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@smartapp/ui/components/chart';

// ReUI c-chart-19 (donut with the total in the middle). The drop-shadow filter and the hand-built
// tooltip rows of the original need inline styles and casts, so this copy keeps the stock tooltip.
const chartData = [
  { source: 'direct', visits: 4200 },
  { source: 'search', visits: 3600 },
  { source: 'social', visits: 2800 },
  { source: 'email', visits: 1900 },
  { source: 'referral', visits: 1400 },
];

const total = chartData.reduce((s, d) => s + d.visits, 0);

const chartConfig = {
  visits: { label: 'Visits' },
  direct: { label: 'Direct', color: 'var(--chart-1)' },
  search: { label: 'Search', color: 'var(--chart-2)' },
  social: { label: 'Social', color: 'var(--chart-3)' },
  email: { label: 'Email', color: 'var(--chart-4)' },
  referral: { label: 'Referral', color: 'var(--chart-5)' },
} satisfies ChartConfig;

export function Pattern() {
  return (
    <Card className="w-full max-w-xs">
      <CardHeader className="items-center pb-0">
        <CardTitle>Traffic Sources</CardTitle>
        <CardDescription>Where your visitors come from</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-72">
          <PieChart accessibilityLayer>
            <defs>
              {chartData.map((d) => (
                <linearGradient
                  key={d.source}
                  id={`gradient-${d.source}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={`var(--color-${d.source})`} stopOpacity={1} />
                  <stop offset="100%" stopColor={`var(--color-${d.source})`} stopOpacity={0.8} />
                </linearGradient>
              ))}
            </defs>
            <ChartTooltip content={<ChartTooltipContent nameKey="source" hideLabel />} />
            <Pie
              data={chartData}
              dataKey="visits"
              nameKey="source"
              innerRadius={65}
              outerRadius={95}
              cornerRadius={8}
              paddingAngle={4}
              stroke="var(--background)"
              strokeWidth={4}
            >
              {chartData.map((entry) => (
                <Cell key={entry.source} fill={`url(#gradient-${entry.source})`} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold tabular-nums"
                        >
                          {(total / 1000).toFixed(1)}k
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 22}
                          className="fill-muted-foreground text-xs"
                        >
                          Total Visits
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
