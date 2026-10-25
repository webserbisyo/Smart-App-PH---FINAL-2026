// Item sheet: ReUI patterns, loaded lazily by storefront-patterns.tsx.
import { PatternGrid } from './pattern-grid.js';
import { Pattern as Standard } from './examples/c-aspect-ratio-2';
import { Pattern as CardRows } from './examples/c-checkbox-11';
import { Pattern as BadgeGroup } from './examples/c-checkbox-19';
import { Pattern as StickyFooter } from './examples/c-dialog-3';
import { Pattern as ScrollableContent } from './examples/c-drawer-1';
import { Pattern as LargeSize } from './examples/c-number-field-3';
import { Pattern as Invalid4 } from './examples/c-radio-group-4';
import { Pattern as LegendDescription } from './examples/c-radio-group-6';
import { Pattern as PricingTiers } from './examples/c-radio-group-17';
import { Pattern as Card } from './examples/c-skeleton-2';
import { Pattern as AutoResizeCounter } from './examples/c-textarea-6';
import { Pattern as CustomSpacing } from './examples/c-toggle-group-4';

const EXAMPLES = {
  'c-aspect-ratio-2': Standard,
  'c-checkbox-11': CardRows,
  'c-checkbox-19': BadgeGroup,
  'c-dialog-3': StickyFooter,
  'c-drawer-1': ScrollableContent,
  'c-number-field-3': LargeSize,
  'c-radio-group-4': Invalid4,
  'c-radio-group-6': LegendDescription,
  'c-radio-group-17': PricingTiers,
  'c-skeleton-2': Card,
  'c-textarea-6': AutoResizeCounter,
  'c-toggle-group-4': CustomSpacing,
};

export default function ItemSheetPatterns() {
  return <PatternGrid screen="itemSheet" examples={EXAMPLES} />;
}
