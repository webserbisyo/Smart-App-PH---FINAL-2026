// A shop's link, <slug>.webserbisyo.com (decision T116, X1). The same rule as the tenants.slug CHECK:
// 3 to 40 small letters or numbers, words joined by single dashes. Reserved words live in the database
// (reserved_slugs); core keeps only the few the sample data needs (demo/slugs.ts).
import { z } from 'zod';

export const SHOP_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SHOP_SLUG_MIN = 3;
export const SHOP_SLUG_MAX = 40;

export const ShopSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(SHOP_SLUG_MIN)
  .max(SHOP_SLUG_MAX)
  .regex(SHOP_SLUG_PATTERN);

export function isShopSlug(value: string): boolean {
  return ShopSlugSchema.safeParse(value).success;
}

/** "Lola Remy's Bakeshop!" → "lola-remys-bakeshop". Accents go (ñ → n); anything else becomes a dash. */
export function slugFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SHOP_SLUG_MAX)
    .replace(/-+$/g, '');
}

/**
 * Links to try for a new shop, best first: the name itself, then the name with its city, then numbered.
 * A name too short for a link (under 3) starts from "shop".
 */
export function slugCandidates(name: string, city: string): string[] {
  const base = slugFromName(name);
  const root = base.length >= SHOP_SLUG_MIN ? base : `shop-${base}`.replace(/-+$/, '');
  const withCity = slugFromName(`${root} ${city}`);
  const numbered = [2, 3, 4, 5].map((n) => {
    const suffix = `-${n}`;
    return `${root.slice(0, SHOP_SLUG_MAX - suffix.length).replace(/-+$/, '')}${suffix}`;
  });
  return [...new Set([root, withCity, ...numbered])].filter(isShopSlug);
}
