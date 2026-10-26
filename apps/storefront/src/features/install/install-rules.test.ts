import { describe, expect, it } from 'vitest';
import { installCardVisible, installPlatform, isIosSafari, shortName } from './install-rules';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';

describe('install rules', () => {
  it('shows iPhone steps only in Safari', () => {
    expect(isIosSafari(IPHONE_SAFARI)).toBe(true);
    expect(isIosSafari(IPHONE_CHROME)).toBe(false);
    expect(isIosSafari(ANDROID_CHROME)).toBe(false);
  });

  it('picks the platform', () => {
    expect(installPlatform({ standalone: true, hasPrompt: true, userAgent: ANDROID_CHROME })).toBe(
      'installed',
    );
    expect(installPlatform({ standalone: false, hasPrompt: true, userAgent: ANDROID_CHROME })).toBe(
      'prompt',
    );
    expect(installPlatform({ standalone: false, hasPrompt: false, userAgent: IPHONE_SAFARI })).toBe(
      'ios',
    );
    expect(
      installPlatform({ standalone: false, hasPrompt: false, userAgent: ANDROID_CHROME }),
    ).toBe('none');
  });

  it('hides the card when installed, unsupported or hidden in the last 30 days', () => {
    const now = '2026-10-26T00:00:00.000Z';
    expect(installCardVisible({ platform: 'prompt', dismissedAt: null, now })).toBe(true);
    expect(installCardVisible({ platform: 'installed', dismissedAt: null, now })).toBe(false);
    expect(installCardVisible({ platform: 'none', dismissedAt: null, now })).toBe(false);
    expect(
      installCardVisible({ platform: 'ios', dismissedAt: '2026-10-20T00:00:00.000Z', now }),
    ).toBe(false);
    expect(
      installCardVisible({ platform: 'ios', dismissedAt: '2026-09-20T00:00:00.000Z', now }),
    ).toBe(true);
  });

  it('trims the home screen name', () => {
    expect(shortName('Kanto Smash')).toBe('Kanto Smash');
    expect(shortName('Kapé Juan Coffee House')).toBe('Kapé Juan');
    expect(shortName('Supercalifragilistic')).toBe('Supercalifra');
  });
});
