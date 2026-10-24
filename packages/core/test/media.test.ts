import { describe, expect, it } from 'vitest';
import { imageUrl, imageSources } from '../src/media.js';

describe('Media Helpers', () => {
  describe('imageUrl', () => {
    it('returns storefront-relative URL for an item without origin', () => {
      const url = imageUrl('demo:kanto-smash/items/classic-smash', 640);
      expect(url).toBe('/demo/kanto-smash/items/classic-smash-640.webp');
    });

    it('returns absolute URL for an item with origin', () => {
      const url = imageUrl(
        'demo:kanto-smash/items/classic-smash',
        640,
        'https://storefront.smartapp.ph',
      );
      expect(url).toBe(
        'https://storefront.smartapp.ph/demo/kanto-smash/items/classic-smash-640.webp',
      );
    });

    it('normalizes trailing slash in origin', () => {
      const url = imageUrl(
        'demo:kanto-smash/items/classic-smash',
        320,
        'https://storefront.smartapp.ph/',
      );
      expect(url).toBe(
        'https://storefront.smartapp.ph/demo/kanto-smash/items/classic-smash-320.webp',
      );
    });

    it('handles banners with 1600 or 800 width', () => {
      const url1600 = imageUrl('demo:aqualinis/banners/banner-1', 1600);
      expect(url1600).toBe('/demo/aqualinis/banners/banner-1-1600.webp');

      const url800 = imageUrl('demo:aqualinis/banners/banner-2', 800);
      expect(url800).toBe('/demo/aqualinis/banners/banner-2-800.webp');
    });

    it('handles brand logo with 256 or 128 width', () => {
      const url = imageUrl('demo:tala-apparel/brand/logo', 256);
      expect(url).toBe('/demo/tala-apparel/brand/logo-256.webp');
    });

    it('handles prize item for shops that have a prize', () => {
      const talaPrize = imageUrl('demo:tala-apparel/items/prize', 640);
      expect(talaPrize).toBe('/demo/tala-apparel/items/prize-640.webp');

      const kapePrize = imageUrl('demo:kape-juan/items/prize', 320);
      expect(kapePrize).toBe('/demo/kape-juan/items/prize-320.webp');
    });

    it('returns null for prize on a shop without prize', () => {
      expect(imageUrl('demo:kanto-smash/items/prize', 640)).toBeNull();
      expect(imageUrl('demo:aqualinis/items/prize', 640)).toBeNull();
      expect(imageUrl('demo:lola-remy/items/prize', 640)).toBeNull();
    });

    it('returns null for missing, invalid, or malformed refs', () => {
      expect(imageUrl(null, 640)).toBeNull();
      expect(imageUrl(undefined, 640)).toBeNull();
      expect(imageUrl('', 640)).toBeNull();
      expect(imageUrl('invalid-ref', 640)).toBeNull();
      expect(imageUrl('demo:unknown-shop/items/burger', 640)).toBeNull();
      expect(imageUrl('demo:kanto-smash/items/non-existent-item', 640)).toBeNull();
      expect(imageUrl('demo:kanto-smash/banners/banner-99', 1600)).toBeNull();
      expect(imageUrl('demo:kanto-smash/brand/unknown', 256)).toBeNull();
      expect(imageUrl('demo:kanto-smash/invalid-folder/test', 640)).toBeNull();
    });
  });

  describe('imageSources', () => {
    it('returns sources and widths for item without origin', () => {
      const sources = imageSources('demo:kanto-smash/items/classic-smash');
      expect(sources).not.toBeNull();
      expect(sources?.widths).toEqual([320, 640]);
      expect(sources?.avif).toBe(
        '/demo/kanto-smash/items/classic-smash-320.avif 320w, /demo/kanto-smash/items/classic-smash-640.avif 640w',
      );
      expect(sources?.webp).toBe(
        '/demo/kanto-smash/items/classic-smash-320.webp 320w, /demo/kanto-smash/items/classic-smash-640.webp 640w',
      );
    });

    it('returns sources and widths for banner with origin', () => {
      const sources = imageSources(
        'demo:aqualinis/banners/banner-1',
        'https://storefront.smartapp.ph',
      );
      expect(sources).not.toBeNull();
      expect(sources?.widths).toEqual([800, 1600]);
      expect(sources?.avif).toBe(
        'https://storefront.smartapp.ph/demo/aqualinis/banners/banner-1-800.avif 800w, https://storefront.smartapp.ph/demo/aqualinis/banners/banner-1-1600.avif 1600w',
      );
      expect(sources?.webp).toBe(
        'https://storefront.smartapp.ph/demo/aqualinis/banners/banner-1-800.webp 800w, https://storefront.smartapp.ph/demo/aqualinis/banners/banner-1-1600.webp 1600w',
      );
    });

    it('returns sources and widths for logo', () => {
      const sources = imageSources('demo:tala-apparel/brand/logo');
      expect(sources).not.toBeNull();
      expect(sources?.widths).toEqual([128, 256]);
      expect(sources?.avif).toBe(
        '/demo/tala-apparel/brand/logo-128.avif 128w, /demo/tala-apparel/brand/logo-256.avif 256w',
      );
      expect(sources?.webp).toBe(
        '/demo/tala-apparel/brand/logo-128.webp 128w, /demo/tala-apparel/brand/logo-256.webp 256w',
      );
    });

    it('returns null for missing, invalid, or malformed refs', () => {
      expect(imageSources(null)).toBeNull();
      expect(imageSources(undefined)).toBeNull();
      expect(imageSources('not:valid')).toBeNull();
      expect(imageSources('demo:kanto-smash/items/not-real')).toBeNull();
    });
  });
});
