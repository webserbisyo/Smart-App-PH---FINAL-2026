// Pure functions for Shop Home section visibility, ordering, and quick-add rules (T06).
import type { Catalog, Item } from '../schemas/catalog.js';
import type { Storefront } from '../schemas/storefront.js';
import { openState } from './hours.js';

export interface HomeDeviceState {
  favouriteIds?: readonly string[] | undefined;
  member?: { balance: number; pendingStamps: number } | null | undefined;
}

export interface HomeSectionVisibility {
  demoRibbon: boolean;
  banners: boolean;
  brandPanel: boolean;
  announcement: boolean;
  closedOrBusy: boolean;
  rewards: boolean;
  favourites: boolean;
  categories: boolean;
  bestSellers: boolean;
  about: boolean;
  hours: boolean;
  contact: boolean;
  membersCount: boolean;
  footer: boolean;
}

/**
 * Computes which sections render on the Shop Home screen.
 * Customers never see empty sections: a section with no content is not rendered.
 */
export function resolveHomeSections(
  storefront: Storefront,
  catalog: Catalog,
  now: string | Date,
  deviceState?: HomeDeviceState | undefined,
): HomeSectionVisibility {
  const sections = storefront.look.sections;

  // 1. Banners: if switch is on, show carousel when >= 1 banner, brand-panel when 0.
  const hasBanners = storefront.look.banners.length > 0;
  const banners = sections.banners && hasBanners;
  const brandPanel = sections.banners && !hasBanners;

  // 2. Announcement: tone-based alert, hidden after endsAt.
  const announcementData = storefront.look.announcement;
  const announcementValid =
    announcementData !== null &&
    (announcementData.endsAt === null ||
      new Date(now).getTime() <= new Date(announcementData.endsAt).getTime());
  const announcement = sections.announcement && announcementValid;

  // 3. Closed or busy card: rendered only when the shop is not open.
  const state = openState(storefront, now);
  const closedOrBusy = state.state !== 'open';

  // 4. Rewards card: rendered when switch is on and stamp card is not off.
  const rewards = sections.rewards && storefront.stampCard.status !== 'off';

  // 5. Favourites row: only when customer has hearts and those items exist.
  const favIds = deviceState?.favouriteIds ?? [];
  const hasMatchingFavs =
    favIds.length > 0 && catalog.items.some((item) => favIds.includes(item.id));
  const favourites = sections.favourites && hasMatchingFavs;

  // 6. Categories: chips with Fluent icon, rendered if switch on and categories exist.
  const categories = sections.categories && catalog.categories.length > 0;

  // 7. Best sellers: rendered if switch on and items exist.
  const bestSellers = sections.bestSellers && catalog.items.length > 0;

  // 8. About: rendered if switch on and text exists.
  const about = sections.about && Boolean(storefront.info.about?.trim());

  // 9. Hours: rendered if switch on and hours table has entries.
  const hours = sections.hours && storefront.hours.length > 0;

  // 10. Contact: rendered if switch on and at least one contact channel is available.
  const contactInfo = storefront.info.contact;
  const hasContact = Boolean(
    contactInfo.phone ||
    contactInfo.messengerUsername ||
    contactInfo.facebookUrl ||
    (contactInfo.showAddress && (contactInfo.pin || contactInfo.address)),
  );
  const contact = sections.contact && hasContact;

  // 11. Members count: rendered only if owner turned it on and count > 0.
  const membersCount = sections.membersCount && storefront.membersCount > 0;

  // 12. Footer: always rendered on finished shop home.
  const footer = true;

  return {
    demoRibbon: storefront.info.isDemo,
    banners,
    brandPanel,
    announcement,
    closedOrBusy,
    rewards,
    favourites,
    categories,
    bestSellers,
    about,
    hours,
    contact,
    membersCount,
    footer,
  };
}

/**
 * Returns best sellers with featured items first (from pack), then remaining items.
 */
export function getBestSellerItems(items: readonly Item[], limit = 8): Item[] {
  const featured = items.filter((i) => i.featured);
  const rest = items.filter((i) => !i.featured);
  return [...featured, ...rest].slice(0, limit);
}
