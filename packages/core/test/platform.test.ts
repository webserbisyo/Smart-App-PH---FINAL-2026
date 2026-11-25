import { describe, expect, it } from 'vitest';
import {
  META_SEND_WINDOW_MS,
  metaDaysLeft,
  metaEmail,
  metaEventTime,
  metaNameParts,
  metaPhone,
  metaTooOld,
  planReminderStage,
  trackingBlock,
} from '../src/index.js';

const mnl = (local: string) => new Date(`${local.replace(' ', 'T')}:00+08:00`);
const DAY = 86_400_000;

describe("Meta's customer information (T90, T118)", () => {
  it('normalises email and phone the way Meta hashes them', () => {
    expect(metaEmail('  Ana.Cruz@Gmail.COM ')).toBe('ana.cruz@gmail.com');
    // With the country code, no leading zero or plus (the RSVP app sent 09…, mistake F8).
    expect(metaPhone('+639171234567')).toBe('639171234567');
    expect(metaNameParts('Ma. Teresa dela Cruz')).toEqual({ fn: 'ma teresa dela', ln: 'cruz' });
  });
});

describe('event time (T118 Q1)', () => {
  const now = mnl('2026-12-10 09:00');
  it('keeps the true time and never moves an old one forward', () => {
    const sent = mnl('2026-12-09 21:30');
    expect(metaEventTime(sent, now)).toBe(Math.floor(sent.getTime() / 1000));
    // A future time (clock skew) is never sent ahead of now.
    expect(metaEventTime(new Date(now.getTime() + 60_000), now)).toBe(now.getTime() / 1000);
  });

  it('is too old an hour before the 7 days of Meta, and counts the days left', () => {
    expect(META_SEND_WINDOW_MS).toBe(7 * DAY - 3_600_000);
    expect(metaTooOld(new Date(now.getTime() - 6 * DAY), now)).toBe(false);
    expect(metaTooOld(new Date(now.getTime() - 7 * DAY + 30 * 60_000), now)).toBe(true);
    expect(metaDaysLeft(now, now)).toBe(7);
    expect(metaDaysLeft(new Date(now.getTime() - 6.5 * DAY), now)).toBe(1);
    expect(metaDaysLeft(new Date(now.getTime() - 8 * DAY), now)).toBe(0);
  });
});

describe('who never fires (T118 section 4.3)', () => {
  it('blocks the founder, help mode, demo shops and test shops, in that order', () => {
    expect(trackingBlock({})).toBeNull();
    expect(trackingBlock({ adminCaller: true, isDemo: true })).toBe('admin');
    expect(trackingBlock({ helpMode: true, isTest: true })).toBe('help_mode');
    expect(trackingBlock({ isDemo: true })).toBe('demo_shop');
    expect(trackingBlock({ isTest: true })).toBe('test_shop');
  });
});

describe('plan reminders (T118 Q9)', () => {
  const trial = { trialEndsAt: mnl('2026-12-20 10:00').toISOString(), paidUntil: null };
  const paid = { trialEndsAt: null, paidUntil: '2026-12-20' };

  it('reminds a trial 3 days before and on the last day', () => {
    expect(planReminderStage(trial, mnl('2026-12-16 09:00'))).toBeNull();
    expect(planReminderStage(trial, mnl('2026-12-17 09:00'))).toEqual({
      stage: 'trial_3d',
      end: '2026-12-20',
    });
    expect(planReminderStage(trial, mnl('2026-12-20 09:00'))?.stage).toBe('trial_last');
  });

  it('reminds a paid plan 7 days before, on the day, 3 days late and when it pauses', () => {
    expect(planReminderStage(paid, mnl('2026-12-13 09:00'))?.stage).toBe('due_7d');
    expect(planReminderStage(paid, mnl('2026-12-20 09:00'))?.stage).toBe('end_day');
    expect(planReminderStage(paid, mnl('2026-12-23 09:00'))?.stage).toBe('grace_3d');
    expect(planReminderStage(paid, mnl('2026-12-28 09:00'))?.stage).toBe('paused');
    expect(planReminderStage(paid, mnl('2026-12-18 09:00'))).toBeNull();
  });

  it('still sends a reminder a day late, never older', () => {
    expect(planReminderStage(paid, mnl('2026-12-14 09:00'))?.stage).toBe('due_7d');
    expect(planReminderStage(paid, mnl('2026-12-15 09:00'))).toBeNull();
  });
});
