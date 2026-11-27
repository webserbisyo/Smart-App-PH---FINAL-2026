import { describe, expect, it } from 'vitest';
import { createDeviceStorage, storageKey } from '../src/device-storage';
import { mergeLine, removeLine, updateLine } from '../src/hooks/storefront/device';
import { lineIdentity } from '@smartapp/core';

function mapBackend() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

const line = {
  itemId: 'ks-classic-smash',
  variantId: 'ks-classic-smash--single',
  optionIds: ['b', 'a'],
  note: '',
  qty: 1,
};

describe('deviceStorage', () => {
  it('round-trips a value per shop', () => {
    const storage = createDeviceStorage(mapBackend());
    storage.basket.write('kanto-smash', [line]);
    expect(storage.basket.read('kanto-smash').value).toEqual([line]);
    expect(storage.basket.read('aqualinis').value).toBeNull();
  });

  it('an old version or a bad value resets that key with a notice', () => {
    const backend = mapBackend();
    const storage = createDeviceStorage(backend);
    backend.map.set(storageKey('basket', 'kanto-smash'), JSON.stringify({ v: 0, data: [line] }));
    expect(storage.basket.read('kanto-smash')).toEqual({ value: null, notice: 'storage_reset' });
    expect(backend.map.has(storageKey('basket', 'kanto-smash'))).toBe(false);
    backend.map.set(storageKey('favourites', 'kanto-smash'), '{not json');
    expect(storage.favourites.read('kanto-smash').notice).toBe('storage_reset');
  });

  it('falls back to memory when storage throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const storage = createDeviceStorage(throwing);
    storage.favourites.write('kanto-smash', ['ks-classic-smash']);
    storage.favourites.write('kanto-smash', ['ks-classic-smash']);
    expect(storage.favourites.read('kanto-smash').value).toEqual(['ks-classic-smash']);
  });

  it('notifies subscribers and keeps a stable snapshot until a change', () => {
    const storage = createDeviceStorage(mapBackend());
    let calls = 0;
    storage.subscribe(() => (calls += 1));
    const a = storage.orderType.snapshot('kanto-smash');
    expect(storage.orderType.snapshot('kanto-smash')).toBe(a);
    storage.orderType.write('kanto-smash', 'delivery');
    expect(calls).toBe(1);
    expect(storage.orderType.snapshot('kanto-smash').value).toBe('delivery');
  });
});

describe('basket merge', () => {
  it('merges identical lines by identity (options sorted, note trimmed) and caps at 99', () => {
    const once = mergeLine([], line);
    const twice = mergeLine(once, { ...line, optionIds: ['a', 'b'], note: '  ' });
    expect(twice).toHaveLength(1);
    expect(twice[0]?.qty).toBe(2);
    expect(mergeLine(twice, { ...line, qty: 99 })[0]?.qty).toBe(99);
    expect(mergeLine(twice, { ...line, note: 'no onions' })).toHaveLength(2);
  });
});

describe('basket remove with Undo', () => {
  const a = { ...line, optionIds: ['a'] };
  const b = { ...line, optionIds: ['b'] };
  const c = { ...line, optionIds: ['c'] };

  it('removes a line and Undo puts it back in the same place', () => {
    const result = removeLine([a, b, c], lineIdentity(b));
    expect(result?.lines).toEqual([a, c]);
    expect(result?.restore(result.lines)).toEqual([a, b, c]);
  });

  it('Undo keeps lines changed meanwhile and never doubles a line added again', () => {
    const result = removeLine([a, b, c], lineIdentity(c));
    expect(result?.restore([a])).toEqual([a, c]);
    expect(result?.restore([a, c])).toEqual([a, c]);
  });

  it('returns null for a line that is gone', () => {
    expect(removeLine([a], lineIdentity(b))).toBeNull();
  });
});

describe('basket edit (T127)', () => {
  const a = { ...line, optionIds: ['a'], qty: 1 };
  const b = { ...line, optionIds: ['b'], qty: 2 };
  const c = { ...line, optionIds: ['c'], qty: 1 };

  it('changes the whole line in the same place', () => {
    const result = updateLine(
      [a, b, c],
      lineIdentity(b),
      { ...b, note: 'less ice', qty: 3 },
      false,
    );
    expect(result?.joined).toBe(false);
    expect(result?.lines.map((l) => [l.optionIds[0], l.note, l.qty])).toEqual([
      ['a', '', 1],
      ['b', 'less ice', 3],
      ['c', '', 1],
    ]);
  });

  it('Just 1 keeps the rest on the old line and adds the changed one', () => {
    const result = updateLine([a, b], lineIdentity(b), { ...b, note: 'no sugar', qty: 1 }, true);
    expect(result?.joined).toBe(false);
    expect(result?.lines.map((l) => [l.optionIds[0], l.note, l.qty])).toEqual([
      ['a', '', 1],
      ['b', '', 1],
      ['b', 'no sugar', 1],
    ]);
  });

  it('joins a line that now matches another one, capped at 99', () => {
    const result = updateLine([a, b, c], lineIdentity(c), { ...c, optionIds: ['a'] }, false);
    expect(result?.joined).toBe(true);
    expect(result?.lines).toEqual([{ ...a, qty: 2 }, b]);
    const big = { ...a, qty: 98 };
    expect(updateLine([big, b], lineIdentity(b), { ...b, optionIds: ['a'] }, false)?.lines).toEqual(
      [{ ...big, qty: 99 }],
    );
    const split = updateLine([a, b], lineIdentity(b), { ...b, optionIds: ['a'], qty: 1 }, true);
    expect(split?.joined).toBe(true);
    expect(split?.lines).toEqual([
      { ...a, qty: 2 },
      { ...b, qty: 1 },
    ]);
  });

  it('returns null for a line that is gone', () => {
    expect(updateLine([a], lineIdentity(b), b, false)).toBeNull();
  });
});
