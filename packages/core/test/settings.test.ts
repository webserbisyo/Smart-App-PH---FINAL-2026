import { describe, expect, it } from 'vitest';
import {
  OwnerAvatarSchema,
  copyDayToAll,
  distanceRowFor,
  distanceRowProblems,
  formatStorage,
  hoursProblems,
  MB,
  nextDistanceRow,
  ownerAvatarFile,
  personInitials,
  planCoversUntil,
  planStatus,
  sniffImage,
  startingAvatar,
  storageLevel,
  storagePercent,
} from '../src/index.js';

const mnl = (local: string) => new Date(`${local.replace(' ', 'T')}:00+08:00`).toISOString();

describe('hours (T64)', () => {
  it('flags close before open and overlaps on the same day, not touching ranges', () => {
    const problems = hoursProblems([
      { day: 1, open: '09:00', close: '12:00' },
      { day: 1, open: '12:00', close: '24:00' },
      { day: 2, open: '09:00', close: '15:00' },
      { day: 2, open: '14:00', close: '18:00' },
      { day: 3, open: '20:00', close: '02:00' },
    ]);
    expect(problems.get(0)).toBeUndefined();
    expect(problems.get(1)).toBeUndefined();
    expect(problems.get(3)).toBe('overlap');
    expect(problems.get(4)).toBe('order');
  });

  it('copies Monday to every open day, keeping closed days closed', () => {
    const next = copyDayToAll(
      [
        { day: 1, open: '09:00', close: '13:00' },
        { day: 1, open: '17:00', close: '21:00' },
        { day: 2, open: '10:00', close: '20:00' },
      ],
      1,
      [1, 2, 5],
    );
    expect(next.filter((r) => r.day === 2)).toHaveLength(2);
    expect(next.filter((r) => r.day === 5)).toHaveLength(2);
    expect(next.some((r) => r.day === 0)).toBe(false);
  });
});

describe('delivery rows (N25)', () => {
  const row = (fromKm: number, toKm: number) => ({
    fromKm,
    toKm,
    fee: 4900,
    etaText: '30 min',
    minOrder: 0,
  });
  it('rows start at 0 and follow each other', () => {
    expect(distanceRowProblems([row(0, 3), row(3, 5)]).size).toBe(0);
    expect(distanceRowProblems([row(1, 3)]).get(0)).toBe('start');
    expect(distanceRowProblems([row(0, 3), row(4, 5)]).get(1)).toBe('gap');
    expect(distanceRowProblems([row(0, 3), row(2, 5)]).get(1)).toBe('overlap');
    expect(distanceRowProblems([row(0, 3), row(5, 5)]).get(1)).toBe('order');
  });
  it('the next row starts where the last ends; the calculator finds the row', () => {
    expect(nextDistanceRow([row(0, 3)])).toMatchObject({ fromKm: 3, toKm: 5 });
    expect(distanceRowFor([row(0, 3), row(3, 5)], 3)?.toKm).toBe(5);
    expect(distanceRowFor([row(0, 3), row(3, 5)], 5)?.toKm).toBe(5);
    expect(distanceRowFor([row(0, 3)], 9)).toBeNull();
  });
});

describe('storage (T66)', () => {
  it('levels at 80, 95 and 100 percent', () => {
    const limit = 500 * MB;
    expect(storageLevel(212 * MB, limit)).toBe('ok');
    expect(storageLevel(431 * MB, limit)).toBe('high');
    expect(storageLevel(486 * MB, limit)).toBe('almost');
    expect(storageLevel(512 * MB, limit)).toBe('full');
    expect(storagePercent(212 * MB, limit)).toBe(42);
    expect(storagePercent(600 * MB, limit)).toBe(100);
  });
  it('formats sizes in MB', () => {
    expect(formatStorage(212 * MB)).toBe('212 MB');
    expect(formatStorage(2.1 * MB)).toBe('2.1 MB');
    expect(formatStorage(0)).toBe('0 MB');
  });
});

describe('plan (T67)', () => {
  const now = mnl('2026-11-05 12:00');
  it('trial, active, due, overdue for 7 days, then paused', () => {
    expect(planStatus({ trialEndsAt: mnl('2026-11-12 12:00'), paidUntil: null }, now)).toBe('trial');
    expect(planStatus({ trialEndsAt: null, paidUntil: '2026-12-05' }, now)).toBe('active');
    expect(planStatus({ trialEndsAt: null, paidUntil: '2026-11-08' }, now)).toBe('due');
    expect(planStatus({ trialEndsAt: null, paidUntil: '2026-11-01' }, now)).toBe('overdue');
    expect(planStatus({ trialEndsAt: null, paidUntil: '2026-10-25' }, now)).toBe('paused');
  });
  it('a payment adds months from the paid-until day, or from today when late', () => {
    expect(planCoversUntil('2026-12-05', 1, now)).toBe('2027-01-05');
    expect(planCoversUntil('2026-10-01', 3, now)).toBe('2027-02-05');
  });
});

describe('uploads (T65)', () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(12).fill(0)]).slice(0, 12);
  const ascii = (s: string) => Array.from(s).map((c) => c.charCodeAt(0));
  it('reads the real type from the first bytes', () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47))).toBe('png');
    expect(sniffImage(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toBe('webp');
    expect(sniffImage(bytes(0, 0, 0, 24, ...ascii('ftypheic')))).toBe('heic');
    expect(sniffImage(bytes(...ascii('hello world!')))).toBeNull();
  });
});

describe('owner picture (T68)', () => {
  it('points faces and Make your own at shipped files; photos and initials have none', () => {
    expect(ownerAvatarFile({ kind: 'face', style: 'pixel', face: 5, theme: 'sun' })).toBe(
      '/avatars/owner/pixel-05.webp',
    );
    expect(
      ownerAvatarFile({
        kind: 'custom',
        hair: 'curly',
        hairColor: 'brown',
        glasses: true,
        earrings: false,
        theme: 'mint',
      }),
    ).toBe('/avatars/owner/make/2110.webp');
    expect(ownerAvatarFile({ kind: 'initials', theme: 'navy' })).toBeNull();
    expect(personInitials('Juan Dela Cruz')).toBe('JC');
    expect(OwnerAvatarSchema.safeParse(startingAvatar('Kris')).success).toBe(true);
  });
});
