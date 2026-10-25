// Home: ReUI patterns, loaded lazily by storefront-patterns.tsx.
import { PatternGrid } from './pattern-grid.js';
import { Pattern as InfoVariant } from './examples/c-alert-5';
import { Pattern as SuccessVariant } from './examples/c-alert-6';
import { Pattern as Ultrawide } from './examples/c-aspect-ratio-4';
import { Pattern as SocialProofPill } from './examples/c-avatar-20';
import { Pattern as MoreLessToggle } from './examples/c-button-35';
import { Pattern as InsetImage } from './examples/c-card-7';
import { Pattern as IconLink } from './examples/c-card-17';
import { Pattern as Autoplay } from './examples/c-carousel-5';
import { Pattern as DotsNavigation } from './examples/c-carousel-11';
import { Pattern as EventsCalendar } from './examples/c-empty-20';
import { Pattern as NavigationLinks } from './examples/c-item-4';
import { Pattern as CardGrid } from './examples/c-skeleton-8';
import { Pattern as EmployeeProfile } from './examples/c-table-16';

const EXAMPLES = {
  'c-alert-5': InfoVariant,
  'c-alert-6': SuccessVariant,
  'c-aspect-ratio-4': Ultrawide,
  'c-avatar-20': SocialProofPill,
  'c-button-35': MoreLessToggle,
  'c-card-7': InsetImage,
  'c-card-17': IconLink,
  'c-carousel-5': Autoplay,
  'c-carousel-11': DotsNavigation,
  'c-empty-20': EventsCalendar,
  'c-item-4': NavigationLinks,
  'c-skeleton-8': CardGrid,
  'c-table-16': EmployeeProfile,
};

export default function HomePatterns() {
  return <PatternGrid screen="home" examples={EXAMPLES} />;
}
