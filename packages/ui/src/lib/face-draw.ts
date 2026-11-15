// Draws an owner face from its recipe (decision T93) with the DiceBear style it belongs to. Each style's
// code loads only when the owner taps Customise on that style; the saved SVG shows everywhere else.
import {
  FACE_BASE,
  FACE_NONE,
  faceOptions,
  recipeFromPicks,
  type FaceRecipe,
  type OwnerAvatarStyle,
} from '@smartapp/core';
import type * as DiceBearCore from '@dicebear/core';

type Core = typeof DiceBearCore;

export interface FaceChoices {
  // The library's names, or colours as hex without "#"; "none" first for optional pieces.
  values: string[];
  colour: boolean;
}

export interface FaceLibrary {
  draw: (recipe: FaceRecipe, size?: number) => string;
  /** The recipe of the face the library draws for this seed (the default faces). */
  recipeFor: (seed: string) => FaceRecipe;
  choices: (part: string) => FaceChoices;
}

/** A property of the style's JSON schema, read without trusting its shape. */
function schemaProp(schema: unknown, key: string): Record<string, unknown> | null {
  if (typeof schema !== 'object' || schema === null || !('properties' in schema)) return null;
  const props = schema.properties;
  if (typeof props !== 'object' || props === null || !(key in props)) return null;
  const prop: unknown = Reflect.get(props, key);
  if (typeof prop !== 'object' || prop === null) return null;
  const out: Record<string, unknown> = {};
  Object.assign(out, prop);
  return out;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function library<O extends object>(
  core: Core,
  style: Parameters<Core['createAvatar']>[0],
  schema: unknown,
  name: OwnerAvatarStyle,
): FaceLibrary {
  const optional = (part: string) => schemaProp(schema, `${part}Probability`) !== null;
  const optionalParts = Object.keys(
    typeof schema === 'object' && schema !== null && 'properties' in schema
      ? (schema.properties ?? {})
      : {},
  )
    .filter((k) => k.endsWith('Probability'))
    .map((k) => k.slice(0, -'Probability'.length));
  const draw = (recipe: FaceRecipe, size = 128): string => {
    const options: Partial<O> = {};
    Object.assign(options, faceOptions(recipe, optional), { size });
    return core.createAvatar(style, options).toString();
  };
  return {
    draw,
    recipeFor: (seed) => {
      const options: Partial<O> = {};
      Object.assign(options, FACE_BASE[name], { seed });
      const picks = core.createAvatar(style, options).toJson().extra;
      return recipeFromPicks(name, seed, picks, optionalParts);
    },
    choices: (part) => {
      const prop = schemaProp(schema, part);
      const items = prop ? schemaProp({ properties: { items: prop.items } }, 'items') : null;
      const colour = part.endsWith('Color');
      const values = colour ? strings(prop?.default) : strings(items?.enum);
      return { values: optional(part) ? [FACE_NONE, ...values] : values, colour };
    },
  };
}

const IMPORTS = {
  sketch: () => import('@dicebear/notionists'),
  soft: () => import('@dicebear/lorelei'),
  bright: () => import('@dicebear/micah'),
  people: () => import('@dicebear/open-peeps'),
  pixel: () => import('@dicebear/pixel-art'),
  fun: () => import('@dicebear/thumbs'),
  adventure: () => import('@dicebear/adventurer'),
} as const satisfies Record<OwnerAvatarStyle, () => Promise<unknown>>;

const loading = new Map<OwnerAvatarStyle, Promise<FaceLibrary>>();

/** Loads one style's drawing code once (11 to 123 KB) and returns what the picker needs from it. */
export function loadFaceLibrary(name: OwnerAvatarStyle): Promise<FaceLibrary> {
  const found = loading.get(name);
  if (found) return found;
  const next = Promise.all([import('@dicebear/core'), IMPORTS[name]()])
    .then(([core, style]) => library(core, style, style.schema, name))
    .catch((err: unknown) => {
      // A failed download can be tried again.
      loading.delete(name);
      throw err;
    });
  loading.set(name, next);
  return next;
}
