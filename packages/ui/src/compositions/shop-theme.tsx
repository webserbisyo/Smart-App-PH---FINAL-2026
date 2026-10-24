import type { ComponentProps } from 'react';
import { cn } from 'cn';
import { shopPalette } from '@smartapp/core/rules/palette';
import { cssVars } from '../lib/css-vars';

export interface ShopThemeProps extends Omit<ComponentProps<'div'>, 'style'> {
  // The owner's one brand colour (hex); shopPalette() turns it into the readable 60/30/10 palette.
  brandColor: string;
}

// Server-safe: no hooks, so a Next server component can wrap a shop's pages with it.
export function ShopTheme({ brandColor, className, ...props }: ShopThemeProps) {
  const palette = shopPalette(brandColor);
  return (
    <div
      data-slot="shop-theme"
      className={cn('contents', className)}
      style={cssVars({
        '--shop-60': palette.shop60,
        '--shop-30': palette.shop30,
        '--shop-10': palette.shop10,
        '--shop-10-foreground': palette.shop10Foreground,
        '--shop-10-soft': palette.shop10Soft,
        '--shop-10-hover': palette.shop10Hover,
        // Keeps the older bg-shop / text-shop utilities on the same colour.
        '--shop-color': palette.shop10,
      })}
      {...props}
    />
  );
}
