'use client';

// The storefront's Preview panel (decision T100): which demo shop, who the customer is, a test scenario and
// the clock, on sample data in development and preview builds. Loaded lazily by ShopApp, so live builds
// never contain it. Every change reloads through the ?mock=, ?as= and ?now= links the scenarios already use.
import { DEMO_SHOPS, manilaDate, manilaToDate, previewWords } from '@smartapp/core';
import { PreviewPanel } from '@smartapp/ui/compositions/preview-panel';

const W = previewWords;

const SCENARIOS = [
  'none',
  'slow',
  'error',
  'empty',
  'offline',
  'closed',
  'nocard',
  'basket',
] as const satisfies readonly (keyof typeof previewWords.scenarios)[];

const CUSTOMERS = [
  'guest',
  'member',
  'member-ready',
  'member-pending',
  'member-capped',
] as const satisfies readonly (keyof typeof previewWords.customers)[];

const CLOCKS = {
  now: null,
  morning: '05:30',
  lunch: '12:30',
  evening: '19:00',
  late: '23:30',
} as const;
const CLOCK_IDS = [
  'now',
  'morning',
  'lunch',
  'evening',
  'late',
] as const satisfies readonly (keyof typeof CLOCKS)[];
type ClockId = (typeof CLOCK_IDS)[number];

const CHOICE_KEY = 'smartapp:preview-store-choice';

interface Choice {
  scenario: (typeof SCENARIOS)[number];
  customer: (typeof CUSTOMERS)[number];
  clock: ClockId;
}

function readChoice(): Choice {
  const fallback: Choice = { scenario: 'none', customer: 'guest', clock: 'now' };
  if (typeof window === 'undefined') return fallback;
  try {
    const [scenario, customer, clock] = (window.sessionStorage.getItem(CHOICE_KEY) ?? '').split(
      '|',
    );
    const params = new URLSearchParams(window.location.search);
    const linked = SCENARIOS.find((s) => s === params.get('mock'));
    return {
      scenario: linked ?? SCENARIOS.find((s) => s === scenario) ?? fallback.scenario,
      customer:
        CUSTOMERS.find((c) => c === params.get('as')) ??
        CUSTOMERS.find((c) => c === customer) ??
        fallback.customer,
      clock:
        linked && !params.has('now')
          ? 'now'
          : (CLOCK_IDS.find((c) => c === clock) ?? fallback.clock),
    };
  } catch {
    return fallback;
  }
}

function apply(next: Choice, path?: string): void {
  try {
    window.sessionStorage.setItem(CHOICE_KEY, `${next.scenario}|${next.customer}|${next.clock}`);
  } catch {
    // Session storage blocked: the link below still applies it for this load.
  }
  const url = new URL(path ?? window.location.pathname, window.location.origin);
  url.searchParams.set('mock', next.scenario);
  url.searchParams.set('as', next.customer);
  const time = CLOCKS[next.clock];
  if (time) url.searchParams.set('now', manilaToDate(manilaDate(new Date()), time).toISOString());
  window.location.assign(url.toString());
}

export default function PreviewSwitches({ slug }: { slug: string }) {
  const choice = readChoice();
  const clockLabel = choice.clock === 'now' ? '' : ` · ${W.clocks[choice.clock]}`;
  return (
    <PreviewPanel
      pill={W.pill}
      summary={`${W.scenarios[choice.scenario]}${clockLabel}`}
      title={W.title}
      hint={W.hint}
      fields={[
        {
          id: 'shop',
          label: W.shop,
          value: slug,
          options: DEMO_SHOPS.map((shop) => ({ value: shop.slug, label: shop.name })),
          onChange: (value: string) => apply(choice, `/${value}`),
        },
        {
          id: 'customer',
          label: W.viewAs,
          value: choice.customer,
          options: CUSTOMERS.map((c) => ({ value: c, label: W.customers[c] })),
          onChange: (value: string) =>
            apply({ ...choice, customer: CUSTOMERS.find((c) => c === value) ?? 'guest' }),
        },
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
