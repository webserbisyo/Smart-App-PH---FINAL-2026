import { describe, expect, it } from 'vitest';
import type { OrderEvent } from '@smartapp/core';
import {
  buildMessengerOrderText,
  buildMessengerUrl,
  formatCountdown,
  formatManilaTime,
  formatOrderNumber,
  isOrderCancelled,
  resolveReceiptSteps,
} from './receipt-rules';

describe('formatOrderNumber', () => {
  it('formats order numbers with leading zeros up to 3 digits', () => {
    expect(formatOrderNumber(1)).toBe('#001');
    expect(formatOrderNumber(42)).toBe('#042');
    expect(formatOrderNumber(123)).toBe('#123');
    expect(formatOrderNumber(1000)).toBe('#1000');
  });
});

describe('formatCountdown', () => {
  it('formats minutes and seconds with tabular zero-padded digits', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');
    const expiresAt = new Date('2026-10-25T12:24:13.000Z');
    const result = formatCountdown(expiresAt, now);

    expect(result.minutes).toBe(24);
    expect(result.seconds).toBe(13);
    expect(result.formatted).toBe('24:13');
    expect(result.isExpired).toBe(false);
    expect(result.shouldAnnounce).toBe(false);
  });

  it('sets shouldAnnounce to true ONLY at 10 minutes, 5 minutes, and 1 minute checkpoints', () => {
    const base = new Date('2026-10-25T12:00:00.000Z');

    // 10 minutes = 600s
    const at10m = new Date(base.getTime() + 600 * 1000);
    expect(formatCountdown(at10m, base).shouldAnnounce).toBe(true);

    // 9 min 59 sec = 599s (should not announce)
    const at9m59s = new Date(base.getTime() + 599 * 1000);
    expect(formatCountdown(at9m59s, base).shouldAnnounce).toBe(false);

    // 5 minutes = 300s
    const at5m = new Date(base.getTime() + 300 * 1000);
    expect(formatCountdown(at5m, base).shouldAnnounce).toBe(true);

    // 1 minute = 60s
    const at1m = new Date(base.getTime() + 60 * 1000);
    expect(formatCountdown(at1m, base).shouldAnnounce).toBe(true);

    // 59 seconds
    const at59s = new Date(base.getTime() + 59 * 1000);
    expect(formatCountdown(at59s, base).shouldAnnounce).toBe(false);
  });

  it('marks expired countdown at 0 or in the past', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');
    const past = new Date('2026-10-25T11:59:00.000Z');
    const result = formatCountdown(past, now);

    expect(result.isExpired).toBe(true);
    expect(result.formatted).toBe('00:00');
    expect(result.totalSecs).toBe(0);
  });

  it('handles null/undefined expiresAt safely', () => {
    const result = formatCountdown(null);
    expect(result.isExpired).toBe(true);
    expect(result.formatted).toBe('00:00');
  });
});

describe('buildMessengerOrderText (privacy wall constraint)', () => {
  it('generates order summary string and NEVER contains customer address or phone', () => {
    const text = buildMessengerOrderText({
      orderNo: 42,
      lineCount: 2,
      totalFormatted: '₱345.00',
      receiptUrl: 'https://shop.webserbisyo.com/kanto-smash/o/demo-token-123',
    });

    expect(text).toBe(
      'Order #042 · 2 items · ₱345.00 · https://shop.webserbisyo.com/kanto-smash/o/demo-token-123',
    );
    // Explicit safety checks
    expect(text).not.toContain('0917');
    expect(text).not.toContain('+63');
    expect(text).not.toContain('Street');
    expect(text).not.toContain('Brgy');
  });

  it('handles singular item correctly', () => {
    const text = buildMessengerOrderText({
      orderNo: 1,
      lineCount: 1,
      totalFormatted: '₱120.00',
      receiptUrl: 'https://shop.webserbisyo.com/kape-juan/o/token-1',
    });
    expect(text).toContain('1 item ·');
  });
});

describe('buildMessengerUrl', () => {
  it('builds clean m.me URL with encoded parameters', () => {
    const url = buildMessengerUrl('@kantosmash', 'Order #042');
    expect(url).toBe('https://m.me/kantosmash?text=Order%20%23042');
  });
});

describe('resolveReceiptSteps', () => {
  it('generates delivery steps with Kitchen vocabulary for food and tracks progress', () => {
    const events: readonly OrderEvent[] = [
      { status: 'placed', at: '2026-10-25T04:00:00.000Z' },
      { status: 'preparing', at: '2026-10-25T04:05:00.000Z' },
    ];

    const steps = resolveReceiptSteps('delivery', 'preparing', events, 'food');
    expect(steps).toHaveLength(5);

    expect(steps[0]?.id).toBe('placed');
    expect(steps[0]?.state).toBe('completed');
    expect(steps[0]?.timestamp).toBeTruthy();

    expect(steps[1]?.id).toBe('preparing');
    expect(steps[1]?.label).toBe('Kitchen');
    expect(steps[1]?.state).toBe('current');

    expect(steps[2]?.id).toBe('ready');
    expect(steps[2]?.label).toBe('Ready for rider');
    expect(steps[2]?.state).toBe('upcoming');

    expect(steps[3]?.id).toBe('out_for_delivery');
    expect(steps[3]?.state).toBe('upcoming');

    expect(steps[4]?.id).toBe('completed');
    expect(steps[4]?.state).toBe('upcoming');
  });

  it('generates pickup steps with Packing vocabulary for retail', () => {
    const steps = resolveReceiptSteps('pickup', 'ready', [], 'retail');
    expect(steps).toHaveLength(4);

    expect(steps[0]?.id).toBe('placed');
    expect(steps[0]?.state).toBe('completed');

    expect(steps[1]?.id).toBe('preparing');
    expect(steps[1]?.label).toBe('Packing');
    expect(steps[1]?.state).toBe('completed');

    expect(steps[2]?.id).toBe('ready');
    expect(steps[2]?.label).toBe('Ready for pickup');
    expect(steps[2]?.state).toBe('current');

    expect(steps[3]?.id).toBe('completed');
    expect(steps[3]?.state).toBe('upcoming');
  });
});

describe('formatManilaTime and isOrderCancelled', () => {
  it('formats Manila time', () => {
    const time = formatManilaTime('2026-10-25T04:00:00.000Z');
    expect(time).toMatch(/\d{1,2}:\d{2}\s+(AM|PM)/);
  });

  it('identifies cancelled and expired statuses', () => {
    expect(isOrderCancelled('cancelled')).toBe(true);
    expect(isOrderCancelled('expired')).toBe(true);
    expect(isOrderCancelled('completed')).toBe(false);
    expect(isOrderCancelled('placed')).toBe(false);
  });
});
