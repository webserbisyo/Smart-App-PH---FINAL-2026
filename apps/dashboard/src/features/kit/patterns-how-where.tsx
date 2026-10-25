// How and where: ReUI patterns, loaded lazily by storefront-patterns.tsx.
import { PatternGrid } from './pattern-grid.js';
import { Pattern as TabsWithIcons } from './examples/c-tabs-9';
import { Pattern as WarningVariant } from './examples/c-alert-7';
import { Pattern as ErrorVariant } from './examples/c-alert-8';
import { Pattern as AsyncAction } from './examples/c-button-44';
import { Pattern as InputTextarea } from './examples/c-field-2';
import { Pattern as RequiredIndicator } from './examples/c-input-13';
import { Pattern as OptionalBadge } from './examples/c-input-18';
import { Pattern as Invalid } from './examples/c-input-group-3';
import { Pattern as ActionButton } from './examples/c-input-group-10';
import { Pattern as SuccessIndicator } from './examples/c-input-group-24';
import { Pattern as Variants } from './examples/c-item-1';
import { Pattern as GroupedOptions } from './examples/c-native-select-2';
import { Pattern as Descriptions } from './examples/c-radio-group-3';
import { Pattern as DescriptiveCards } from './examples/c-radio-group-7';
import { Pattern as CardSeparators } from './examples/c-radio-group-8';

const EXAMPLES = {
  'c-tabs-9': TabsWithIcons,
  'c-alert-7': WarningVariant,
  'c-alert-8': ErrorVariant,
  'c-button-44': AsyncAction,
  'c-field-2': InputTextarea,
  'c-input-13': RequiredIndicator,
  'c-input-18': OptionalBadge,
  'c-input-group-3': Invalid,
  'c-input-group-10': ActionButton,
  'c-input-group-24': SuccessIndicator,
  'c-item-1': Variants,
  'c-native-select-2': GroupedOptions,
  'c-radio-group-3': Descriptions,
  'c-radio-group-7': DescriptiveCards,
  'c-radio-group-8': CardSeparators,
};

export default function HowAndWherePatterns() {
  return <PatternGrid screen="howWhere" examples={EXAMPLES} />;
}
