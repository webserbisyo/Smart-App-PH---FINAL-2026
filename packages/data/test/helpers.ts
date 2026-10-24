import { DEFAULT_SCENARIO, type MockScenario } from '../src/mocks/scenario';
import { createMockStore } from '../src/mocks/store';
import { ApiRequestError } from '../src/api-client';
import type { OrderPayload } from '@smartapp/core';

// Manila time helper: "2026-10-26 12:00" → ISO UTC.
export const mnl = (local: string): string =>
  new Date(`${local.replace(' ', 'T')}:00+08:00`).toISOString();

export function testStore(start = mnl('2026-10-26 12:00'), scenario: Partial<MockScenario> = {}) {
  const clock = { now: new Date(start) };
  const sc: MockScenario = { ...DEFAULT_SCENARIO, latency: 'none', ...scenario };
  const store = createMockStore({
    seed: 7,
    now: () => clock.now,
    latency: 'none',
    scenario: () => sc,
  });
  return { store, clock, scenario: sc };
}

export async function errorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof ApiRequestError) return err.apiError.code;
    throw err;
  }
  return 'no error';
}

export function pickupPayload(
  lines: OrderPayload['lines'],
  patch: Partial<OrderPayload> = {},
): OrderPayload {
  return {
    type: 'pickup',
    scheduledAt: null,
    lines,
    customer: { name: 'Juan dela Cruz', phone: '0917 000 1234', email: null },
    delivery: null,
    paymentMethod: 'gcash',
    note: null,
    useReward: false,
    ...patch,
  };
}
