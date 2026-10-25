// Shell: ReUI patterns, loaded lazily by storefront-patterns.tsx.
import { PatternGrid } from './pattern-grid.js';
import { Pattern as BorderRadius } from './examples/c-avatar-4';
import { Pattern as StatusDots } from './examples/c-avatar-6';
import { Pattern as GroupWithCount } from './examples/c-avatar-11';
import { Pattern as SoftFallbacks } from './examples/c-avatar-14';
import { Pattern as LoadingState } from './examples/c-avatar-30';
import { Pattern as FullRadius } from './examples/c-badge-19';
import { Pattern as OutlineIconRight } from './examples/c-button-19';
import { Pattern as NextLink } from './examples/c-button-27';
import { Pattern as GoBack } from './examples/c-button-49';
import { Pattern as RightSide } from './examples/c-drawer-2';
import { Pattern as Inbox } from './examples/c-empty-7';
import { Pattern as FullPage } from './examples/c-spinner-8';
import { Pattern as DisabledButton } from './examples/c-tooltip-12';

const EXAMPLES = {
  'c-avatar-4': BorderRadius,
  'c-avatar-6': StatusDots,
  'c-avatar-11': GroupWithCount,
  'c-avatar-14': SoftFallbacks,
  'c-avatar-30': LoadingState,
  'c-badge-19': FullRadius,
  'c-button-19': OutlineIconRight,
  'c-button-27': NextLink,
  'c-button-49': GoBack,
  'c-drawer-2': RightSide,
  'c-empty-7': Inbox,
  'c-spinner-8': FullPage,
  'c-tooltip-12': DisabledButton,
};

export default function ShellPatterns() {
  return <PatternGrid screen="shell" examples={EXAMPLES} />;
}
