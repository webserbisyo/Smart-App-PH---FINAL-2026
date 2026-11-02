import type { Category, CategoryIconStyle } from '@smartapp/core';

// One icon style for the whole shop (decision T42): the style the shop's icons already use,
// Flat until the owner picks another on the Categories tab.
export function shopIconStyle(categories: readonly Category[] | undefined): CategoryIconStyle {
  for (const category of categories ?? []) {
    const icon = category.icon;
    if (icon && typeof icon === 'object' && icon.kind === 'fluent' && icon.style) return icon.style;
  }
  return 'flat';
}
