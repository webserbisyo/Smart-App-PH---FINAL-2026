import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRightIcon, MoonIcon, PipetteIcon, SunIcon } from 'lucide-react';
import {
  BRAND_COLOR_PRESETS,
  SHOP_SURFACES,
  editorWords,
  hexToOklch,
  logoPalettes,
  oklchToHex,
  shopPalette,
  type LogoPalette,
  type StorefrontContent,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Spinner } from '@smartapp/ui/components/spinner';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import { ImageUploadRow } from '@/app/image-upload-row';
import { useShop } from '@/app/shop';
import { AnyColourPicker } from '../any-colour-picker.js';
import { LogoLoupe } from '../logo-loupe.js';
import { PaletteCheck } from '../palette-check.js';
import { useLogoColours } from '../use-logo-colours.js';
import { colourName } from '../parts.js';
import { pictureRef, pictureSrc } from '../picture.js';
import type { PanelProps } from './types.js';
import { CountedLabel, orNull } from './field-count.js';

const W = editorWords.brand;
const TAGLINE_MAX = 80;
const SURFACE_ICONS = { light: SunIcon, dark: MoonIcon } as const;
const PAGE_MODES = ['plain', 'brand', 'custom'] as const;
type PageMode = (typeof PAGE_MODES)[number];

const TOGGLE_ITEM =
  'h-10 flex-1 rounded-lg px-2 text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-8';

function withLook(
  c: StorefrontContent,
  look: Partial<StorefrontContent['look']>,
): StorefrontContent {
  return { ...c, look: { ...c.look, ...look } };
}

/** A very light tint of a colour, for a page colour that is clearly not the brand colour itself. */
function paleShade(hex: string): string {
  const colour = hexToOklch(hex);
  if (!colour) return hex;
  return oklchToHex({ l: 0.95, c: Math.min(colour.c, 0.03), h: colour.h }).toUpperCase();
}

function sameHex(a: string | null, b: string | null): boolean {
  return (a ?? '').toUpperCase() === (b ?? '').toUpperCase();
}

/** A ready look from the logo, drawn small: the page, a card and the brand button. */
function PaletteCard({
  look,
  surface,
  selected,
  onUse,
}: {
  look: LogoPalette;
  surface: StorefrontContent['look']['surface'];
  selected: boolean;
  onUse: () => void;
}) {
  const p = shopPalette(look.brandColor, surface, look.pageColor);
  const name = colourName(look.brandColor);
  const page = look.pageColor ? W.tintedPage : W.plainPage;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={W.useFromLogo(name, page)}
      onClick={onUse}
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-xl border p-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        selected
          ? 'border-primary ring-1 ring-primary'
          : 'border-border hover-hover:hover:bg-muted',
      )}
    >
      <span
        className="flex h-14 flex-col justify-end gap-1.5 rounded-lg bg-(--p60) p-2"
        style={cssVars({ '--p60': p.shop60, '--p30': p.shop30, '--p10': p.shop10 })}
        aria-hidden
      >
        <span className="h-2 w-3/4 rounded-full bg-(--p30)" />
        <span className="h-3 w-1/2 rounded-full bg-(--p10)" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium">
          {name} <span className="font-mono text-muted-foreground">{look.brandColor}</span>
        </span>
        <span className="text-xs text-muted-foreground">{page}</span>
      </span>
    </button>
  );
}

function ColourSwatch({
  hex,
  selected,
  onPick,
}: {
  hex: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={W.swatch(colourName(hex), hex.toUpperCase())}
      onClick={onPick}
      className={cn(
        'flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <span
        className="size-9 rounded-full border border-border bg-(--swatch)"
        style={cssVars({ '--swatch': hex })}
      />
    </button>
  );
}

export function BrandPanel({ content, update }: PanelProps) {
  const shop = useShop();
  const look = content.look;
  const tagline = content.tagline ?? '';
  const logoSrc = pictureSrc(content.logo, 512);
  const logo = useLogoColours(logoSrc);
  const [picking, setPicking] = React.useState(false);

  const logoHexes = logo.status === 'ready' ? logo.colours.map((c) => c.hex) : [];
  // The colour in use comes first, so it always shows as picked.
  const swatches = [look.brandColor, ...logoHexes, ...BRAND_COLOR_PRESETS].filter(
    (hex, i, all) => all.findIndex((other) => sameHex(other, hex)) === i,
  );
  const looks: LogoPalette[] = logo.status === 'ready' ? logoPalettes(logo.colours) : [];

  let pageMode: PageMode = 'custom';
  if (look.pageColor === null) pageMode = 'plain';
  else if (sameHex(look.pageColor, look.brandColor)) pageMode = 'brand';

  const setBrand = (hex: string, key: string) =>
    update(
      (c) =>
        withLook(c, {
          brandColor: hex,
          // A page "from my brand colour" follows the brand colour.
          pageColor: sameHex(c.look.pageColor, c.look.brandColor) ? hex : c.look.pageColor,
        }),
      key,
    );

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
          shape="circle"
          onUploaded={(upload) => {
            void pictureRef(upload).then((ref) => update((c) => ({ ...c, logo: ref }), 'logo'));
          }}
          onRemove={content.logo ? () => update((c) => ({ ...c, logo: null }), 'logo') : undefined}
        />
        {content.logo ? null : <p className="text-sm text-muted-foreground">{W.noLogo}</p>}
      </section>

      {content.logo ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">{W.fromLogo}</h3>
            <span className="text-xs text-muted-foreground">{W.fromLogoNote}</span>
          </div>
          {logo.status === 'reading' ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Spinner className="size-4" />
              {W.reading}
            </p>
          ) : looks.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {looks.map((option) => (
                <PaletteCard
                  key={`${option.brandColor}-${option.pageColor ?? 'plain'}`}
                  look={option}
                  surface={look.surface}
                  selected={
                    sameHex(option.brandColor, look.brandColor) &&
                    sameHex(option.pageColor, look.pageColor)
                  }
                  onUse={() =>
                    update(
                      (c) =>
                        withLook(c, { brandColor: option.brandColor, pageColor: option.pageColor }),
                      'palette',
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{W.noStrong}</p>
          )}
          {logo.status === 'ready' ? (
            picking ? (
              <LogoLoupe
                image={logo.image}
                onPick={(hex) => setBrand(hex, 'loupe')}
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
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-medium">{W.brandColour}</h3>
          <p className="text-xs text-muted-foreground">{W.brandHelp}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {swatches.map((hex) => (
            <ColourSwatch
              key={hex}
              hex={hex}
              selected={sameHex(hex, look.brandColor)}
              onPick={() => setBrand(hex.toUpperCase(), 'swatch')}
            />
          ))}
        </div>
        <Field>
          <FieldLabel htmlFor="editor-brand-any">{W.anyColour}</FieldLabel>
          <AnyColourPicker
            id="editor-brand-any"
            label={W.brandColour}
            value={look.brandColor}
            onChange={(hex) => setBrand(hex, 'brand-any')}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <Field>
          <FieldLabel>{W.page}</FieldLabel>
          <ToggleGroup
            value={[look.surface]}
            onValueChange={(value) => {
              const surface = SHOP_SURFACES.find((s) => s === value[0]);
              if (surface) update((c) => withLook(c, { surface }), 'surface');
            }}
            className="w-full rounded-xl border border-border/80 bg-muted/50 p-0.5"
          >
            {SHOP_SURFACES.map((surface) => {
              const Icon = SURFACE_ICONS[surface];
              return (
                <ToggleGroupItem key={surface} value={surface} className={TOGGLE_ITEM}>
                  <Icon aria-hidden />
                  {editorWords.surfaces[surface]}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </Field>
        <Field>
          <FieldLabel>{W.pageColour}</FieldLabel>
          <ToggleGroup
            value={[pageMode]}
            onValueChange={(value) => {
              const mode = PAGE_MODES.find((m) => m === value[0]);
              if (!mode) return;
              update((c) => {
                if (mode === 'plain') return withLook(c, { pageColor: null });
                if (mode === 'brand') return withLook(c, { pageColor: c.look.brandColor });
                // Any colour opens on a pale shade of the brand colour, then the owner moves it.
                return withLook(c, { pageColor: paleShade(c.look.brandColor) });
              }, 'page-mode');
            }}
            className="w-full flex-wrap rounded-xl border border-border/80 bg-muted/50 p-0.5"
          >
            <ToggleGroupItem value="plain" className={TOGGLE_ITEM}>
              {W.plain}
            </ToggleGroupItem>
            <ToggleGroupItem value="brand" className={TOGGLE_ITEM}>
              {W.fromBrand}
            </ToggleGroupItem>
            <ToggleGroupItem value="custom" className={TOGGLE_ITEM}>
              {W.customPage}
            </ToggleGroupItem>
          </ToggleGroup>
          {pageMode === 'custom' && look.pageColor ? (
            <AnyColourPicker
              id="editor-page-any"
              label={W.pageColour}
              value={look.pageColor}
              onChange={(hex) => update((c) => withLook(c, { pageColor: hex }), 'page-any')}
            />
          ) : null}
          <FieldDescription>{W.pageHelp}</FieldDescription>
        </Field>
      </section>

      <PaletteCheck look={look} />
    </div>
  );
}
