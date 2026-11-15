// Customise any face (decision T93): every owner face is a DiceBear drawing from a seed. Its recipe is that
// seed plus the library's own piece names and colours, so the picker can change one piece and draw it
// again on the device. The finished SVG is saved beside the recipe, so other pages never load the library.
import { z } from 'zod';
import { OwnerAvatarStyleEnum, type OwnerAvatarStyle } from './enums.js';

// The 12 faces of each style, in order: face N is drawn from seed N (tooling/scripts/default-avatars.ts).
export const OWNER_FACE_SEEDS = [
  'Ligaya',
  'Bayani',
  'Mayumi',
  'Dakila',
  'Tala',
  'Amihan',
  'Lakan',
  'Diwa',
  'Hiraya',
  'Malaya',
  'Isko',
  'Liwayway',
] as const;

// "none" turns an optional piece off (glasses, beard …).
export const FACE_NONE = 'none';

export const FaceRecipeSchema = z.object({
  style: OwnerAvatarStyleEnum,
  seed: z.string().trim().min(1).max(40),
  // Piece → choice, as the library names them ("hair" → "variant12", "hairColor" → "6c4545").
  parts: z
    .record(z.string().regex(/^[a-zA-Z]{1,32}$/), z.string().regex(/^[a-zA-Z0-9]{1,32}$/))
    .refine((parts) => Object.keys(parts).length <= 32, { message: 'too_many_parts' }),
});
export type FaceRecipe = z.infer<typeof FaceRecipeSchema>;

// The pieces the picker offers for each style, one row each, in this order. The rest of a face stays as
// its seed drew it. Colours end in "Color", as the library names them.
export const FACE_PARTS = {
  sketch: ['hair', 'brows', 'eyes', 'glasses', 'lips', 'nose', 'beard'],
  soft: ['hair', 'eyes', 'eyebrows', 'mouth', 'glasses', 'earrings', 'freckles'],
  bright: [
    'hair',
    'hairColor',
    'baseColor',
    'eyes',
    'eyebrows',
    'mouth',
    'glasses',
    'earrings',
    'facialHair',
    'shirt',
    'shirtColor',
  ],
  people: [
    'head',
    'headContrastColor',
    'skinColor',
    'face',
    'facialHair',
    'accessories',
    'clothingColor',
  ],
  pixel: [
    'hair',
    'hairColor',
    'skinColor',
    'eyes',
    'mouth',
    'glasses',
    'beard',
    'hat',
    'clothing',
    'clothingColor',
  ],
  fun: ['shapeColor', 'eyes', 'mouth'],
  adventure: [
    'hair',
    'hairColor',
    'skinColor',
    'eyes',
    'eyebrows',
    'mouth',
    'glasses',
    'earrings',
    'features',
  ],
} as const satisfies Record<OwnerAvatarStyle, readonly string[]>;

// Options every face of a style is drawn with. Fun (Thumbs) brings its own square background, which
// would hide the owner's theme colour.
export const FACE_BASE: Partial<Record<OwnerAvatarStyle, Record<string, string[]>>> = {
  fun: { backgroundColor: ['transparent'] },
};

export function isColourPart(part: string): boolean {
  return part.endsWith('Color');
}

/**
 * A recipe as DiceBear options: one choice per piece, optional pieces switched on or off. `optional`
 * says which pieces have an on/off chance in the library (its "…Probability" options).
 */
export function faceOptions(
  recipe: FaceRecipe,
  optional: (part: string) => boolean,
): Record<string, string | string[] | number> {
  const options: Record<string, string | string[] | number> = {
    ...FACE_BASE[recipe.style],
    seed: recipe.seed,
  };
  for (const [part, choice] of Object.entries(recipe.parts)) {
    if (choice === FACE_NONE) {
      options[`${part}Probability`] = 0;
      continue;
    }
    options[part] = [choice];
    if (optional(part)) options[`${part}Probability`] = 100;
  }
  return options;
}

/** A recipe from the choices the library made for a seed (its `extra`), so it draws the same face. */
export function recipeFromPicks(
  style: OwnerAvatarStyle,
  seed: string,
  picks: Record<string, unknown>,
  optionalParts: readonly string[],
): FaceRecipe {
  const parts: Record<string, string> = {};
  for (const [part, value] of Object.entries(picks)) {
    // Backgrounds are the owner's theme, not part of the face.
    if (/background/i.test(part) || typeof value !== 'string') continue;
    const choice = value.replace(/^#/, '');
    if (/^[a-zA-Z0-9]{1,32}$/.test(choice) && /^[a-zA-Z]{1,32}$/.test(part)) parts[part] = choice;
  }
  for (const part of optionalParts) if (!(part in parts)) parts[part] = FACE_NONE;
  return { style, seed, parts };
}
