import { describe, expect, it } from 'vitest';
import { isShopIconName, shopIconUrls, splashIconUrl } from './shop-icons';

describe('shop icons (T121)', () => {
  it('keeps the demo shops on their ready-made files', () => {
    expect(shopIconUrls('kanto-smash').icon512).toBe('/demo/kanto-smash/brand/icon-512.png');
    expect(splashIconUrl('kanto-smash', null)).toBe('/demo/kanto-smash/brand/icon-512.png');
  });

  it('draws PNG icons for any other shop', () => {
    const urls = shopIconUrls('aling-nena');
    expect(urls.icon192).toBe('/aling-nena/icon/icon-192.png');
    expect(urls.maskable512).toBe('/aling-nena/icon/icon-maskable-512.png');
    expect(urls.apple).toBe('/aling-nena/icon/apple-touch-icon.png');
  });

  it("uses a real shop's uploaded logo on the opening screen, or nothing", () => {
    const logo = 'https://example.supabase.co/storage/v1/object/public/look/shop/logo/1';
    expect(splashIconUrl('aling-nena', logo)).toBe(logo);
    expect(splashIconUrl('aling-nena', null)).toBeNull();
  });

  it('only answers the icon names it makes', () => {
    expect(isShopIconName('icon-512.png')).toBe(true);
    expect(isShopIconName('../secret.png')).toBe(false);
    expect(isShopIconName('toString')).toBe(false);
  });
});
