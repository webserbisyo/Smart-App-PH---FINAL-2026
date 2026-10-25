// Checkout: ReUI patterns, loaded lazily by storefront-patterns.tsx.
import { PatternGrid } from './pattern-grid.js';
import { Pattern as Large } from './examples/c-button-9';
import { Pattern as CopyFeedback } from './examples/c-button-41';
import { Pattern as LabelDescription } from './examples/c-checkbox-5';
import { Pattern as Basic1 } from './examples/c-collapsible-1';
import { Pattern as WithLabel } from './examples/c-input-2';
import { Pattern as ErrorMessage } from './examples/c-input-5';
import { Pattern as CardIcons } from './examples/c-radio-group-9';
import { Pattern as Badges } from './examples/c-radio-group-15';
import { Pattern as Form } from './examples/c-skeleton-4';
import { Pattern as WithDescription } from './examples/c-switch-2';

const EXAMPLES = {
  'c-button-9': Large,
  'c-button-41': CopyFeedback,
  'c-checkbox-5': LabelDescription,
  'c-collapsible-1': Basic1,
  'c-input-2': WithLabel,
  'c-input-5': ErrorMessage,
  'c-radio-group-9': CardIcons,
  'c-radio-group-15': Badges,
  'c-skeleton-4': Form,
  'c-switch-2': WithDescription,
};

export default function CheckoutPatterns() {
  return <PatternGrid screen="checkout" examples={EXAMPLES} />;
}
