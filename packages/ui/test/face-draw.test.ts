import { describe, expect, it } from 'vitest';
import { createAvatar } from '@dicebear/core';
import {
  FACE_PARTS,
  OWNER_AVATAR_STYLES,
  OWNER_FACE_SEEDS,
  FaceRecipeSchema,
} from '@smartapp/core';
import { loadFaceLibrary } from '../src/lib/face-draw';

// Each style drawn the plain way, from its seed only.
const PLAIN = {
  sketch: async (seed: string) =>
    createAvatar(await import('@dicebear/notionists'), { seed, size: 128 }).toString(),
  soft: async (seed: string) =>
    createAvatar(await import('@dicebear/lorelei'), { seed, size: 128 }).toString(),
  bright: async (seed: string) =>
    createAvatar(await import('@dicebear/micah'), { seed, size: 128 }).toString(),
  people: async (seed: string) =>
    createAvatar(await import('@dicebear/open-peeps'), { seed, size: 128 }).toString(),
  pixel: async (seed: string) =>
    createAvatar(await import('@dicebear/pixel-art'), { seed, size: 128 }).toString(),
  fun: async (seed: string) =>
    createAvatar(await import('@dicebear/thumbs'), {
      seed,
      size: 128,
      backgroundColor: ['transparent'],
    }).toString(),
  adventure: async (seed: string) =>
    createAvatar(await import('@dicebear/adventurer'), { seed, size: 128 }).toString(),
} as const;

// Customise starts from the face the owner tapped (T93): a default face's recipe draws that same face.
describe.each(OWNER_AVATAR_STYLES)('the %s faces', (style) => {
  it('draw the same from their recipes as from their seeds', async () => {
    const lib = await loadFaceLibrary(style);
    for (const seed of OWNER_FACE_SEEDS) {
      const recipe = FaceRecipeSchema.parse(lib.recipeFor(seed));
      expect(lib.draw(recipe)).toBe(await PLAIN[style](seed));
    }
  });

  it('offer at least two choices for every piece the picker shows', async () => {
    const lib = await loadFaceLibrary(style);
    for (const part of FACE_PARTS[style]) {
      expect(lib.choices(part).values.length, part).toBeGreaterThan(1);
    }
  });
});
