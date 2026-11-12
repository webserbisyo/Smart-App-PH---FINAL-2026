// Draws a made picture (decision T83) with DiceBear Adventurer by Lisa Wischofsky (CC BY 4.0). The drawing
// code loads only when a picture maker opens; the saved SVG shows everywhere else.
import type { AvatarMake } from '@smartapp/core';

// The library's own piece names, in the order the maker shows them (short hair first).
const HAIR = [
  'short01',
  'short02',
  'short03',
  'short04',
  'short05',
  'short06',
  'short07',
  'short08',
  'short09',
  'short10',
  'short11',
  'short12',
  'short13',
  'short14',
  'short15',
  'short16',
  'short17',
  'short18',
  'short19',
  'long01',
  'long02',
  'long03',
  'long04',
  'long05',
  'long06',
  'long07',
  'long08',
  'long09',
  'long10',
  'long11',
  'long12',
  'long13',
  'long14',
  'long15',
  'long16',
  'long17',
  'long18',
  'long19',
  'long20',
  'long21',
  'long22',
  'long23',
  'long24',
  'long25',
  'long26',
] as const;
const EYES = [
  'variant01',
  'variant02',
  'variant03',
  'variant04',
  'variant05',
  'variant06',
  'variant07',
  'variant08',
  'variant09',
  'variant10',
  'variant11',
  'variant12',
  'variant13',
  'variant14',
  'variant15',
  'variant16',
  'variant17',
  'variant18',
  'variant19',
  'variant20',
  'variant21',
  'variant22',
  'variant23',
  'variant24',
  'variant25',
  'variant26',
] as const;
const EYEBROWS = [
  'variant01',
  'variant02',
  'variant03',
  'variant04',
  'variant05',
  'variant06',
  'variant07',
  'variant08',
  'variant09',
  'variant10',
  'variant11',
  'variant12',
  'variant13',
  'variant14',
  'variant15',
] as const;
const MOUTH = [
  'variant01',
  'variant02',
  'variant03',
  'variant04',
  'variant05',
  'variant06',
  'variant07',
  'variant08',
  'variant09',
  'variant10',
  'variant11',
  'variant12',
  'variant13',
  'variant14',
  'variant15',
  'variant16',
  'variant17',
  'variant18',
  'variant19',
  'variant20',
  'variant21',
  'variant22',
  'variant23',
  'variant24',
  'variant25',
  'variant26',
  'variant27',
  'variant28',
  'variant29',
  'variant30',
] as const;
const GLASSES = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05'] as const;
const EARRINGS = [
  'variant01',
  'variant02',
  'variant03',
  'variant04',
  'variant05',
  'variant06',
] as const;
const EXTRAS = ['mustache', 'blush', 'birthmark', 'freckles'] as const;

export type DrawAvatar = (make: AvatarMake) => string;

/** One piece of a list by number, or the first one when the number is out of range. */
function pick<T>(list: readonly [T, ...T[]], index: number): T {
  return list[index] ?? list[0];
}

/** The library's default colour list for a piece (its schema), so our code holds no colour values. */
function colours(schema: unknown, key: string): string[] {
  if (typeof schema !== 'object' || schema === null || !('properties' in schema)) return [];
  const props = schema.properties;
  if (typeof props !== 'object' || props === null || !(key in props)) return [];
  const prop: unknown = Reflect.get(props, key);
  if (typeof prop !== 'object' || prop === null || !('default' in prop)) return [];
  const list = prop.default;
  return Array.isArray(list) ? list.filter((c): c is string => typeof c === 'string') : [];
}

let loading: Promise<DrawAvatar> | null = null;

/** Loads the drawing code once (about 110 KB) and returns the drawing function. */
export function loadAvatarDrawer(): Promise<DrawAvatar> {
  loading ??= Promise.all([import('@dicebear/core'), import('@dicebear/adventurer')])
    .then(([core, style]) => {
      const hairColors = colours(style.schema, 'hairColor');
      const skins = colours(style.schema, 'skinColor');
      return (make: AvatarMake) => {
        const hairColor = hairColors[make.hairColor] ?? hairColors[0];
        const skin = skins[make.skin] ?? skins[0];
        return core
          .createAvatar(style, {
            seed: 'smartapp',
            hair: [pick(HAIR, make.hair)],
            hairProbability: 100,
            ...(hairColor ? { hairColor: [hairColor] } : {}),
            ...(skin ? { skinColor: [skin] } : {}),
            eyes: [pick(EYES, make.eyes)],
            eyebrows: [pick(EYEBROWS, make.eyebrows)],
            mouth: [pick(MOUTH, make.mouth)],
            glasses: [pick(GLASSES, make.glasses - 1)],
            glassesProbability: make.glasses > 0 ? 100 : 0,
            earrings: [pick(EARRINGS, make.earrings - 1)],
            earringsProbability: make.earrings > 0 ? 100 : 0,
            features: [pick(EXTRAS, make.extra - 1)],
            featuresProbability: make.extra > 0 ? 100 : 0,
          })
          .toString();
      };
    })
    .catch((err: unknown) => {
      // A failed download can be tried again.
      loading = null;
      throw err;
    });
  return loading;
}

/** The number of choices the library has for each piece (checked against core in a test). */
export async function avatarLibraryCounts(): Promise<Record<string, number>> {
  const style = await import('@dicebear/adventurer');
  return {
    hair: HAIR.length,
    hairColor: colours(style.schema, 'hairColor').length,
    skin: colours(style.schema, 'skinColor').length,
    eyes: EYES.length,
    eyebrows: EYEBROWS.length,
    mouth: MOUTH.length,
    glasses: GLASSES.length + 1,
    earrings: EARRINGS.length + 1,
    extra: EXTRAS.length + 1,
  };
}
