import type { ComponentType } from 'react';
import { InfoIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Pattern as InfoVariant } from './examples/c-alert-5';
import { Pattern as IconStackBasic } from './examples/c-icon-stack-1';
import { Pattern as IconStackEmpty } from './examples/c-icon-stack-5';
import { Pattern as SoftBadges } from './examples/c-badge-13';
import { Pattern as StampFrame } from './examples/c-frame-1';
import { Pattern as StampedTiles } from './examples/c-icon-tile-16';
import { Pattern as PendingTiles } from './examples/c-icon-tile-14';
import { Pattern as MessageThread } from './examples/c-message-5';
import { Pattern as QuantityStepper } from './examples/c-number-field-3';
import { Pattern as ScrollspyRail } from './examples/c-scrollspy-1';
import { Pattern as ScrollspyChips } from './examples/c-scrollspy-2';
import { Pattern as Checkpoints } from './examples/c-stepper-26';
import { Pattern as LoadingStepper } from './examples/c-stepper-3';
import { Pattern as Roadmap } from './examples/c-timeline-7';
import { KitSection } from './kit-section.js';

const BADGE_VARIANTS = [
  'default',
  'secondary',
  'outline',
  'info',
  'success',
  'warning',
  'destructive',
  'focus',
  'invert',
  'primary-light',
  'info-light',
  'success-light',
  'warning-light',
  'destructive-light',
  'invert-light',
  'focus-light',
  'primary-outline',
  'info-outline',
  'success-outline',
  'warning-outline',
  'destructive-outline',
  'invert-outline',
  'focus-outline',
] as const;

const ALERT_VARIANTS = ['default', 'info', 'success', 'warning', 'destructive', 'invert'] as const;

const SECTIONS: readonly {
  title: string;
  library: string;
  file: string;
  usedIn: string;
  examples: readonly ComponentType[];
}[] = [
  {
    title: 'Stepper',
    library: 'ReUI',
    file: 'reui/stepper.tsx',
    usedIn: 'c-stepper-3, c-stepper-13, c-stepper-26 (kit)',
    examples: [Checkpoints, LoadingStepper],
  },
  {
    title: 'Timeline',
    library: 'ReUI',
    file: 'reui/timeline.tsx',
    usedIn: 'c-timeline-3, c-timeline-7 (kit)',
    examples: [Roadmap],
  },
  {
    title: 'Number field',
    library: 'ReUI',
    file: 'reui/number-field.tsx',
    usedIn: 'c-number-field-2, c-number-field-3 (kit)',
    examples: [QuantityStepper],
  },
  {
    title: 'Scrollspy',
    library: 'ReUI',
    file: 'reui/scrollspy.tsx',
    usedIn: 'c-scrollspy-1, c-scrollspy-2 (kit)',
    examples: [ScrollspyChips],
  },
  {
    title: 'Scroll area',
    library: 'shadcn (base-nova)',
    file: 'scroll-area.tsx',
    usedIn: 'c-scrollspy-1, c-scrollspy-2 (kit)',
    examples: [ScrollspyRail],
  },
  {
    title: 'Icon tile',
    library: 'ReUI',
    file: 'reui/icon-tile.tsx',
    usedIn: 'c-icon-tile-6, c-icon-tile-14, c-icon-tile-16 (kit)',
    examples: [StampedTiles, PendingTiles],
  },
  {
    title: 'Icon stack',
    library: 'ReUI',
    file: 'reui/icon-stack.tsx',
    usedIn: 'c-icon-stack-1, c-icon-stack-5 (kit); brand panel facts and empty states (redesign)',
    examples: [IconStackBasic, IconStackEmpty],
  },
  {
    title: 'Frame',
    library: 'ReUI',
    file: 'reui/frame.tsx',
    usedIn: 'c-frame-1, c-card-16 (kit)',
    examples: [StampFrame],
  },
  {
    title: 'Bubble',
    library: 'shadcn (base-nova)',
    file: 'bubble.tsx',
    usedIn: 'c-message-5 (kit)',
    examples: [MessageThread],
  },
];

/** One /kit section per primitive the ReUI examples installed (T02b). */
export function ReuiPrimitiveSections() {
  return (
    <div className="space-y-12">
      <KitSection
        title="Badge (ReUI)"
        library="ReUI (variants mapped to our tokens, decision T28)"
        path="packages/ui/src/components/reui/badge.tsx"
        usedIn="c-badge-* and other examples (kit)"
      >
        <div className="flex flex-wrap gap-2">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
        <SoftBadges />
      </KitSection>

      <KitSection
        title="Alert (ReUI)"
        library="ReUI (variants mapped to our tokens, decision T28)"
        path="packages/ui/src/components/reui/alert.tsx"
        usedIn="c-alert-* examples (kit)"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {ALERT_VARIANTS.map((variant) => (
            <Alert key={variant} variant={variant}>
              <InfoIcon aria-hidden="true" />
              <AlertTitle>{variant}</AlertTitle>
              <AlertDescription>Text on the {variant} alert stays readable.</AlertDescription>
            </Alert>
          ))}
        </div>
        <InfoVariant />
      </KitSection>

      {SECTIONS.map((section) => (
        <KitSection
          key={section.file}
          title={section.title}
          library={section.library}
          path={`packages/ui/src/components/${section.file}`}
          usedIn={section.usedIn}
        >
          <div className="flex flex-col items-center gap-6">
            {section.examples.map((Example, i) => (
              <Example key={i} />
            ))}
          </div>
        </KitSection>
      ))}
    </div>
  );
}
