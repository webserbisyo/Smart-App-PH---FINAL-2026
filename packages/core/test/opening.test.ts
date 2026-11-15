import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPENING,
  OPENING_LOGO_PX,
  OpeningScreenSchema,
  appNameOf,
  shortName,
} from '../src/index.js';

describe('opening screen (T94)', () => {
  it('fills the new choices for a look saved before them', () => {
    const old = { background: 'page', color: null, motion: 'fade', showName: true };
    expect(OpeningScreenSchema.parse(old)).toEqual(DEFAULT_OPENING);
  });

  it('uses the app name when there is one, else the shop name', () => {
    expect(appNameOf('Panaderya ni Lola Remy', { appName: 'Lola Remy' })).toBe('Lola Remy');
    expect(appNameOf('Kanto Smash', { appName: null })).toBe('Kanto Smash');
    expect(appNameOf('Kanto Smash', { appName: '   ' })).toBe('Kanto Smash');
    expect(appNameOf('Kanto Smash', { appName: '  Kanto   PH ' })).toBe('Kanto PH');
  });

  it('keeps the app name to 30 characters', () => {
    expect(
      OpeningScreenSchema.safeParse({ ...DEFAULT_OPENING, appName: 'x'.repeat(31) }).success,
    ).toBe(false);
  });

  it('cuts the home screen label at whole words', () => {
    expect(shortName('Panaderya ni Lola Remy')).toBe('Panaderya ni');
    expect(shortName('Lola Remy')).toBe('Lola Remy');
  });

  it('grows the logo with each size', () => {
    expect(OPENING_LOGO_PX.small).toBeLessThan(OPENING_LOGO_PX.medium);
    expect(OPENING_LOGO_PX.medium).toBeLessThan(OPENING_LOGO_PX.large);
  });
});
