// Menu: ReUI patterns, loaded lazily by storefront-patterns.tsx.
import { PatternGrid } from './pattern-grid.js';
import { Pattern as Square } from './examples/c-aspect-ratio-3';
import { Pattern as Outline } from './examples/c-badge-7';
import { Pattern as PrimaryLight } from './examples/c-badge-13';
import { Pattern as DestructiveLight } from './examples/c-badge-14';
import { Pattern as IconButton } from './examples/c-button-11';
import { Pattern as NoResults } from './examples/c-empty-2';
import { Pattern as StackedProducts } from './examples/c-empty-15';
import { Pattern as LoadingSpinner } from './examples/c-input-group-15';
import { Pattern as OrderSearch } from './examples/c-input-group-37';
import { Pattern as IconActions } from './examples/c-item-2';
import { Pattern as VerticalNav } from './examples/c-scrollspy-1';
import { Pattern as HorizontalNav } from './examples/c-scrollspy-2';
import { Pattern as ListWithActions } from './examples/c-skeleton-7';
import { Pattern as IconLabel } from './examples/c-toggle-6';
import { Pattern as IconSwap } from './examples/c-toggle-9';

const EXAMPLES = {
  'c-aspect-ratio-3': Square,
  'c-badge-7': Outline,
  'c-badge-13': PrimaryLight,
  'c-badge-14': DestructiveLight,
  'c-button-11': IconButton,
  'c-empty-2': NoResults,
  'c-empty-15': StackedProducts,
  'c-input-group-15': LoadingSpinner,
  'c-input-group-37': OrderSearch,
  'c-item-2': IconActions,
  'c-scrollspy-1': VerticalNav,
  'c-scrollspy-2': HorizontalNav,
  'c-skeleton-7': ListWithActions,
  'c-toggle-6': IconLabel,
  'c-toggle-9': IconSwap,
};

export default function MenuPatterns() {
  return <PatternGrid screen="menu" examples={EXAMPLES} />;
}
