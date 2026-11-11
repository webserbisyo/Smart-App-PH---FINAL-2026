import type { FontPair } from '@smartapp/core/schemas/enums';
import type { CssVarsObject } from './css-vars';

// The families behind each font pair (decision T79), self-hosted from Fontsource and declared in
// globals.css. A browser downloads a family only when a page uses it, so a customer gets one pair.
const SANS = 'ui-sans-serif, system-ui, sans-serif';
const SERIF = 'ui-serif, Georgia, serif';

export const FONT_PAIR_FAMILIES: Record<FontPair, { heading: string; body: string }> = {
  malinaw: {
    heading: `'Plus Jakarta Sans Variable', ${SANS}`,
    body: `'Plus Jakarta Sans Variable', ${SANS}`,
  },
  friendly: { heading: `'Fredoka Variable', ${SANS}`, body: `'Nunito Variable', ${SANS}` },
  street: {
    heading: `'Bricolage Grotesque Variable', ${SANS}`,
    body: `'DM Sans Variable', ${SANS}`,
  },
  cafe: { heading: `'Fraunces Variable', ${SERIF}`, body: `'Figtree Variable', ${SANS}` },
  elegant: {
    heading: `'Playfair Display Variable', ${SERIF}`,
    body: `'Manrope Variable', ${SANS}`,
  },
  bakery: { heading: `'Young Serif', ${SERIF}`, body: `'Nunito Variable', ${SANS}` },
  playful: { heading: `'Baloo 2 Variable', ${SANS}`, body: `'Nunito Variable', ${SANS}` },
  modern: { heading: `'Sora Variable', ${SANS}`, body: `'Outfit Variable', ${SANS}` },
};

/** The pair as the two font variables every page reads: `--font-sans` (body) and `--font-heading`. */
export function fontPairVars(pair: FontPair): CssVarsObject {
  const families = FONT_PAIR_FAMILIES[pair];
  return { '--font-sans': families.body, '--font-heading': families.heading };
}
