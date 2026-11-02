import { describe, expect, it } from 'vitest';
import { dueTimes, orderTiming, type DueTimesInput } from '../src/rules/order-timing.js';
import type { BoardOrder } from '../src/schemas/owner-orders.js';

describe('orderTiming pure rule', () => {
  const mnl = (str: string) => `${str.replace(' ', 'T')}:00+08:00`;

  it('dueTimes computes dueAt and startBy for ASAP and scheduled orders', () => {
    // ASAP order: placed at 12:00, prepMinutes 20 -> dueAt = 12:20, startBy = 12:00
    const asap = dueTimes({
      placedAt: mnl('2026-10-26 12:00'),
      scheduledAt: null,
      prepMinutes: 20,
    });
    expect(asap.dueAt).toBe(new Date(mnl('2026-10-26 12:20')).toISOString());
    expect(asap.startBy).toBe(new Date(mnl('2026-10-26 12:00')).toISOString());

    // Scheduled order: placed at 10:00, scheduledAt 15:00, prepMinutes 20 -> dueAt = 15:00, startBy = 14:40
    const scheduled = dueTimes({
      placedAt: mnl('2026-10-26 10:00'),
      scheduledAt: mnl('2026-10-26 15:00'),
      prepMinutes: 20,
    });
    expect(scheduled.dueAt).toBe(new Date(mnl('2026-10-26 15:00')).toISOString());
    expect(scheduled.startBy).toBe(new Date(mnl('2026-10-26 14:40')).toISOString());
  });

  const baseOrder: Pick<BoardOrder, 'status' | 'dueAt' | 'startBy' | 'placedAt' | 'scheduledAt'> = {
    status: 'placed',
    placedAt: mnl('2026-10-26 10:00'),
    scheduledAt: mnl('2026-10-26 15:00'),
    dueAt: new Date(mnl('2026-10-26 15:00')).toISOString(),
    startBy: new Date(mnl('2026-10-26 14:40')).toISOString(),
  };

  it('handles scheduled phase before startBy', () => {
    const now = new Date(mnl('2026-10-26 12:00'));
    const timing = orderTiming(baseOrder, now);
    expect(timing.phase).toBe('scheduled');
    expect(timing.ageMinutes).toBe(0);
    expect(timing.lateMinutes).toBe(0);
    expect(timing.tone).toBe('neutral');
    expect(timing.dueText).toContain('3:00 PM');
  });

  it('handles new phase after startBy', () => {
    const now = new Date(mnl('2026-10-26 14:45'));
    const timing = orderTiming(baseOrder, now);
    expect(timing.phase).toBe('new');
    expect(timing.ageMinutes).toBe(5);
    expect(timing.lateMinutes).toBe(0);
    expect(timing.tone).toBe('neutral');
  });

  it('handles preparing phase: on time, amber late, and red late', () => {
    const prepOrder = { ...baseOrder, status: 'preparing' as const };

    // On time (age 10 min, prepMinutes is 20 min)
    const onTime = orderTiming(prepOrder, new Date(mnl('2026-10-26 14:50')));
    expect(onTime.phase).toBe('preparing');
    expect(onTime.ageMinutes).toBe(10);
    expect(onTime.lateMinutes).toBe(0);
    expect(onTime.tone).toBe('neutral');

    // Amber late (age 25 min -> late by 5 min <= 10 min)
    const amber = orderTiming(prepOrder, new Date(mnl('2026-10-26 15:05')));
    expect(amber.phase).toBe('preparing');
    expect(amber.ageMinutes).toBe(25);
    expect(amber.lateMinutes).toBe(5);
    expect(amber.tone).toBe('warning');

    // Red late (age 35 min -> late by 15 min > 10 min)
    const red = orderTiming(prepOrder, new Date(mnl('2026-10-26 15:15')));
    expect(red.phase).toBe('preparing');
    expect(red.ageMinutes).toBe(35);
    expect(red.lateMinutes).toBe(15);
    expect(red.tone).toBe('critical');
  });

  it('handles ready phase: on time and late', () => {
    const readyOrder = { ...baseOrder, status: 'ready' as const };

    // On time (before dueAt 15:00)
    const onTime = orderTiming(readyOrder, new Date(mnl('2026-10-26 14:55')));
    expect(onTime.phase).toBe('ready');
    expect(onTime.lateMinutes).toBe(0);
    expect(onTime.tone).toBe('neutral');

    // Late (8 min past dueAt 15:00 -> warning)
    const late = orderTiming(readyOrder, new Date(mnl('2026-10-26 15:08')));
    expect(late.phase).toBe('ready');
    expect(late.lateMinutes).toBe(8);
    expect(late.tone).toBe('warning');
  });

  it('handles out_for_delivery phase', () => {
    const outOrder = { ...baseOrder, status: 'out_for_delivery' as const };

    const onTime = orderTiming(outOrder, new Date(mnl('2026-10-26 14:50')));
    expect(onTime.phase).toBe('out');
    expect(onTime.tone).toBe('neutral');

    const critical = orderTiming(outOrder, new Date(mnl('2026-10-26 15:15')));
    expect(critical.phase).toBe('out');
    expect(critical.lateMinutes).toBe(15);
    expect(critical.tone).toBe('critical');
  });

  it('handles completed/cancelled/expired final phases', () => {
    const now = new Date(mnl('2026-10-26 16:00'));
    for (const status of ['completed', 'cancelled', 'expired'] as const) {
      const timing = orderTiming({ ...baseOrder, status }, now);
      expect(timing.phase).toBe('final');
      expect(timing.tone).toBe('neutral');
      expect(timing.lateMinutes).toBe(0);
    }
  });
});
