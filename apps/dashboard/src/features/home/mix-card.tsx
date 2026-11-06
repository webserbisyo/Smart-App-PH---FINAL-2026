import { homeWords, sharePercent, type HomeSummary } from '@smartapp/core';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import { HomeCard } from './home-card.js';

const W = homeWords.mix;

// One colour per place in the bar, biggest first. The sixth payment kind (rare) reuses a soft grey.
const TONES = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
  'bg-muted-foreground/40',
] as const;

interface MixRow {
  key: string;
  label: string;
  orders: number;
  sales: number;
}

function MixBar({ title, rows, total }: { title: string; rows: readonly MixRow[]; total: number }) {
  const shown = rows.map((r, i) => ({
    ...r,
    tone: TONES[Math.min(i, TONES.length - 1)],
    percent: sharePercent(r.sales, total),
  }));
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold">{title}</span>
      <div
        role="img"
        aria-label={W.barAria(shown.map((r) => W.barRow(r.label, r.percent)).join(', '))}
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        {shown
          .filter((r) => r.sales > 0)
          .map((r) => (
            <span
              key={r.key}
              style={cssVars({ '--share': `${(r.sales / Math.max(1, total)) * 100}%` })}
              className={cn('h-full w-(--share) min-w-1', r.tone)}
            />
          ))}
      </div>
      <ul aria-hidden="true" className="flex flex-col gap-1 text-xs">
        {shown.map((r) => (
          <li key={r.key} className="flex min-w-0 items-center gap-1.5">
            <span className={cn('size-2 shrink-0 rounded-full', r.tone)} />
            <span className="truncate text-muted-foreground">{W.row(r.label, r.orders)}</span>
            <span className="ml-auto font-semibold tabular-nums">{W.percent(r.percent)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** How they ordered and paid (H10): today's sales split by order type and by payment, biggest first. */
export function MixCard({
  summary,
  className,
}: {
  summary: HomeSummary;
  className?: string | undefined;
}) {
  const { types, methods } = summary.mix;
  const total = summary.today.sales;
  return (
    <HomeCard id="mix" title={W.title} hint={W.hint} className={className}>
      {summary.today.orders === 0 || total === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{W.empty}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <MixBar
            title={W.types}
            total={total}
            rows={types.map((t) => ({
              key: t.type,
              label: W.type[t.type],
              orders: t.orders,
              sales: t.sales,
            }))}
          />
          <MixBar
            title={W.methods}
            total={total}
            rows={methods.map((m) => ({
              key: m.method,
              label: W.method[m.method],
              orders: m.orders,
              sales: m.sales,
            }))}
          />
        </div>
      )}
    </HomeCard>
  );
}
