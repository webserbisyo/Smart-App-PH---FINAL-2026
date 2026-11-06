import { editorWords } from '@smartapp/core';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import type { PanelProps } from './types.js';

const W = editorWords.banners;
const SECONDS = [3, 5, 7, 10] as const;

export function BannersPanel({ content, update }: PanelProps) {
  const look = content.look;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">{look.banners.length ? W.intro : W.none}</p>
      {look.banners.length > 1 ? (
        <Field>
          <FieldLabel>{W.seconds}</FieldLabel>
          <ToggleGroup
            value={[String(look.bannerSeconds)]}
            onValueChange={(value) => {
              const seconds = SECONDS.find((n) => String(n) === value[0]);
              if (seconds) {
                update((c) => ({ ...c, look: { ...c.look, bannerSeconds: seconds } }), 'seconds');
              }
            }}
            className="w-full rounded-xl border border-border/80 bg-muted/50 p-0.5"
          >
            {SECONDS.map((n) => (
              <ToggleGroupItem
                key={n}
                value={String(n)}
                className="h-10 flex-1 rounded-lg text-sm font-medium text-muted-foreground tabular-nums aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-8"
              >
                {W.secondsN(n)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>{W.motion}</FieldDescription>
        </Field>
      ) : null}
    </div>
  );
}
