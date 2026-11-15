// One picture shape for owners and members (decisions T68, T93, T95). Its own module, so the order,
// member and loyalty schemas can use it without importing all of Settings.
import { z } from 'zod';
import { AvatarSvgSchema } from './avatar-make.js';
import { MediaRefSchema } from './common.js';
import { AvatarThemeEnum, OwnerAvatarStyleEnum } from './enums.js';
import { FaceRecipeSchema } from './face-recipe.js';

// A face is a tiny record that points at a file the app ships (0 KB of storage); a photo is an upload.
export const OwnerAvatarSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('face'),
    style: OwnerAvatarStyleEnum,
    face: z.number().int().min(1).max(12),
    theme: AvatarThemeEnum,
  }),
  z.object({
    // A face changed on the device (T93): its recipe to open it again, and the drawing to show.
    kind: z.literal('custom'),
    recipe: FaceRecipeSchema,
    svg: AvatarSvgSchema,
    theme: AvatarThemeEnum,
  }),
  z.object({ kind: z.literal('initials'), theme: AvatarThemeEnum }),
  z.object({ kind: z.literal('photo'), ref: MediaRefSchema, bytes: z.number().int().min(0) }),
]);
export type OwnerAvatar = z.infer<typeof OwnerAvatarSchema>;
