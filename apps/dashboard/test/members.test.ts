import { describe, expect, it } from 'vitest';
import { membersWords } from '@smartapp/core';
import { MembersSearchSchema } from '../src/features/members/search';
import { agoLabel, daysSince, lastInLabel } from '../src/features/members/when';

// 2026-11-05 10:00 Manila.
const now = new Date('2026-11-05T02:00:00Z');

describe('Members address (T57)', () => {
  it('keeps a known group, sort and progress bar', () => {
    expect(
      MembersSearchSchema.parse({ filter: 'almost', sort: 'stamps', stamps: '3', member: 'm-a' }),
    ).toEqual({ filter: 'almost', sort: 'stamps', stamps: 3, member: 'm-a' });
  });

  it('drops a bad value instead of breaking the page', () => {
    expect(MembersSearchSchema.parse({ filter: 'vip', sort: 'age', stamps: 'x' })).toEqual({});
  });
});

describe('Last in label', () => {
  it('counts Manila days, not UTC days', () => {
    // 2026-11-04 23:30 Manila is yesterday, though it is the same UTC day as now.
    expect(daysSince('2026-11-04T15:30:00Z', now)).toBe(1);
    expect(daysSince('2026-11-04T16:30:00Z', now)).toBe(0);
  });

  it('talks like the counter', () => {
    expect(lastInLabel(null, now)).toBe(membersWords.when.never);
    expect(lastInLabel('2026-11-05T01:00:00Z', now)).toBe(membersWords.when.today);
    expect(lastInLabel('2026-11-04T01:00:00Z', now)).toBe(membersWords.when.yesterday);
    expect(lastInLabel('2026-11-02T01:00:00Z', now)).toBe(membersWords.when.daysAgo(3));
    expect(lastInLabel('2026-10-20T01:00:00Z', now)).not.toContain('ago');
  });

  it('words the double-stamp question', () => {
    expect(agoLabel('2026-11-05T01:59:30Z', now)).toBe(membersWords.recent.lessThanMinute);
    expect(agoLabel('2026-11-05T01:58:30Z', now)).toBe(membersWords.recent.oneMinute);
  });
});
