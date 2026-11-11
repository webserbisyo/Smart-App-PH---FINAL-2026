import { CheckIcon } from 'lucide-react';
import { editorWords, FONT_PAIRS, type FontPair } from '@smartapp/core';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { fontPairVars } from '@smartapp/ui/lib/font-pairs';

const W = editorWords.brand;

/**
 * Fonts in Style (decision T79): the 8 pairs as cards, each drawn in its own heading and body font. A card
 * downloads its fonts when it first shows here; customers only ever get the shop's pair.
 */
export function FontPicker({
  value,
  shopName,
  onChange,
}: {
  value: FontPair;
  shopName: string;
  onChange: (pair: FontPair) => void;
}) {
  return (
    <section className="flex flex-col gap-3" aria-label={W.fonts}>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{W.fonts}</h3>
        <p className="text-xs text-muted-foreground">{W.fontsNote}</p>
      </div>
      <ToggleGroup
        aria-label={W.fonts}
        value={[value]}
        onValueChange={(next) => {
          const pair = FONT_PAIRS.find((p): p is FontPair => p === next[0]);
          if (pair) onChange(pair);
        }}
        className="grid w-full grid-cols-2 gap-2"
      >
        {FONT_PAIRS.map((pair) => {
          const words = W.fontPairs[pair];
          return (
            <ToggleGroupItem
              key={pair}
              value={pair}
              aria-label={`${words.name}, ${words.goodFor}`}
              style={cssVars(fontPairVars(pair))}
              className="relative h-auto min-h-20 flex-col items-start justify-start gap-1 rounded-xl border border-border bg-card p-3 text-left font-sans font-normal text-foreground aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary/30"
            >
              <span className="flex w-full items-start gap-2">
                <span className="min-w-0 flex-1 truncate font-heading text-lg leading-tight font-semibold">
                  {shopName}
                </span>
                {pair === value ? (
                  <CheckIcon aria-hidden className="size-4 shrink-0 text-primary" />
                ) : null}
              </span>
              <span className="w-full text-sm font-medium">{words.name}</span>
              <span className="line-clamp-1 w-full text-xs text-muted-foreground">
                {words.goodFor}
              </span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </section>
  );
}
