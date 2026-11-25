import { describe, expect, it } from 'vitest';
import { shopHref, shopOfHost, shopPath } from './shop-address';

describe('shop address (launch phase 5, X7)', () => {
  const domain = 'webserbisyo.com';

  it('finds the shop in its own host only', () => {
    expect(shopOfHost('kanto-smash.webserbisyo.com', domain)).toBe('kanto-smash');
    expect(shopOfHost('Kanto-Smash.webserbisyo.com:443', domain)).toBe('kanto-smash');
    expect(shopOfHost('shop.webserbisyo.com', domain)).toBeNull();
    expect(shopOfHost('app.webserbisyo.com', domain)).toBeNull();
    expect(shopOfHost('a.b.webserbisyo.com', domain)).toBeNull();
    expect(shopOfHost('kanto.evil.com', domain)).toBeNull();
    expect(shopOfHost('kanto.webserbisyo.com', undefined)).toBeNull();
    expect(shopOfHost(null, domain)).toBeNull();
  });

  it('adds the slug once, and leaves app-wide files alone', () => {
    expect(shopPath('kanto', '/')).toBe('/kanto');
    expect(shopPath('kanto', '/menu')).toBe('/kanto/menu');
    expect(shopPath('kanto', '/o/abc')).toBe('/kanto/o/abc');
    expect(shopPath('kanto', '/kanto/menu')).toBeNull();
    expect(shopPath('kanto', '/kanto')).toBeNull();
    expect(shopPath('kanto', '/api/revalidate')).toBeNull();
    expect(shopPath('kanto', '/demo/kanto/brand/og.jpg')).toBeNull();
    expect(shopPath('kanto', '/robots.txt')).toBeNull();
  });

  it('writes shop links in one form', () => {
    expect(shopHref('kanto', '/menu')).toBe('/kanto/menu');
    expect(shopHref('kanto')).toBe('/kanto');
  });
});
