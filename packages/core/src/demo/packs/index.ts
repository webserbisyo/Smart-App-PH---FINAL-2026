import type { ShopPack } from '../../schemas/shop-pack.js';
import type { DemoShopSlug } from '../slugs.js';
import { AQUALINIS_PACK } from './aqualinis.js';
import { KANTO_SMASH_PACK } from './kanto-smash.js';
import { KAPE_JUAN_PACK } from './kape-juan.js';
import { LOLA_REMY_PACK } from './lola-remy.js';
import { TALA_APPAREL_PACK } from './tala-apparel.js';

// The one source for mocks, tests, the dev seed and "Start with samples" (N28).
export const SHOP_PACKS: Readonly<Record<DemoShopSlug, ShopPack>> = {
  'kanto-smash': KANTO_SMASH_PACK,
  aqualinis: AQUALINIS_PACK,
  'tala-apparel': TALA_APPAREL_PACK,
  'kape-juan': KAPE_JUAN_PACK,
  'lola-remy': LOLA_REMY_PACK,
};
