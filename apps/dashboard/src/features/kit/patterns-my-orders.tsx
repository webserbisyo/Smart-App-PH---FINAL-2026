// My orders: ReUI patterns, loaded lazily by storefront-patterns.tsx.
import { PatternGrid } from './pattern-grid.js';
import { Pattern as SuccessLight } from './examples/c-badge-15';
import { Pattern as WarningLight } from './examples/c-badge-17';
import { Pattern as StatusDot } from './examples/c-badge-22';
import { Pattern as AddButton } from './examples/c-empty-4';
import { Pattern as HeaderFooter } from './examples/c-item-10';
import { Pattern as BadgeCounts } from './examples/c-tabs-7';

const EXAMPLES = {
  'c-badge-15': SuccessLight,
  'c-badge-17': WarningLight,
  'c-badge-22': StatusDot,
  'c-empty-4': AddButton,
  'c-item-10': HeaderFooter,
  'c-tabs-7': BadgeCounts,
};

export default function MyOrdersPatterns() {
  return <PatternGrid screen="myOrders" examples={EXAMPLES} />;
}
