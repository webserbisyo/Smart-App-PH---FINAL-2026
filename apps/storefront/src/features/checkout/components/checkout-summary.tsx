'use client';

import Link from 'next/link';
import { ChevronLeftIcon, ChevronsUpDownIcon } from 'lucide-react';
import { formatPeso, words, type QuoteLine } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@smartapp/ui/components/collapsible';

interface CheckoutSummaryProps {
  slug: string;
  lines: QuoteLine[];
  count: number;
  total: number;
}

/**
 * Top bar for Checkout:
 * - Back button (pattern c-button-49) to Menu
 * - Collapsible order summary (pattern c-collapsible-1)
 */
export function CheckoutSummary({ slug, lines, count, total }: CheckoutSummaryProps) {
  const summaryLabel = words.checkout.itemsSummary(count, formatPeso(total));

  return (
    <div className="flex flex-col gap-3">
      {/* Pattern c-button-49 */}
      <div>
        <Button
          variant="link"
          render={<Link href={`/${slug}/menu`} />}
          nativeButton={false}
          className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon data-icon="inline-start" aria-hidden="true" />
          {words.checkout.backToMenu}
        </Button>
      </div>

      {/* Pattern c-collapsible-1 */}
      <Collapsible className="flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{summaryLabel}</span>
          <CollapsibleTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Toggle order summary"
              />
            }
          >
            <ChevronsUpDownIcon aria-hidden="true" className="size-4" />
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="flex flex-col divide-y divide-border/50 pt-2">
          {lines.map((line) => (
            <div key={line.identity} className="flex items-start justify-between py-2 text-sm">
              <div className="flex flex-col pr-2">
                <span className="font-medium">
                  {line.qty}× {line.name}
                </span>
                {line.variantLabel ? (
                  <span className="text-xs text-muted-foreground">{line.variantLabel}</span>
                ) : null}
                {line.optionLabels.length > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {line.optionLabels.join(', ')}
                  </span>
                ) : null}
                {line.note ? (
                  <span className="text-xs text-muted-foreground/80 italic">
                    &ldquo;{line.note}&rdquo;
                  </span>
                ) : null}
              </div>
              <span className="shrink-0 font-medium tabular">{formatPeso(line.lineTotal)}</span>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
