// The dev scenario that mocks and hooks read (decision T26). Only scenario.ts, which production
// builds never load, can change it.
import { z } from 'zod';
import { IsoDateTimeSchema } from '@smartapp/core';

// Bundlers replace process.env.NODE_ENV at build time (Next and Vite), so dev-only code drops out of production.
declare const process: { env: { NODE_ENV?: string | undefined } };

export const MOCK_AREAS = [
  'storefront',
  'orders',
  'account',
  'auth',
  'catalog',
  'members',
  'settings',
  'home',
  'editor',
  'platform',
  'all',
] as const;
// Settings demo states (T66, T67): the plan's place in its month, and a full storage.
export const MOCK_PLAN_STATES = ['default', 'trial', 'due', 'overdue', 'paused'] as const;
export const MOCK_STORAGE_STATES = ['default', 'full'] as const;
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
  // The shop has no stamp card yet (decision R25).
  noCard: z.boolean(),
  now: IsoDateTimeSchema.nullable(),
  as: DemoCustomerStateEnum.nullable(),
  ordersMode: z.enum(['default', 'rush', 'empty', 'trickle']).default('default'),
  plan: z.enum(MOCK_PLAN_STATES).default('default'),
  storage: z.enum(MOCK_STORAGE_STATES).default('default'),
  // The next export fails, so the screen's failed state can be seen.
  exportFails: z.boolean().default(false),
  // The owner's shop stage (T89): live by default.
  stage: z.enum(['live', 'setting_up', 'asked']).default('live'),
});
export type MockScenario = z.infer<typeof MockScenarioSchema>;

export const DEFAULT_SCENARIO: MockScenario = {
  latency: 'normal',
  fail: null,
  empty: false,
  offline: false,
  closed: false,
  noCard: false,
  now: null,
  as: null,
  ordersMode: 'default',
  plan: 'default',
  storage: 'default',
  exportFails: false,
  stage: 'live',
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

/** Used by the dev-only writer in scenario.ts. */
export function replaceScenario(next: MockScenario): void {
  current = next;
  for (const listener of listeners) listener();
}
