// Receipt: ReUI patterns, loaded lazily by storefront-patterns.tsx.
import { PatternGrid } from './pattern-grid.js';
import { Pattern as PaymentFailure } from './examples/c-alert-4';
import { Pattern as FeatureDiscovery } from './examples/c-alert-18';
import { Pattern as UploadQueue } from './examples/c-attachment-5';
import { Pattern as FilePicker } from './examples/c-attachment-6';
import { Pattern as ShareExport } from './examples/c-dropdown-menu-13';
import { Pattern as ToolCallLog } from './examples/c-marker-2';
import { Pattern as SharedFiles } from './examples/c-message-5';
import { Pattern as Small } from './examples/c-progress-2';
import { Pattern as TextParagraphs } from './examples/c-skeleton-3';
import { Pattern as ChatMessages } from './examples/c-skeleton-10';
import { Pattern as LoadingState3 } from './examples/c-stepper-3';
import { Pattern as VerticalDescriptions } from './examples/c-stepper-13';
import { Pattern as TimestampedCheckpoints } from './examples/c-stepper-26';
import { Pattern as OrderStatus } from './examples/c-timeline-3';

const EXAMPLES = {
  'c-alert-4': PaymentFailure,
  'c-alert-18': FeatureDiscovery,
  'c-attachment-5': UploadQueue,
  'c-attachment-6': FilePicker,
  'c-dropdown-menu-13': ShareExport,
  'c-marker-2': ToolCallLog,
  'c-message-5': SharedFiles,
  'c-progress-2': Small,
  'c-skeleton-3': TextParagraphs,
  'c-skeleton-10': ChatMessages,
  'c-stepper-3': LoadingState3,
  'c-stepper-13': VerticalDescriptions,
  'c-stepper-26': TimestampedCheckpoints,
  'c-timeline-3': OrderStatus,
};

export default function ReceiptPatterns() {
  return <PatternGrid screen="receipt" examples={EXAMPLES} />;
}
