import type { ComponentProps } from 'react';
import { cn } from 'cn';
import { shopPalette, type ShopPalette } from '@smartapp/core/rules/palette';
import type { FontPair, ShopSurface } from '@smartapp/core/schemas/enums';
import { cssVars, type CssVarsObject } from '../lib/css-vars';
import { fontPairVars } from '../lib/font-pairs';
import { ShopThemeDocument } from './shop-theme-document';

export interface ShopThemeProps extends Omit<ComponentProps<'div'>, 'style'> {
  // The owner's one brand colour (hex); shopPalette() turns it into the readable 60/30/10 palette.
  brandColor: string;
  // Light or dark page (decision R2). A dark shop also gets the app's dark tokens (muted, borders, states).
  surface?: ShopSurface | undefined;
  // Optional page colour (hex) for the 60; none keeps the neutral page (decisions R52, T76).
  pageColor?: string | null | undefined;
  // Optional card colour (hex) for the 30; none lets the cards follow the page (T76 C3).
  cardColor?: string | null | undefined;
  // The shop's heading and body fonts (decision T79); none keeps Plus Jakarta Sans.
  fontPair?: FontPair | undefined;
  // The storefront sets this once: sheets, dialogs and toasts render outside this wrapper (portals), so the
  // shop's colours are copied onto <html> too. The kit leaves it off, since it shows several shops at once.
  withPortals?: boolean | undefined;
}

/** The shop's palette as CSS variables: the shop tokens plus the app tokens every installed part reads. */
export function shopThemeVars(palette: ShopPalette): CssVarsObject {
  return {
    '--shop-60': palette.shop60,
    '--shop-30': palette.shop30,
    '--shop-10': palette.shop10,
    '--shop-10-foreground': palette.shop10Foreground,
    '--shop-10-hover': palette.shop10Hover,
    '--shop-10-text': palette.shop10Text,
    '--shop-10-soft': palette.shop10Soft,
    '--shop-10-soft-foreground': palette.shop10SoftForeground,
    // Keeps the older bg-shop / text-shop utilities on the same colour.
    '--shop-color': palette.shop10,
    // Buttons, rings, cards and inputs follow the shop, never the app's default blue.
    // Sheets and dialogs read as cards when the page is on the other side (white sheets on a red page).
    '--background': palette.mixed ? palette.shop30 : palette.shop60,
    '--foreground': palette.foreground,
    '--card': palette.shop30,
    '--card-foreground': palette.foreground,
    '--popover': palette.shop30,
    '--popover-foreground': palette.foreground,
    '--primary': palette.shop10,
    '--primary-foreground': palette.shop10Foreground,
    '--primary-hover': palette.shop10Hover,
    '--secondary': palette.shop10Soft,
    '--secondary-foreground': palette.shop10SoftForeground,
    '--ring': palette.shop10Text,
    '--focus': palette.shop10Text,
    // Words straight on the page (60); globals.css applies them inside [data-page-surface] when mixed.
    '--page-foreground': palette.page.foreground,
    '--page-muted-foreground': palette.page.muted,
    '--page-link': palette.page.link,
    '--card-link': palette.shop10Text,
    ...(palette.cardMuted
      ? { '--muted-foreground': palette.cardMuted, '--card-muted-foreground': palette.cardMuted }
      : {}),
    // With a page colour, quiet fills and lines follow its hue.
    ...(palette.tint
      ? {
          '--muted': palette.tint.muted,
          '--accent': palette.tint.muted,
          '--border': palette.tint.border,
          '--input': palette.tint.border,
        }
      : {}),
  };
}

// Server-safe: no hooks, so a Next server component can wrap a shop's pages with it.
export function ShopTheme({
  brandColor,
  surface = 'light',
  pageColor,
  cardColor,
  fontPair = 'malinaw',
  withPortals = false,
  className,
  children,
  ...props
}: ShopThemeProps) {
  const palette = shopPalette(brandColor, surface, pageColor, cardColor);
  const vars = { ...shopThemeVars(palette), ...fontPairVars(fontPair) };
  // Cards, sheets and dialogs carry most of the words, so the app's dark tokens follow the cards (T76 C4).
  const dark = palette.dark;
  return (
    <div
      data-slot="shop-theme"
      data-surface={dark ? 'dark' : 'light'}
      data-surface-mix={palette.mixed ? 'mixed' : undefined}
      data-font-pair={fontPair}
      className={cn('contents font-sans', dark && 'dark', className)}
      style={cssVars(vars)}
      {...props}
    >
      {withPortals ? <ShopThemeDocument vars={vars} dark={dark} /> : null}
      {children}
    </div>
  );
}
