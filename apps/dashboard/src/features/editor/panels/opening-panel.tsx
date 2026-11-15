import * as React from 'react';
import { PlayIcon } from 'lucide-react';
import {
  OPENING_BACKGROUNDS,
  OPENING_MOTIONS,
  editorWords,
  openingColours,
  type OpeningScreen,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Switch } from '@smartapp/ui/components/switch';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import { useShop } from '@/app/shop';
import { AnyColourPicker } from '../any-colour-picker.js';
import { pictureSrc } from '../picture.js';
import type { PanelProps } from './types.js';

const W = editorWords.opening;

const TOGGLE_ITEM =
  'h-10 flex-1 rounded-lg px-2 text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-8';
const TOGGLE_GROUP = 'w-full rounded-xl border border-border/80 bg-muted/50 p-0.5';

/**
 * The installed app's opening screen (decision T93): the colour behind the logo (the page colour by
 * default, the brand or the owner's own), the logo's motion and the name. A small preview plays it here;
 * the storefront draws the same with CSS only (`app-splash`, `splash-logo`).
 */
export function OpeningPanel({ content, update }: PanelProps) {
  const shop = useShop();
  const look = content.look;
  const opening = look.opening;
  const logo = pictureSrc(content.logo, 256);
  // Changing the key plays the motion again.
  const [run, setRun] = React.useState(0);

  const setOpening = (next: Partial<OpeningScreen>, key: string) => {
    update((c) => ({ ...c, look: { ...c.look, opening: { ...c.look.opening, ...next } } }), key);
    setRun((n) => n + 1);
  };

  const colourFor = (background: OpeningScreen['background']) =>
    openingColours({
      ...look,
      opening: { ...opening, background, color: opening.color ?? look.brandColor },
    }).background;
  const colours = openingColours(look);
  const showName = opening.showName || !logo;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">{W.intro}</p>

      <section className="flex items-center gap-4" aria-label={W.preview}>
        <div
          key={run}
          data-slot="opening-preview"
          data-motion={opening.motion}
          style={cssVars({ '--splash-bg': colours.background, '--splash-fg': colours.foreground })}
          className="flex aspect-9/16 w-28 shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-border bg-(--splash-bg) px-2 text-(--splash-fg) shadow-xs"
        >
          <div className="flex flex-col items-center gap-2">
            {logo ? <img src={logo} alt="" className="size-10 splash-logo rounded-xl" /> : null}
            {showName ? (
              <span
                className={cn(
                  'line-clamp-2 text-center text-xs font-bold text-balance',
                  !logo && 'splash-logo',
                )}
              >
                {shop.name}
              </span>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          aria-label={W.playAria}
          onClick={() => setRun((n) => n + 1)}
        >
          <PlayIcon aria-hidden="true" />
          {W.play}
        </Button>
      </section>

      <Field>
        <FieldLabel>{W.background}</FieldLabel>
        <ToggleGroup
          value={[opening.background]}
          onValueChange={(value) => {
            const next = OPENING_BACKGROUNDS.find((b) => b === value[0]);
            if (next)
              setOpening(
                {
                  background: next,
                  color: next === 'custom' ? (opening.color ?? look.brandColor) : opening.color,
                },
                'opening-background',
              );
          }}
          className={TOGGLE_GROUP}
        >
          {OPENING_BACKGROUNDS.map((background) => (
            <ToggleGroupItem key={background} value={background} className={TOGGLE_ITEM}>
              <span
                aria-hidden="true"
                style={cssVars({ '--swatch': colourFor(background) })}
                className="size-3 shrink-0 rounded-full border border-border bg-(--swatch)"
              />
              <span className="truncate">{W.backgrounds[background]}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription>{W.backgroundHelp[opening.background]}</FieldDescription>
      </Field>

      {opening.background === 'custom' ? (
        <Field>
          <FieldLabel htmlFor="editor-opening-colour">{W.customColour}</FieldLabel>
          <AnyColourPicker
            id="editor-opening-colour"
            label={W.customColour}
            value={opening.color ?? look.brandColor}
            onChange={(hex) => setOpening({ color: hex }, 'opening-colour')}
          />
        </Field>
      ) : null}

      <Field>
        <FieldLabel>{W.motion}</FieldLabel>
        <ToggleGroup
          value={[opening.motion]}
          onValueChange={(value) => {
            const next = OPENING_MOTIONS.find((m) => m === value[0]);
            if (next) setOpening({ motion: next }, 'opening-motion');
          }}
          className={TOGGLE_GROUP}
        >
          {OPENING_MOTIONS.map((motion) => (
            <ToggleGroupItem key={motion} value={motion} className={TOGGLE_ITEM}>
              {W.motions[motion]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="editor-opening-name">{W.showName}</FieldLabel>
          <FieldDescription>{W.showNameHelp}</FieldDescription>
        </FieldContent>
        <Switch
          id="editor-opening-name"
          checked={opening.showName}
          onCheckedChange={(checked) => setOpening({ showName: checked }, 'opening-name')}
        />
      </Field>

      <p className="text-xs text-muted-foreground">{W.note}</p>
    </div>
  );
}
