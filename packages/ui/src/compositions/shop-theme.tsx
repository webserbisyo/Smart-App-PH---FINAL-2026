import type { ComponentProps } from 'react';
import { cn } from 'cn';
import { shopPalette, type ShopPalette } from '@smartapp/core/rules/palette';
import type { ShopSurface } from '@smartapp/core/schemas/enums';
import { cssVars, type CssVarsObject } from '../lib/css-vars';
import { ShopThemeDocument } from './shop-theme-document';

export interface ShopThemeProps extends Omit<ComponentProps<'div'>, 'style'> {
  // The owner's one brand colour (hex); shopPalette() turns it into the readable 60/30/10 palette.
  brandColor: string;
  // Light or dark page (decision R2). A dark shop also gets the app's dark tokens (muted, borders, states).
  surface?: ShopSurface | undefined;
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
    '--background': palette.shop60,
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
  };
}

// Server-safe: no hooks, so a Next server component can wrap a shop's pages with it.
export function ShopTheme({
  brandColor,
  surface = 'light',
  withPortals = false,
  className,
  children,
  ...props
}: ShopThemeProps) {
  const vars = shopThemeVars(shopPalette(brandColor, surface));
  const dark = surface === 'dark';
  return (
    <div
      data-slot="shop-theme"
      data-surface={surface}
      className={cn('contents', dark && 'dark', className)}
      style={cssVars(vars)}
      {...props}
    >
      {withPortals ? <ShopThemeDocument vars={vars} dark={dark} /> : null}
      {children}
    </div>
  );
}
