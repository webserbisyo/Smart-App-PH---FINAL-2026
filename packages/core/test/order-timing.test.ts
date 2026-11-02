import { describe, expect, it } from 'vitest';
import { dueTimes, orderTiming } from '../src/rules/order-timing.js';
import type { OrderStatus } from '../src/schemas/enums.js';

// Manila time helper: "2026-10-26 12:00" → ISO UTC.
const mnl = (local: string) => new Date(`${local.replace(' ', 'T')}:00+08:00`).toISOString();

describe('dueTimes (decision T48)', () => {
  it('ASAP: due after prep, start at once', () => {
    const t = dueTimes({ placedAt: mnl('2026-10-26 12:00'), scheduledAt: null, prepMinutes: 20 });
    expect(t).toEqual({ dueAt: mnl('2026-10-26 12:20'), startBy: mnl('2026-10-26 12:00') });
  });

  it('scheduled: due at the slot, start prep minutes before (offset input normalised)', () => {
    const t = dueTimes({
      placedAt: mnl('2026-10-26 10:00'),
      scheduledAt: '2026-10-26T15:00:00+08:00',
      prepMinutes: 20,
    });
    expect(t).toEqual({ dueAt: mnl('2026-10-26 15:00'), startBy: mnl('2026-10-26 14:40') });
  });
});

describe('orderTiming (age counts from startBy)', () => {
  const order = (status: OrderStatus) => ({
    status,
    dueAt: mnl('2026-10-26 15:00'),
    startBy: mnl('2026-10-26 14:40'),
  });

  it.each([
    ['2026-10-26 09:00', 'scheduled', 'calm'],
    ['2026-10-26 13:00', 'upcoming', 'calm'],
    ['2026-10-26 14:45', 'active', 'calm'],
    ['2026-10-26 14:50', 'active', 'amber'],
    ['2026-10-26 15:00', 'active', 'red'],
  ] as const)('placed at %s is %s and %s', (now, phase, tone) => {
    const t = orderTiming(order('placed'), mnl(now));
    expect(t.phase).toBe(phase);
    expect(t.ageTone).toBe(tone);
  });

  it('a 3 PM cake is never late in the morning', () => {
    const t = orderTiming(order('placed'), mnl('2026-10-26 09:00'));
    expect(t.lateMinutes).toBe(0);
    expect(t.minutesToStart).toBe(340);
  });

  it('preparing is active; amber at 10 min and red at 20 min past startBy', () => {
    expect(orderTiming(order('preparing'), mnl('2026-10-26 14:45')).ageTone).toBe('calm');
    expect(orderTiming(order('preparing'), mnl('2026-10-26 14:50')).ageTone).toBe('amber');
    expect(orderTiming(order('preparing'), mnl('2026-10-26 15:05')).ageTone).toBe('red');
    expect(orderTiming(order('preparing'), mnl('2026-10-26 15:05')).lateMinutes).toBe(5);
  });

  it('ready goes amber 15 minutes after dueAt, not before', () => {
    expect(orderTiming(order('ready'), mnl('2026-10-26 15:10')).ageTone).toBe('calm');
    expect(orderTiming(order('ready'), mnl('2026-10-26 15:15')).ageTone).toBe('amber');
  });

  it.each(['completed', 'cancelled', 'expired'] as const)('%s is done and calm', (status) => {
    const t = orderTiming(order(status), mnl('2026-10-26 18:00'));
    expect(t).toEqual({ phase: 'done', minutesToStart: 0, lateMinutes: 0, ageTone: 'calm' });
  });
});
