'use client';

import Link from 'next/link';
import { ChevronDownIcon, ChevronLeftIcon } from 'lucide-react';
import { formatPeso, imageSources, words, type QuoteLine } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@smartapp/ui/components/collapsible';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';

interface CheckoutSummaryProps {
  slug: string;
  lines: QuoteLine[];
  count: number;
  total: number;
}

/**
 * Checkout top: back to the menu, the page title and the order folded up with its photos
 * (c-button-49 back, c-collapsible-1 summary).
 */
export function CheckoutSummary({ slug, lines, count, total }: CheckoutSummaryProps) {
  const summaryLabel = words.checkout.itemsSummary(count, formatPeso(total));
  const thumbs = lines.slice(0, 3);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          render={<Link href={`/${slug}/menu`} />}
          nativeButton={false}
          className="-ml-2 h-11 gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-4" />
          {words.checkout.backToMenu}
        </Button>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{words.checkout.title}</h1>

      <Collapsible className="flex w-full flex-col rounded-3xl bg-card shadow-xs ring-1 ring-foreground/8">
        <CollapsibleTrigger
          aria-label={words.checkout.toggleSummary}
          className="group flex min-h-16 w-full items-center gap-3 rounded-3xl px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-5"
        >
          <span className="flex shrink-0 -space-x-3">
            {thumbs.map((line) => (
              <ShopImage
                key={line.identity}
                src={line.photo ? imageSources(line.photo) : null}
                alt=""
                ratio="1:1"
                sizes="40px"
                fallbackText={line.name}
                className="size-10 rounded-xl ring-2 ring-card"
              />
            ))}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs text-muted-foreground">{words.checkout.yourOrder}</span>
            <span className="truncate text-sm font-semibold tabular">{summaryLabel}</span>
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-panel-open:rotate-180 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="flex flex-col divide-y divide-border/60 px-4 pb-2 sm:px-5">
          {lines.map((line) => (
            <div key={line.identity} className="flex items-start gap-3 py-3 text-sm">
              <ShopImage
                src={line.photo ? imageSources(line.photo) : null}
                alt=""
                ratio="1:1"
                sizes="48px"
                fallbackText={line.name}
                className="size-12 shrink-0 rounded-xl"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium break-words">
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
                  <span className="text-xs break-words text-muted-foreground italic">
                    &ldquo;{line.note}&rdquo;
                  </span>
                ) : null}
              </div>
              <span className="shrink-0 font-semibold tabular">{formatPeso(line.lineTotal)}</span>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
