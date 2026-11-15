import { CircleAlertIcon, PlayIcon, SmartphoneIcon } from 'lucide-react';
import {
  OPENING_BACKGROUNDS,
  OPENING_LOADERS,
  OPENING_LOGO_SIZES,
  OPENING_MOTIONS,
  OPENING_NAME_MAX,
  SHORT_NAME_MAX,
  appNameOf,
  editorWords,
  openingColours,
  shortName,
  type OpeningScreen,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Switch } from '@smartapp/ui/components/switch';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import { useShop } from '@/app/shop';
import { AnyColourPicker } from '../any-colour-picker.js';
import { CountedLabel, orNull } from './field-count.js';
import type { PanelProps } from './types.js';

const W = editorWords.opening;

const TOGGLE_ITEM =
  'h-10 flex-1 rounded-lg px-2 text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-8';
const TOGGLE_GROUP = 'w-full rounded-xl border border-border/80 bg-muted/50 p-0.5';

/** One row of choices from a closed list, as the other Editor parts draw them. */
function Choices<T extends string>({
  label,
  options,
  value,
  names,
  onPick,
  help,
}: {
  label: string;
  options: readonly T[];
  value: T;
  names: Record<T, string>;
  onPick: (next: T) => void;
  help?: string | undefined;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <ToggleGroup
        value={[value]}
        onValueChange={(picked) => {
          const next = options.find((option) => option === picked[0]);
          if (next) onPick(next);
        }}
        className={TOGGLE_GROUP}
      >
        {options.map((option) => (
          <ToggleGroupItem key={option} value={option} className={TOGGLE_ITEM}>
            {names[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {help ? <FieldDescription>{help}</FieldDescription> : null}
    </Field>
  );
}

/**
 * The installed app's opening screen (decisions T93, T94). The preview in the middle holds on it while this
 * part is open and replays the logo's motion on every change; Watch it open plays it into the page. The
 * storefront draws the same with CSS only (`app-splash`, `splash-logo`, `splash-loader`).
 */
export function OpeningPanel({ content, update, watchOpening }: PanelProps) {
  const shop = useShop();
  const look = content.look;
  const opening = look.opening;
  const appName = opening.appName ?? '';
  const label = shortName(appNameOf(shop.name, opening));
  const labelCut = appNameOf(shop.name, opening).length > SHORT_NAME_MAX;

  const setOpening = (next: Partial<OpeningScreen>, key: string) =>
    update((c) => ({ ...c, look: { ...c.look, opening: { ...c.look.opening, ...next } } }), key);

  const colourFor = (background: OpeningScreen['background']) =>
    openingColours({
      ...look,
      opening: { ...opening, background, color: opening.color ?? look.brandColor },
    }).background;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{W.intro}</p>
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-3">
          <SmartphoneIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">{W.phoneOnly}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full md:h-9 md:w-fit"
          aria-label={W.watchAria}
          onClick={watchOpening}
        >
          <PlayIcon aria-hidden="true" />
          {W.watch}
        </Button>
      </div>

      <Field>
        <CountedLabel htmlFor="editor-app-name" used={appName.length} max={OPENING_NAME_MAX}>
          {W.appName}
        </CountedLabel>
        <div className="flex items-center gap-2">
          <Input
            id="editor-app-name"
            className="h-11 md:h-9"
            value={appName}
            maxLength={OPENING_NAME_MAX}
            placeholder={shop.name}
            onChange={(e) => setOpening({ appName: orNull(e.target.value) }, 'opening-name-text')}
          />
          {opening.appName !== null ? (
            <Button
              type="button"
              variant="link"
              className="h-11 shrink-0 px-0 md:h-9"
              onClick={() => setOpening({ appName: null }, 'opening-name-reset')}
            >
              {W.useShopName}
            </Button>
          ) : null}
        </div>
        <p
          className={cn(
            'flex items-start gap-1.5 text-xs',
            labelCut ? 'text-warning-text' : 'text-muted-foreground',
          )}
          aria-live="polite"
        >
          {labelCut ? (
            <CircleAlertIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          ) : null}
          {labelCut ? W.appNameCut(label) : W.appNameFits(label)}
        </p>
        <FieldDescription>{W.appNameHelp}</FieldDescription>
      </Field>

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

      <Choices
        label={W.motion}
        options={OPENING_MOTIONS}
        value={opening.motion}
        names={W.motions}
        onPick={(motion) => setOpening({ motion }, 'opening-motion')}
      />

      <Choices
        label={W.loader}
        options={OPENING_LOADERS}
        value={opening.loader}
        names={W.loaders}
        onPick={(loader) => setOpening({ loader }, 'opening-loader')}
        help={W.loaderHelp}
      />

      <Choices
        label={W.logoSize}
        options={OPENING_LOGO_SIZES}
        value={opening.logoSize}
        names={W.logoSizes}
        onPick={(logoSize) => setOpening({ logoSize }, 'opening-logo-size')}
      />

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

      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="editor-opening-tagline">{W.showTagline}</FieldLabel>
          <FieldDescription>{content.tagline ? W.showTaglineHelp : W.noTagline}</FieldDescription>
        </FieldContent>
        <Switch
          id="editor-opening-tagline"
          checked={opening.showTagline && content.tagline !== null}
          disabled={content.tagline === null}
          onCheckedChange={(checked) => setOpening({ showTagline: checked }, 'opening-tagline')}
        />
      </Field>

      <p className="text-xs text-muted-foreground">{W.note}</p>
    </div>
  );
}
