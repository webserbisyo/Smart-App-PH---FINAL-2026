import {
  ClockIcon,
  FlameIcon,
  GiftIcon,
  HeartIcon,
  ImagesIcon,
  LayoutGridIcon,
  MegaphoneIcon,
  PaletteIcon,
  TextIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  colourFamily,
  editorWords,
  formatManila,
  type EditorSection,
  type PublicShop,
  type StorefrontContent,
} from '@smartapp/core';

const S = editorWords.partStatus;

// The list follows the page from top to bottom (decision T72).
export const PART_GROUPS = [
  { id: 'look', parts: ['brand'] },
  { id: 'top', parts: ['banners', 'announcement'] },
  { id: 'home', parts: ['rewards', 'categories', 'bestSellers', 'favourites'] },
  { id: 'info', parts: ['info', 'about', 'membersCount'] },
] as const satisfies readonly { id: string; parts: readonly EditorSection[] }[];

export const PART_ICONS: Record<EditorSection, LucideIcon> = {
  brand: PaletteIcon,
  banners: ImagesIcon,
  announcement: MegaphoneIcon,
  rewards: GiftIcon,
  categories: LayoutGridIcon,
  bestSellers: FlameIcon,
  favourites: HeartIcon,
  info: ClockIcon,
  about: TextIcon,
  membersCount: UsersIcon,
};

/** The colour's plain name, e.g. "Red", for the list and the change list. */
export function colourName(hex: string): string {
  return editorWords.colours[colourFamily(hex)];
}

/** The one line under each part in the list: what it shows now. */
export function partStatus(
  section: EditorSection,
  content: StorefrontContent,
  shop: PublicShop | undefined,
  catalogName: string,
): string {
  const look = content.look;
  switch (section) {
    case 'brand': {
      const colour = colourName(look.brandColor);
      const surface = editorWords.surfaces[look.surface];
      return content.logo ? S.brand(colour, surface) : S.brandNoLogo(colour, surface);
    }
    case 'banners':
      return S.banners(look.banners.length, look.bannerSeconds);
    case 'announcement':
      if (!look.announcement) return S.announcementEmpty;
      return S.announcementOn(
        look.announcement.endsAt ? formatManila(look.announcement.endsAt, 'date') : null,
      );
    case 'rewards': {
      const card = shop?.storefront.stampCard;
      if (!card) return '';
      if (card.status === 'off') return S.rewardsOff;
      return S.rewards(card.rule.stampsNeeded, card.reward.title);
    }
    case 'categories':
      return shop ? S.categories(shop.catalog.categories.length, catalogName) : '';
    case 'bestSellers':
      return shop ? S.bestSellers(shop.catalog.items.filter((i) => i.featured).length) : '';
    case 'favourites':
      return S.favourites;
    case 'info':
      return S.info;
    case 'about':
      return S.about(content.about?.length ?? 0);
    case 'membersCount':
      return shop ? S.membersCount(shop.storefront.membersCount) : '';
  }
}

/** The stamp card part can only be shown while the card is on in Members. */
export function stampCardOff(shop: PublicShop | undefined): boolean {
  return shop?.storefront.stampCard.status === 'off';
}
