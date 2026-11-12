import { describe, expect, it } from 'vitest';
import { AVATAR_MAKE_COUNTS, AvatarSvgSchema, STARTING_MAKE } from '@smartapp/core';
import { avatarLibraryCounts, loadAvatarDrawer } from '../src/lib/avatar-draw';

describe('picture maker drawing (T83)', () => {
  it('has the same number of choices as the saved choices allow', async () => {
    expect(await avatarLibraryCounts()).toEqual(AVATAR_MAKE_COUNTS);
  });

  it('draws a different, safe picture for each change', async () => {
    const draw = await loadAvatarDrawer();
    const first = draw(STARTING_MAKE);
    expect(AvatarSvgSchema.safeParse(first).success).toBe(true);
    expect(draw({ ...STARTING_MAKE, hair: 30 })).not.toBe(first);
    expect(draw({ ...STARTING_MAKE, glasses: 2 })).not.toBe(first);
    expect(draw({ ...STARTING_MAKE, hairColor: 3 })).not.toBe(first);
    expect(draw(STARTING_MAKE)).toBe(first);
  });
});
