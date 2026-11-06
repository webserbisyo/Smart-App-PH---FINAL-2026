import { describe, expect, it } from 'vitest';
import { changeOf, inWindow, milestoneReached, percentChange, sharePercent } from '../src/index.js';

describe('members pulse rules (T61, T63)', () => {
  it('percentChange rounds and needs something before', () => {
    expect(percentChange(112, 100)).toBe(12);
    expect(percentChange(80, 100)).toBe(-20);
    expect(percentChange(5, 0)).toBeNull();
  });
  it('sharePercent is 0 for an empty whole', () => {
    expect(sharePercent(42, 100)).toBe(42);
    expect(sharePercent(1, 3)).toBe(33);
    expect(sharePercent(0, 0)).toBe(0);
  });
  it('milestoneReached picks the biggest one passed', () => {
    expect(milestoneReached(9)).toBeNull();
    expect(milestoneReached(10)).toBe(10);
    expect(milestoneReached(36)).toBe(25);
    expect(milestoneReached(1200)).toBe(1000);
  });
  it('inWindow includes the end and excludes the start', () => {
    const end = new Date('2026-11-05T04:00:00.000Z');
    expect(inWindow('2026-11-05T04:00:00.000Z', end, 7)).toBe(true);
    expect(inWindow('2026-10-29T04:01:00.000Z', end, 7)).toBe(true);
    expect(inWindow('2026-10-29T04:00:00.000Z', end, 7)).toBe(false);
    expect(inWindow('2026-11-05T04:01:00.000Z', end, 7)).toBe(false);
  });
});

describe('changeOf (T77)', () => {
  it('shows small counts as a plain difference', () => {
    expect(changeOf(0, 1, true)).toEqual({ kind: 'diff', value: -1 });
    expect(changeOf(4, 1, true)).toEqual({ kind: 'diff', value: 3 });
  });
  it('shows real bases and money as a percent', () => {
    expect(changeOf(30, 20, true)).toEqual({ kind: 'percent', value: 50 });
    expect(changeOf(500, 1000, false)).toEqual({ kind: 'percent', value: -50 });
  });
  it('says same, or nothing when both are zero', () => {
    expect(changeOf(5, 5, true)).toEqual({ kind: 'same' });
    expect(changeOf(0, 0, true)).toBeNull();
    expect(changeOf(500, 0, false)).toBeNull();
  });
});
