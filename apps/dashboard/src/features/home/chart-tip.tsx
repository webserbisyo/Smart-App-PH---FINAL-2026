import type * as React from 'react';
import {
  ChartTooltip,
  ChartTooltipContent,
} from '@smartapp/ui/components/evilcharts/ui/recharts-tooltip';
import { cssVars } from '@smartapp/ui/lib/css-vars';

export interface ChartTipRow {
  key: string;
  label: string;
}

/**
 * The installed evilcharts tooltip with our words and money (T77). Its own Tooltip part prints raw numbers
 * (centavos), so Home composes the installed ChartTooltip and ChartTooltipContent with a formatter instead.
 */
export function ChartTip({
  rows,
  value,
  title,
}: {
  rows: readonly ChartTipRow[];
  value: (v: number, key: string, row: Record<string, unknown>) => React.ReactNode;
  title: (row: Record<string, unknown>) => string;
}) {
  return (
    <ChartTooltip
      cursor={false}
      content={
        <ChartTooltipContent
          className="min-w-40"
          labelFormatter={(_, payload) => {
            const row: unknown = payload[0]?.payload;
            return isRow(row) ? title(row) : '';
          }}
          formatter={(v, name, item) => {
            const key = String(name);
            const label = rows.find((r) => r.key === key)?.label ?? key;
            const row: unknown = item.payload;
            return (
              <span className="flex w-full items-center gap-2">
                <span
                  aria-hidden="true"
                  style={cssVars({ '--dot': `var(--color-${key}-0)` })}
                  className="size-2.5 shrink-0 rounded-sm bg-(--dot)"
                />
                <span className="flex-1 text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {value(Number(v), key, isRow(row) ? row : {})}
                </span>
              </span>
            );
          }}
        />
      }
    />
  );
}

function isRow(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
