// Editor rules (decisions T72 to T75): what a draft holds, how it lands on the shop, and what changed since
// customers last saw the page. Pure functions, shared by the Editor, the preview page and the mock.
import type { EditorSection, StorefrontContent } from '../schemas/editor.js';
import type { LogoShape, ShopSurface } from '../schemas/enums.js';
import type { SectionSwitches, Storefront } from '../schemas/storefront.js';
import { hexToOklch } from './palette.js';

export type SectionSwitchKey = keyof SectionSwitches;

// Which switches each Editor part turns on or off. "Hours and contact" is one part with two switches;
// the logo and colours are always on.
const SECTION_SWITCHES: Record<EditorSection, readonly SectionSwitchKey[]> = {
  brand: [],
  banners: ['banners'],
  announcement: ['announcement'],
  rewards: ['rewards'],
  categories: ['categories'],
  bestSellers: ['bestSellers'],
  favourites: ['favourites'],
  info: ['hours', 'contact'],
  about: ['about'],
  membersCount: ['membersCount'],
};

export function sectionSwitchKeys(section: EditorSection): readonly SectionSwitchKey[] {
  return SECTION_SWITCHES[section];
}

/** On when any of its switches is on; null for a part that is always shown (logo and colours). */
export function sectionIsOn(content: StorefrontContent, section: EditorSection): boolean | null {
  const keys = SECTION_SWITCHES[section];
  if (keys.length === 0) return null;
  return keys.some((key) => content.look.sections[key]);
}

/** Turns one Editor part on or off (both switches for Hours and contact). */
export function withSection(
  content: StorefrontContent,
  section: EditorSection,
  on: boolean,
): StorefrontContent {
  const sections = { ...content.look.sections };
  for (const key of SECTION_SWITCHES[section]) sections[key] = on;
  return { ...content, look: { ...content.look, sections } };
}

/** The part of a shop's storefront the Editor changes. */
export function contentOf(storefront: Storefront): StorefrontContent {
  return structuredClone({
    logo: storefront.info.logo,
    tagline: storefront.info.tagline,
    about: storefront.info.about,
    look: storefront.look,
  });
}

/** The storefront with a draft put on it: what the preview shows and what Publish saves. */
export function applyContent(storefront: Storefront, content: StorefrontContent): Storefront {
  const next = structuredClone(storefront);
  next.info.logo = content.logo;
  next.info.tagline = content.tagline;
  next.info.about = content.about;
  next.look = structuredClone(content.look);
  return next;
}

// Stable JSON with sorted keys, so two drafts built in a different order still compare equal.
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function sameContent(a: StorefrontContent, b: StorefrontContent): boolean {
  return stable(a) === stable(b);
}

export type EditorChange =
  | { kind: 'logo'; how: 'added' | 'removed' | 'changed' }
  | { kind: 'tagline' }
  | { kind: 'about' }
  | { kind: 'brandColor'; to: string }
  | { kind: 'surface'; from: ShopSurface; to: ShopSurface }
  | { kind: 'pageColor'; to: string | null }
  | { kind: 'cardColor'; to: string | null }
  | { kind: 'logoShape'; to: LogoShape }
  | { kind: 'banners'; from: number; to: number }
  | { kind: 'bannerSeconds'; to: number }
  | { kind: 'announcement'; how: 'added' | 'removed' | 'changed' }
  | { kind: 'section'; section: SectionSwitchKey; on: boolean };

function how(before: unknown, after: unknown): 'added' | 'removed' | 'changed' {
  if (before === null) return 'added';
  if (after === null) return 'removed';
  return 'changed';
}

/** What Publish will change, in page order (E2). Empty when the draft is what customers see. */
export function editorChanges(
  published: StorefrontContent,
  draft: StorefrontContent,
): EditorChange[] {
  const out: EditorChange[] = [];
  const a = published.look;
  const b = draft.look;
  if (published.logo !== draft.logo)
    out.push({ kind: 'logo', how: how(published.logo, draft.logo) });
  if (a.brandColor.toLowerCase() !== b.brandColor.toLowerCase())
    out.push({ kind: 'brandColor', to: b.brandColor });
  if (a.surface !== b.surface) out.push({ kind: 'surface', from: a.surface, to: b.surface });
  if ((a.pageColor ?? '').toLowerCase() !== (b.pageColor ?? '').toLowerCase())
    out.push({ kind: 'pageColor', to: b.pageColor });
  if ((a.cardColor ?? '').toLowerCase() !== (b.cardColor ?? '').toLowerCase())
    out.push({ kind: 'cardColor', to: b.cardColor });
  if (a.logoShape !== b.logoShape) out.push({ kind: 'logoShape', to: b.logoShape });
  if ((published.tagline ?? '') !== (draft.tagline ?? '')) out.push({ kind: 'tagline' });
  if (stable(a.banners) !== stable(b.banners))
    out.push({ kind: 'banners', from: a.banners.length, to: b.banners.length });
  if (a.bannerSeconds !== b.bannerSeconds && b.banners.length > 1)
    out.push({ kind: 'bannerSeconds', to: b.bannerSeconds });
  if (stable(a.announcement) !== stable(b.announcement))
    out.push({ kind: 'announcement', how: how(a.announcement, b.announcement) });
  if ((published.about ?? '') !== (draft.about ?? '')) out.push({ kind: 'about' });
  for (const [key, on] of Object.entries(b.sections)) {
    const sectionKey = SECTION_KEYS.find((k) => k === key);
    if (sectionKey && a.sections[sectionKey] !== on)
      out.push({ kind: 'section', section: sectionKey, on });
  }
  return out;
}

const SECTION_KEYS: readonly SectionSwitchKey[] = [
  'banners',
  'announcement',
  'rewards',
  'favourites',
  'categories',
  'bestSellers',
  'about',
  'hours',
  'contact',
  'membersCount',
];

export const COLOUR_FAMILIES = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
  'brown',
  'grey',
  'black',
  'white',
] as const;
export type ColourFamily = (typeof COLOUR_FAMILIES)[number];

/** A plain name for a colour ("Red", "Brown"), so the owner never has to read a code. */
export function colourFamily(hex: string): ColourFamily {
  const c = hexToOklch(hex);
  if (!c) return 'grey';
  if (c.c < 0.03) {
    if (c.l >= 0.92) return 'white';
    if (c.l <= 0.25) return 'black';
    return 'grey';
  }
  const h = c.h;
  // OKLCH hues: pure red sits near 29, pink and magenta from 320 round to 360.
  if (h >= 35 && h < 95 && c.l < 0.55) return 'brown';
  if (h < 34) return 'red';
  if (h < 75) return 'orange';
  if (h < 115) return 'yellow';
  if (h < 165) return 'green';
  if (h < 215) return 'teal';
  if (h < 285) return 'blue';
  if (h < 320) return 'purple';
  return 'pink';
}
