// The dashboard's Preview panel (decision T100): who you are, a test scenario and the clock, on sample data
// in development and preview builds. Loaded lazily by App, so live builds never contain it. Every change
// reloads the page through the same ?mock= and ?now= links the scenarios already use, so a pasted link
// shows exactly the same thing.
import { useEffect } from 'react';
import { DEMO_SHOPS, manilaDate, manilaToDate, previewWords } from '@smartapp/core';
import { getMockScenario, ordersTrickle } from '@smartapp/data';
import { PreviewPanel, type PreviewPanelOption } from '@smartapp/ui/compositions/preview-panel';
import { PreviewViewerSchema, readPreviewViewer, writePreviewViewer } from './preview.js';

const W = previewWords;

const SCENARIOS = [
  'none',
  'slow',
  'error',
  'empty',
  'offline',
  'closed',
  'nocard',
  'orders-rush',
  'orders-empty',
  'orders-trickle',
  'plan-trial',
  'plan-due',
  'plan-overdue',
  'plan-paused',
  'storage-full',
  'export-fail',
  'stage-setting-up',
  'stage-asked',
  'home-quiet',
  'home-new',
  'home-closed',
  'home-error',
  'home-slow',
] as const satisfies readonly (keyof typeof previewWords.scenarios)[];

// Manila times for the clock switch; "now" follows the real clock.
const CLOCKS = {
  now: null,
  morning: '05:30',
  lunch: '12:30',
  evening: '19:00',
  late: '23:30',
} as const;
type ClockId = keyof typeof CLOCKS;
const CLOCK_IDS = [
  'now',
  'morning',
  'lunch',
  'evening',
  'late',
] as const satisfies readonly ClockId[];

const CHOICE_KEY = 'smartapp:preview-choice';

interface Choice {
  scenario: (typeof SCENARIOS)[number];
  clock: ClockId;
}

function readChoice(): Choice {
  const fallback: Choice = { scenario: 'none', clock: 'now' };
  try {
    const raw = window.sessionStorage.getItem(CHOICE_KEY) ?? '';
    const [scenario, clock] = raw.split('|');
    // A pasted ?mock= link wins over what was picked before.
    const params = new URLSearchParams(window.location.search);
    const linked = SCENARIOS.find((s) => s === params.get('mock'));
    return {
      scenario: linked ?? SCENARIOS.find((s) => s === scenario) ?? fallback.scenario,
      clock:
        linked && !params.has('now')
          ? 'now'
          : (CLOCK_IDS.find((c) => c === clock) ?? fallback.clock),
    };
  } catch {
    return fallback;
  }
}

function apply(next: Choice): void {
  try {
    window.sessionStorage.setItem(CHOICE_KEY, `${next.scenario}|${next.clock}`);
  } catch {
    // Session storage blocked: the link below still applies the scenario for this load.
  }
  const url = new URL(window.location.href);
  url.searchParams.set('mock', next.scenario);
  const time = CLOCKS[next.clock];
  if (time) url.searchParams.set('now', manilaToDate(manilaDate(new Date()), time).toISOString());
  else url.searchParams.delete('now');
  window.location.assign(url.toString());
}

const VIEWER_OPTIONS: readonly PreviewPanelOption[] = [
  ...DEMO_SHOPS.map((shop) => ({ value: shop.slug, label: W.owner(shop.ownerName, shop.name) })),
  { value: 'admin', label: W.admin },
];

export default function PreviewSwitches() {
  const viewer = readPreviewViewer();
  const choice = readChoice();

  // "New order every 20 s" keeps a timer, which a reload stops; start it again.
  useEffect(() => {
    if (getMockScenario().ordersMode === 'trickle') ordersTrickle(true);
  }, []);

  const clockLabel = choice.clock === 'now' ? '' : ` · ${W.clocks[choice.clock]}`;
  return (
    <PreviewPanel
      pill={W.pill}
      summary={`${W.scenarios[choice.scenario]}${clockLabel}`}
      title={W.title}
      hint={W.hint}
      fields={[
        ...(viewer
          ? [
              {
                id: 'viewer',
                label: W.viewAs,
                value: viewer,
                options: VIEWER_OPTIONS,
                onChange: (value: string) => {
                  const parsed = PreviewViewerSchema.safeParse(value);
                  if (!parsed.success) return;
                  writePreviewViewer(parsed.data);
                  window.location.assign(parsed.data === 'admin' ? '/admin' : '/');
                },
              },
            ]
          : []),
        {
          id: 'scenario',
          label: W.scenario,
          value: choice.scenario,
          options: SCENARIOS.map((s) => ({ value: s, label: W.scenarios[s] })),
          onChange: (value: string) =>
            apply({ ...choice, scenario: SCENARIOS.find((s) => s === value) ?? 'none' }),
        },
        {
          id: 'clock',
          label: W.clock,
          value: choice.clock,
          options: CLOCK_IDS.map((c) => ({ value: c, label: W.clocks[c] })),
          onChange: (value: string) =>
            apply({ ...choice, clock: CLOCK_IDS.find((c) => c === value) ?? 'now' }),
        },
      ]}
    />
  );
}
