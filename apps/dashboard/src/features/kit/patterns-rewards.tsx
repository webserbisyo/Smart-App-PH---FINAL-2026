// Rewards and account: ReUI patterns, loaded lazily by storefront-patterns.tsx.
import { PatternGrid } from './pattern-grid.js';
import { Pattern as UserDetails } from './examples/c-avatar-16';
import { Pattern as DropdownMenu } from './examples/c-avatar-35';
import { Pattern as Basic } from './examples/c-card-1';
import { Pattern as BadgeActions } from './examples/c-card-16';
import { Pattern as NotificationPreferences } from './examples/c-field-10';
import { Pattern as Basic1 } from './examples/c-frame-1';
import { Pattern as Circular } from './examples/c-icon-tile-6';
import { Pattern as StatusOverlay } from './examples/c-icon-tile-14';
import { Pattern as SolidTones } from './examples/c-icon-tile-16';
import { Pattern as SuffixIcon } from './examples/c-input-group-5';
import { Pattern as VerificationCard } from './examples/c-input-otp-6';
import { Pattern as ProfilePage } from './examples/c-skeleton-9';
import { Pattern as InBadges } from './examples/c-spinner-3';
import { Pattern as LineVariant } from './examples/c-tabs-2';
import { Pattern as RoadmapItems } from './examples/c-timeline-7';

const EXAMPLES = {
  'c-avatar-16': UserDetails,
  'c-avatar-35': DropdownMenu,
  'c-card-1': Basic,
  'c-card-16': BadgeActions,
  'c-field-10': NotificationPreferences,
  'c-frame-1': Basic1,
  'c-icon-tile-6': Circular,
  'c-icon-tile-14': StatusOverlay,
  'c-icon-tile-16': SolidTones,
  'c-input-group-5': SuffixIcon,
  'c-input-otp-6': VerificationCard,
  'c-skeleton-9': ProfilePage,
  'c-spinner-3': InBadges,
  'c-tabs-2': LineVariant,
  'c-timeline-7': RoadmapItems,
};

export default function RewardsAndAccountPatterns() {
  return <PatternGrid screen="rewards" examples={EXAMPLES} />;
}
