// Dev-only scenario switch (decision T26): slow, error, empty, offline, closed, no stamp card and member
// states on any page.
// Production builds never load this module: the storefront imports it dynamically behind a NODE_ENV
// check, so neither its code nor its source text ships.
import {
  DEFAULT_SCENARIO,
  DemoCustomerStateEnum,
  getMockScenario,
  MockScenarioSchema,
  replaceScenario,
  type MockScenario,
} from './scenario-state';

export * from './scenario-state';

// Bundlers replace process.env.NODE_ENV at build time (Next and Vite), so dev-only code drops out of production.
declare const process: { env: { NODE_ENV?: string | undefined } };

function sessionKey(): string {
  return 'smartapp:mock-scenario';
}

export function setMockScenario(patch: Partial<MockScenario>): MockScenario {
  if (process.env.NODE_ENV === 'production') return getMockScenario();
  const current = MockScenarioSchema.parse({ ...getMockScenario(), ...patch });
  try {
    if (typeof window !== 'undefined')
      window.sessionStorage.setItem(sessionKey(), JSON.stringify(current));
  } catch {
    // Session storage blocked: the scenario lasts until reload.
  }
  replaceScenario(current);
  return current;
}

/** Restores the scenario saved in this tab (dev only). */
export function loadMockScenario(): MockScenario {
  if (process.env.NODE_ENV === 'production') return getMockScenario();
  try {
    const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem(sessionKey()) : null;
    const parsed = raw ? MockScenarioSchema.safeParse(JSON.parse(raw)) : null;
    if (parsed?.success) replaceScenario(parsed.data);
  } catch {
    // Ignore a broken or blocked session value.
  }
  return getMockScenario();
}

export interface UrlScenario {
  scenario: Partial<MockScenario>;
  // ?mock=basket: fill the basket with 3 demo lines (screens built before the menu).
  fillBasket: boolean;
}

const MOCK_VALUES = [
  'slow',
  'error',
  'empty',
  'offline',
  'closed',
  'nocard',
  'basket',
  'none',
] as const;

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
    case 'nocard':
      out.scenario.noCard = true;
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
  if (Object.keys(parsed.scenario).length > 0) {
    const reset = params.has('mock')
      ? {
          latency: 'normal' as const,
          fail: null,
          empty: false,
          offline: false,
          closed: false,
          noCard: false,
        }
      : {};
    setMockScenario({ ...reset, ...parsed.scenario });
  }
  return parsed;
}
