import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  CircleIcon,
  EraserIcon,
  PipetteIcon,
  SquareIcon,
} from 'lucide-react';
import {
  LOGO_SHAPES,
  editorWords,
  surfaceForPage,
  type LogoShape,
  type StorefrontContent,
} from '@smartapp/core';
import {
  STYLE_GROUPS,
  STYLE_TWEAKS,
  shopStyles,
  tuneSwatches,
  tweakStyle,
  type ShopStyle,
} from '@smartapp/core/rules/style-designer';
import { Button } from '@smartapp/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@smartapp/ui/components/collapsible';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Spinner } from '@smartapp/ui/components/spinner';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from 'cn';
import { ImageUploadRow, useImageUpload } from '@/app/image-upload-row';
import { useShop } from '@/app/shop';
import { AnyColourPicker } from '../any-colour-picker.js';
import { LogoLoupe } from '../logo-loupe.js';
import { LogoPlaces } from '../logo-places.js';
import { removeWhiteBackground, squareLogo } from '../logo-tools.js';
import { PaletteCheck } from '../palette-check.js';
import { StyleCard, styleName } from '../style-card.js';
import { useLogoColours } from '../use-logo-colours.js';
import { colourName } from '../parts.js';
import { pictureRef, pictureSrc } from '../picture.js';
import type { PanelProps } from './types.js';
import { CountedLabel, orNull } from './field-count.js';

const W = editorWords.brand;
const TAGLINE_MAX = 80;
const SHAPE_ICONS = { circle: CircleIcon, rounded: SquareIcon } as const;

const TOGGLE_ITEM =
  'h-10 flex-1 rounded-lg px-2 text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-8';

type Look = StorefrontContent['look'];

function withLook(c: StorefrontContent, look: Partial<Look>): StorefrontContent {
  return { ...c, look: { ...c.look, ...look } };
}

function sameHex(a: string | null, b: string | null): boolean {
  return (a ?? '').toUpperCase() === (b ?? '').toUpperCase();
}

function isStyle(look: Look, style: ShopStyle): boolean {
  return (
    sameHex(look.pageColor, style.pageColor) &&
    sameHex(look.cardColor, style.cardColor) &&
    sameHex(look.brandColor, style.brandColor)
  );
}

/** A style's colours on the look; light or dark follows the page (T76 C4). */
function styleLook(style: ShopStyle): Partial<Look> {
  return {
    pageColor: style.pageColor,
    cardColor: style.cardColor,
    brandColor: style.brandColor,
    surface: style.surface,
  };
}

function Swatch({
  hex,
  label,
  selected,
  onPick,
}: {
  hex: string | null;
  label: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={hex ? W.swatch(label, hex.toUpperCase()) : label}
      title={label}
      onClick={onPick}
      className="flex w-14 flex-col items-center gap-1 rounded-lg text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-full',
          selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        )}
      >
        <span
          className={cn(
            'size-9 rounded-full border border-border',
            hex ? 'bg-(--swatch)' : 'bg-linear-to-br from-card to-muted',
          )}
          style={cssVars({ '--swatch': hex ?? 'transparent' })}
        />
      </span>
      <span className="line-clamp-2 text-xs leading-tight text-muted-foreground">{label}</span>
    </button>
  );
}

function TuneRow({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h4 className="text-sm font-medium">{title}</h4>
        {help ? <span className="text-xs text-muted-foreground">{help}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function BrandPanel({ content, update }: PanelProps) {
  const shop = useShop();
  const look = content.look;
  const tagline = content.tagline ?? '';
  const logoSrc = pictureSrc(content.logo, 512);
  const logo = useLogoColours(logoSrc);
  const [picking, setPicking] = React.useState(false);
  const [tuneOpen, setTuneOpen] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const logoUpload = useImageUpload('logo', 512);

  const reading = logo.status === 'ready' ? logo.reading : null;
  // The styles follow the logo; the brand colour only seeds them when the logo has no colour.
  const fallbackSeed = reading?.seeds[0]?.hex ?? look.brandColor;
  const set = React.useMemo(() => shopStyles(reading, fallbackSeed), [reading, fallbackSeed]);
  const picked = set.styles.find((s) => isStyle(look, s)) ?? null;
  const main = set.seeds[0]?.hex ?? look.brandColor;
  const swatches = tuneSwatches(main, look.pageColor ?? '#FAFAFA');

  const setLook = (next: Partial<Look>, key: string) => update((c) => withLook(c, next), key);
  const setPage = (hex: string, key: string) =>
    setLook({ pageColor: hex, surface: surfaceForPage(hex) }, key);

  const brandOptions = [
    ...set.seeds.map((s) => ({ hex: s.hex, label: colourName(s.hex) })),
    { hex: set.partner, label: W.partner },
    { hex: look.brandColor, label: colourName(look.brandColor) },
  ].filter((o, i, all) => all.findIndex((x) => sameHex(x.hex, o.hex)) === i);

  const clearWhite = async () => {
    if (!logoSrc) return;
    setClearing(true);
    try {
      const file = await removeWhiteBackground(logoSrc);
      const done = await logoUpload.upload(file);
      if (done) {
        const ref = await pictureRef(done);
        update((c) => ({ ...c, logo: ref }), 'logo');
        notify({ title: W.whiteRemoved, tone: 'success' });
      }
    } catch {
      notify({ title: W.whiteFailed, tone: 'error' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="editor-name">{W.name}</FieldLabel>
          <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-muted px-3 py-1.5">
            <span id="editor-name" className="min-w-0 truncate text-sm font-medium">
              {shop.name}
            </span>
            <Button
              variant="link"
              className="h-9 shrink-0 px-0"
              nativeButton={false}
              render={<Link to="/settings/shop" />}
            >
              {W.nameIn}
              <ArrowUpRightIcon />
            </Button>
          </div>
        </Field>
        <Field>
          <CountedLabel htmlFor="editor-tagline" used={tagline.length} max={TAGLINE_MAX}>
            {W.tagline}
          </CountedLabel>
          <Input
            id="editor-tagline"
            className="h-11 md:h-9"
            value={tagline}
            maxLength={TAGLINE_MAX}
            placeholder={W.taglinePlaceholder}
            onChange={(e) =>
              update(
                (c): StorefrontContent => ({ ...c, tagline: orNull(e.target.value) }),
                'tagline',
              )
            }
          />
          <FieldDescription>{W.taglineHelp}</FieldDescription>
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <ImageUploadRow
          id="editor-logo"
          kind="logo"
          maxSide={512}
          label={W.logo}
          help={W.logoHelp}
          src={logoSrc}
          shape={look.logoShape}
          pickLabel={W.uploadLogo}
          replaceLabel={W.replaceLogo}
          prepare={squareLogo}
          onUploaded={(upload) => {
            void pictureRef(upload).then((ref) => update((c) => ({ ...c, logo: ref }), 'logo'));
          }}
          onRemove={content.logo ? () => update((c) => ({ ...c, logo: null }), 'logo') : undefined}
        />
        {content.logo ? null : <p className="text-sm text-muted-foreground">{W.noLogo}</p>}
        {reading?.whiteBox ? (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
            <p className="text-sm">{W.whiteBox}</p>
            <Button
              variant="outline"
              className="h-11 self-start md:h-9"
              disabled={clearing}
              onClick={() => void clearWhite()}
            >
              {clearing ? <Spinner /> : <EraserIcon />}
              {clearing ? W.removingWhite : W.removeWhite}
            </Button>
          </div>
        ) : null}
        <Field>
          <FieldLabel>{W.shape}</FieldLabel>
          <ToggleGroup
            value={[look.logoShape]}
            onValueChange={(value) => {
              const shape = LOGO_SHAPES.find((s): s is LogoShape => s === value[0]);
              if (shape) setLook({ logoShape: shape }, 'logo-shape');
            }}
            className="w-full rounded-xl border border-border/80 bg-muted/50 p-0.5"
          >
            {LOGO_SHAPES.map((shape) => {
              const Icon = SHAPE_ICONS[shape];
              return (
                <ToggleGroupItem key={shape} value={shape} className={TOGGLE_ITEM}>
                  <Icon aria-hidden />
                  {W.shapes[shape]}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </Field>
        <LogoPlaces look={look} logo={logoSrc} name={shop.name} tagline={content.tagline} />
      </section>

      <section className="flex flex-col gap-3" aria-label={W.styles}>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-medium">{W.styles}</h3>
          <p className="text-xs text-muted-foreground">
            {logo.status === 'reading'
              ? W.reading
              : reading?.seeds.length
                ? W.stylesNote
                : content.logo
                  ? W.noStrong
                  : W.stylesNoLogo}
          </p>
        </div>
        {logo.status === 'reading' ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Spinner className="size-4" />
            {W.reading}
          </p>
        ) : (
          STYLE_GROUPS.map((group) => (
            <div key={group} className="flex flex-col gap-1.5">
              <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {W.styleGroups[group]}
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2">
                {set.styles
                  .filter((s) => s.group === group)
                  .map((style) => (
                    <StyleCard
                      key={style.id}
                      shopStyle={style}
                      logo={logoSrc}
                      selected={picked?.id === style.id}
                      onUse={() => {
                        setLook(styleLook(style), 'style');
                        notify({ title: W.styleOn(styleName(style)), tone: 'success' });
                      }}
                    />
                  ))}
              </div>
            </div>
          ))
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{W.moreLike}</span>
          <div className="flex flex-wrap gap-2">
            {STYLE_TWEAKS.map((tweak) => (
              <Button
                key={tweak}
                variant="outline"
                size="sm"
                className="h-10 md:h-8"
                onClick={() => {
                  const base: ShopStyle = picked ?? {
                    id: 'white',
                    group: 'light',
                    seed: main,
                    pageColor: look.pageColor ?? '#FAFAFA',
                    cardColor: look.cardColor ?? '#FFFFFF',
                    brandColor: look.brandColor,
                    surface: look.surface,
                    score: 0,
                    best: false,
                    ring: false,
                    notes: [],
                  };
                  const next = tweakStyle(
                    {
                      ...base,
                      pageColor: look.pageColor ?? base.pageColor,
                      cardColor: look.cardColor ?? base.cardColor,
                    },
                    tweak,
                  );
                  setLook(
                    { pageColor: next.pageColor, cardColor: next.cardColor, surface: next.surface },
                    `tweak-${tweak}`,
                  );
                }}
              >
                {W.tweaks[tweak]}
              </Button>
            ))}
          </div>
        </div>
        {picked && picked.notes.length > 0 ? (
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {picked.notes.map((note) => (
              <li key={note}>{W.notes[note]}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <Collapsible open={tuneOpen} onOpenChange={setTuneOpen}>
        <CollapsibleTrigger
          render={
            <Button variant="outline" className="h-11 w-full justify-between md:h-9">
              {W.fineTune}
              <ChevronDownIcon
                className={cn('transition-transform duration-base', tuneOpen && 'rotate-180')}
              />
            </Button>
          }
        />
        <CollapsibleContent className="flex flex-col gap-4 pt-3">
          <p className="text-xs text-muted-foreground">{W.fineTuneHelp}</p>
          <TuneRow title={W.pageRow} help={W.pageRowHelp}>
            <div className="flex flex-wrap gap-1">
              {swatches.page.map((s) => (
                <Swatch
                  key={s.id}
                  hex={s.hex}
                  label={W.pageSwatches[s.id]}
                  selected={sameHex(look.pageColor, s.hex)}
                  onPick={() => setPage(s.hex, 'page-swatch')}
                />
              ))}
            </div>
            <AnyColourPicker
              id="editor-page-any"
              label={W.pageColour}
              value={look.pageColor ?? '#FAFAFA'}
              onChange={(hex) => setPage(hex, 'page-any')}
            />
          </TuneRow>
          <TuneRow title={W.cardRow} help={W.cardRowHelp}>
            <div className="flex flex-wrap gap-1">
              <Swatch
                hex={null}
                label={W.cardSwatches.follow}
                selected={look.cardColor === null}
                onPick={() => setLook({ cardColor: null }, 'card-swatch')}
              />
              {swatches.card.map((s) => (
                <Swatch
                  key={s.id}
                  hex={s.hex}
                  label={W.cardSwatches[s.id]}
                  selected={sameHex(look.cardColor, s.hex)}
                  onPick={() => setLook({ cardColor: s.hex }, 'card-swatch')}
                />
              ))}
            </div>
            <AnyColourPicker
              id="editor-card-any"
              label={W.cardColour}
              value={look.cardColor ?? '#FFFFFF'}
              onChange={(hex) => setLook({ cardColor: hex }, 'card-any')}
            />
          </TuneRow>
          <TuneRow title={W.brandRow} help={W.brandHelp}>
            <div className="flex flex-wrap gap-1">
              {brandOptions.map((o) => (
                <Swatch
                  key={o.hex}
                  hex={o.hex}
                  label={o.label}
                  selected={sameHex(look.brandColor, o.hex)}
                  onPick={() => setLook({ brandColor: o.hex.toUpperCase() }, 'brand-swatch')}
                />
              ))}
            </div>
            <AnyColourPicker
              id="editor-brand-any"
              label={W.brandColour}
              value={look.brandColor}
              onChange={(hex) => setLook({ brandColor: hex }, 'brand-any')}
            />
            {logo.status === 'ready' ? (
              picking ? (
                <LogoLoupe
                  image={logo.image}
                  onPick={(hex) => setLook({ brandColor: hex }, 'loupe')}
                  onDone={() => setPicking(false)}
                />
              ) : (
                <Button
                  variant="outline"
                  className="h-11 self-start md:h-9"
                  onClick={() => setPicking(true)}
                >
                  <PipetteIcon />
                  {W.tapLogo}
                </Button>
              )
            ) : null}
          </TuneRow>
        </CollapsibleContent>
      </Collapsible>

      <PaletteCheck look={look} />
    </div>
  );
}
