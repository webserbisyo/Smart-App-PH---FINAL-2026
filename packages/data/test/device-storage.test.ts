import { describe, expect, it } from 'vitest';
import { createDeviceStorage, storageKey } from '../src/device-storage';
import { mergeLine, removeLine } from '../src/hooks/storefront/device';
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
