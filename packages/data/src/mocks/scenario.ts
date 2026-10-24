// Dev-only scenario switch (decision T26): slow, error, empty, offline, closed and member states on any page.
// Production builds never run it: every entry point checks NODE_ENV first, so bundlers drop the code.
import { z } from 'zod';
import { IsoDateTimeSchema } from '@smartapp/core';

// Bundlers replace process.env.NODE_ENV at build time (Next and Vite), so dev-only code drops out of production.
declare const process: { env: { NODE_ENV?: string | undefined } };

export const MOCK_AREAS = ['storefront', 'orders', 'account', 'auth', 'all'] as const;
export const DEMO_CUSTOMER_STATES = [
  'guest',
  'member',
  'member-ready',
  'member-pending',
  'member-capped',
] as const;
export const DemoCustomerStateEnum = z.enum(DEMO_CUSTOMER_STATES);
export type DemoCustomerState = z.infer<typeof DemoCustomerStateEnum>;

export const MockScenarioSchema = z.object({
  latency: z.enum(['none', 'normal', 'slow']),
  fail: z.enum(MOCK_AREAS).nullable(),
  empty: z.boolean(),
  offline: z.boolean(),
  closed: z.boolean(),
  now: IsoDateTimeSchema.nullable(),
  as: DemoCustomerStateEnum.nullable(),
});
export type MockScenario = z.infer<typeof MockScenarioSchema>;

export const DEFAULT_SCENARIO: MockScenario = {
  latency: 'normal',
  fail: null,
  empty: false,
  offline: false,
  closed: false,
  now: null,
  as: null,
};

let current: MockScenario = DEFAULT_SCENARIO;
const listeners = new Set<() => void>();

export function isDevMock(dataSource: string): boolean {
  return process.env.NODE_ENV !== 'production' && dataSource === 'mock';
}

export function getMockScenario(): MockScenario {
  return current;
}

export function subscribeMockScenario(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function sessionKey(): string {
  return 'smartapp:mock-scenario';
}

export function setMockScenario(patch: Partial<MockScenario>): MockScenario {
  if (process.env.NODE_ENV === 'production') return current;
  current = MockScenarioSchema.parse({ ...current, ...patch });
  try {
    if (typeof window !== 'undefined')
      window.sessionStorage.setItem(sessionKey(), JSON.stringify(current));
  } catch {
    // Session storage blocked: the scenario lasts until reload.
  }
  for (const listener of listeners) listener();
  return current;
}

/** Restores the scenario saved in this tab (dev only). */
export function loadMockScenario(): MockScenario {
  if (process.env.NODE_ENV === 'production') return current;
  try {
    const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem(sessionKey()) : null;
    const parsed = raw ? MockScenarioSchema.safeParse(JSON.parse(raw)) : null;
    if (parsed?.success) current = parsed.data;
  } catch {
    // Ignore a broken or blocked session value.
  }
  return current;
}

export interface UrlScenario {
  scenario: Partial<MockScenario>;
  // ?mock=basket: fill the basket with 3 demo lines (screens built before the menu).
  fillBasket: boolean;
}

const MOCK_VALUES = ['slow', 'error', 'empty', 'offline', 'closed', 'basket', 'none'] as const;

/** Reads `?mock=`, `?as=` and `?now=`. Only parses; the caller applies it with setMockScenario in dev builds. */
export function parseMockScenario(params: URLSearchParams): UrlScenario {
  const out: UrlScenario = { scenario: {}, fillBasket: false };
  const mock = params.get('mock');
  const match = MOCK_VALUES.find((v) => v === mock);
  switch (match) {
    case 'slow':
      out.scenario.latency = 'slow';
      break;
    case 'error':
      out.scenario.fail = 'all';
      break;
    case 'empty':
      out.scenario.empty = true;
      break;
    case 'offline':
      out.scenario.offline = true;
      break;
    case 'closed':
      out.scenario.closed = true;
      break;
    case 'basket':
      out.fillBasket = true;
      break;
    case 'none':
      Object.assign(out.scenario, { ...DEFAULT_SCENARIO });
      break;
    default:
      break;
  }
  const as = DemoCustomerStateEnum.safeParse(params.get('as'));
  if (as.success) out.scenario.as = as.data;
  const nowParam = params.get('now');
  if (nowParam) {
    const t = new Date(nowParam);
    if (!Number.isNaN(t.getTime())) out.scenario.now = t.toISOString();
  }
  return out;
}

/** Applies the URL scenario in a dev build with mock data; a no-op otherwise (and dropped from production). */
export function readMockScenarioFromUrl(
  params: URLSearchParams,
  dataSource: string,
): UrlScenario | null {
  if (process.env.NODE_ENV === 'production') return null;
  if (dataSource !== 'mock') return null;
  const parsed = parseMockScenario(params);
  if (Object.keys(parsed.scenario).length > 0) setMockScenario(parsed.scenario);
  return parsed;
}
