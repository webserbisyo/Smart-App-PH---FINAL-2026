// Shop info and system pages: ReUI patterns, loaded lazily by storefront-patterns.tsx.
import { PatternGrid } from './pattern-grid.js';
import { Pattern as NoNotifications } from './examples/c-empty-9';

const EXAMPLES = {
  'c-empty-9': NoNotifications,
};

export default function ShopInfoAndSystemPagesPatterns() {
  return <PatternGrid screen="shopInfo" examples={EXAMPLES} />;
}
