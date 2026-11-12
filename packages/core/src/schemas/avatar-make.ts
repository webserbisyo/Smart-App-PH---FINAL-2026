// Make your own picture (decision T83): a face drawn on the device from DiceBear Adventurer pieces, for
// owners and customers. The choices are small numbers; the finished SVG is saved beside them, so every other
// page shows the picture without loading the drawing code.
import { z } from 'zod';

// The pieces a person changes, in the order the maker shows them.
export const AVATAR_MAKE_PARTS = [
  'hair',
  'hairColor',
  'skin',
  'eyes',
  'eyebrows',
  'mouth',
  'glasses',
  'earrings',
  'extra',
] as const;
export const AvatarMakePartEnum = z.enum(AVATAR_MAKE_PARTS);
export type AvatarMakePart = z.infer<typeof AvatarMakePartEnum>;

// How many choices each piece has. For glasses, earrings and extra, 0 means none.
export const AVATAR_MAKE_COUNTS = {
  hair: 45,
  hairColor: 14,
  skin: 4,
  eyes: 26,
  eyebrows: 15,
  mouth: 30,
  glasses: 6,
  earrings: 7,
  extra: 5,
} as const satisfies Record<AvatarMakePart, number>;

// The pieces with a "none" choice first.
export const AVATAR_MAKE_OPTIONAL: readonly AvatarMakePart[] = ['glasses', 'earrings', 'extra'];

const piece = (count: number) =>
  z
    .number()
    .int()
    .min(0)
    .max(count - 1);

export const AvatarMakeSchema = z.object({
  hair: piece(AVATAR_MAKE_COUNTS.hair),
  hairColor: piece(AVATAR_MAKE_COUNTS.hairColor),
  skin: piece(AVATAR_MAKE_COUNTS.skin),
  eyes: piece(AVATAR_MAKE_COUNTS.eyes),
  eyebrows: piece(AVATAR_MAKE_COUNTS.eyebrows),
  mouth: piece(AVATAR_MAKE_COUNTS.mouth),
  glasses: piece(AVATAR_MAKE_COUNTS.glasses),
  earrings: piece(AVATAR_MAKE_COUNTS.earrings),
  extra: piece(AVATAR_MAKE_COUNTS.extra),
});
export type AvatarMake = z.infer<typeof AvatarMakeSchema>;

// A drawn face is about 9 KB. Only shown through an <img>, where an SVG cannot run code; the checks keep
// anything else out anyway.
export const AVATAR_SVG_MAX = 40_000;
export const AvatarSvgSchema = z
  .string()
  .max(AVATAR_SVG_MAX)
  .regex(/^<svg[\s>]/)
  .refine((svg) => !/<script|<foreignobject|\son[a-z]+\s*=|javascript:/i.test(svg), {
    message: 'unsafe_svg',
  });

/** The first face in the maker: short black hair, friendly eyes, a grin, nothing extra. */
export const STARTING_MAKE: AvatarMake = {
  hair: 0,
  hairColor: 8,
  skin: 1,
  eyes: 25,
  eyebrows: 9,
  mouth: 22,
  glasses: 0,
  earrings: 0,
  extra: 0,
};

/** A saved drawing as an image address for <img src>. */
export function avatarSvgSrc(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
