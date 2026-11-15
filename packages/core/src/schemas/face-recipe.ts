// Customise any face (decision T93): every owner face is a DiceBear drawing from a seed. Its recipe is that
// seed plus the library's own piece names and colours, so the picker can change one piece and draw it
// again on the device. The finished SVG is saved beside the recipe, so other pages never load the library.
import { z } from 'zod';
import { OwnerAvatarStyleEnum } from './enums.js';

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
