// Basket: ReUI patterns, loaded lazily by storefront-patterns.tsx.
import { PatternGrid } from './pattern-grid.js';
import { Pattern as SmallSize } from './examples/c-alert-dialog-2';
import { Pattern as ExtraSmallIcon } from './examples/c-button-24';
import { Pattern as QuickActions } from './examples/c-dropdown-menu-16';
import { Pattern as Bookmarks } from './examples/c-empty-11';
import { Pattern as SmallSize2 } from './examples/c-number-field-2';
import { Pattern as OrderSummary } from './examples/c-separator-6';

const EXAMPLES = {
  'c-alert-dialog-2': SmallSize,
  'c-button-24': ExtraSmallIcon,
  'c-dropdown-menu-16': QuickActions,
  'c-empty-11': Bookmarks,
  'c-number-field-2': SmallSize2,
  'c-separator-6': OrderSummary,
};

export default function BasketPatterns() {
  return <PatternGrid screen="basket" examples={EXAMPLES} />;
}
