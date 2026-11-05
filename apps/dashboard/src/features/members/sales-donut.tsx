import { Cell, Label, Pie, PieChart } from 'recharts';
import { formatPeso, membersWords, sharePercent, type MemberSales } from '@smartapp/core';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@smartapp/ui/components/chart';

const W = membersWords.sales;

const config = {
  amount: { label: W.title },
  members: { label: W.members, color: 'var(--chart-2)' },
  guests: { label: W.guests, color: 'var(--chart-5)' },
} satisfies ChartConfig;

const average = (total: number, orders: number): number =>
  orders > 0 ? Math.round(total / orders) : 0;

/**
 * Member sales donut (T63, ReUI c-chart-19 look on shadcn Chart): members against guests, the members'
 * share in the middle, and the two amounts with their average order beside it. Loaded lazily.
 */
export default function SalesDonut({ sales }: { sales: MemberSales }) {
  const total = sales.members + sales.guests;
  const share = sharePercent(sales.members, total);
  const memberAvg = formatPeso(average(sales.members, sales.memberOrders));
  const guestAvg = formatPeso(average(sales.guests, sales.guestOrders));
  if (total === 0) return <p className="text-sm text-muted-foreground">{W.empty}</p>;
  const data = [
    { who: 'members', amount: sales.members, fill: 'var(--color-members)' },
    { who: 'guests', amount: sales.guests, fill: 'var(--color-guests)' },
  ];
  const rows = [
    {
      who: 'members',
      label: W.members,
      amount: sales.members,
      orders: sales.memberOrders,
      avg: memberAvg,
      dot: 'bg-chart-2',
    },
    {
      who: 'guests',
      label: W.guests,
      amount: sales.guests,
      orders: sales.guestOrders,
      avg: guestAvg,
      dot: 'bg-chart-5',
    },
  ];
  return (
    <figure className="flex flex-col items-center gap-3">
      <ChartContainer config={config} className="aspect-square h-40 shrink-0">
        <PieChart accessibilityLayer>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="who"
                hideLabel
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-3">
                    <span className="text-muted-foreground">
                      {name === 'members' ? W.members : W.guests}
                    </span>
                    <span className="font-semibold tabular-nums">{formatPeso(Number(value))}</span>
                  </span>
                )}
              />
            }
          />
          <Pie
            data={data}
            dataKey="amount"
            nameKey="who"
            innerRadius={50}
            outerRadius={72}
            cornerRadius={6}
            paddingAngle={3}
            stroke="var(--card)"
            strokeWidth={3}
          >
            {data.map((d) => (
              <Cell key={d.who} fill={d.fill} />
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
                        className="fill-foreground text-2xl font-extrabold tabular-nums"
                      >
                        {`${share}%`}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 20}
                        className="fill-muted-foreground text-xs"
                      >
                        {W.share}
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
      <ul className="grid w-full min-w-0 grid-cols-2 gap-3">
        {rows.map((r) => (
          <li key={r.who} className="flex items-start gap-2">
            <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-full ${r.dot}`} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold">{r.label}</span>
              <span className="text-base font-bold tabular-nums">{formatPeso(r.amount)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {W.orders(r.orders)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {W.average} {r.avg}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">{W.summary(share, memberAvg, guestAvg)}</figcaption>
    </figure>
  );
}
