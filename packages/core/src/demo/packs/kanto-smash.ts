import type { ShopPack } from '../../schemas/shop-pack.js';
import { ALL_SECTIONS_ON, category, days, group, makeItems, peso } from './build.js';

const P = 'ks';

const categories = [
  category(P, 'burgers', 'Smash Burgers', 'burger', 0),
  category(P, 'chicken-rice', 'Chicken and Rice', 'chicken', 1),
  category(P, 'sides', 'Sides', 'fries', 2),
  category(P, 'combos', 'Combos', 'combo', 3),
  category(P, 'drinks', 'Drinks', 'soda', 4),
];

const optionGroups = [
  group(P, 'extras', 'Extras', 0, 6, [
    { name: 'Extra patty', price: 60 },
    { name: 'Cheese slice', price: 20 },
    { name: 'Bacon', price: 40 },
    { name: 'Egg', price: 20 },
    { name: 'Caramelised onions', price: 15 },
    // A sold-out option (blueprint section 14).
    { name: 'Jalapeños', price: 15, soldOut: true },
  ]),
  group(P, 'sauce', 'Sauce', 0, 2, [
    { name: 'Kanto sauce', isDefault: true },
    { name: 'Sriracha mayo', price: 10 },
    { name: 'Garlic aioli', price: 10 },
    { name: 'Cheese sauce dip', price: 25 },
  ]),
  group(P, 'meal', 'Make it a meal', 0, 1, [{ name: 'Regular fries and iced tea', price: 70 }]),
  group(P, 'side-upgrade', 'Upgrade your side', 0, 1, [
    { name: 'Cheese fries', price: 40 },
    { name: 'Onion rings', price: 25 },
  ]),
  group(P, 'drink', 'Choose your drink', 1, 1, [
    { name: 'House iced tea', isDefault: true },
    { name: 'Calamansi juice', price: 10 },
    { name: 'Soda in can', price: 10 },
  ]),
  group(P, 'dip', 'Dip', 1, 1, [
    { name: 'BBQ' },
    { name: 'Honey mustard' },
    { name: 'Sweet chili' },
    { name: 'Garlic aioli' },
  ]),
  group(P, 'dip-bucket', 'Dips', 1, 4, [
    { name: 'BBQ' },
    { name: 'Honey mustard' },
    { name: 'Sweet chili' },
    { name: 'Garlic aioli' },
  ]),
  group(P, 'rice', 'Extra rice', 0, 2, [{ name: 'Extra rice', price: 20 }]),
];

const PATTY = { name: 'Patty', values: ['Single', 'Double', 'Triple'] } as const;
const byValue =
  (prices: Record<string, number>) =>
  (values: readonly string[]): number =>
    prices[values[0] ?? ''] ?? 0;

const items = makeItems('kanto-smash', P, [
  {
    key: 'classic-smash',
    category: 'burgers',
    name: 'Classic Smash',
    description:
      'Crispy-edged smashed beef patty, American cheese, pickles and Kanto sauce on a toasted potato bun.',
    axes: [PATTY],
    price: byValue({ Single: 149, Double: 209, Triple: 269 }),
    groups: ['extras', 'sauce', 'meal'],
    pairs: ['kanto-fries', 'house-iced-tea'],
    photos: ['classic-smash'],
    featured: true,
  },
  {
    key: 'cheesy-bacon-smash',
    category: 'burgers',
    name: 'Cheesy Bacon Smash',
    description: 'Double cheese and crispy bacon on our classic smash.',
    axes: [{ name: 'Patty', values: ['Single', 'Double'] }],
    price: byValue({ Single: 229, Double: 289 }),
    groups: ['extras', 'sauce', 'meal'],
    pairs: ['kanto-fries', 'thick-shake'],
    photos: ['cheesy-bacon-smash'],
    featured: true,
  },
  {
    key: 'kanto-spicy-smash',
    category: 'burgers',
    name: 'Kanto Spicy Smash',
    description: 'Sriracha mayo and jalapeños for the brave.',
    price: 199,
    groups: ['extras', 'sauce', 'meal'],
    pairs: ['calamansi-juice'],
    photos: ['kanto-spicy-smash'],
  },
  {
    key: 'mushroom-swiss-smash',
    category: 'burgers',
    name: 'Mushroom Swiss Smash',
    description: 'Buttery mushrooms and melted Swiss.',
    price: 219,
    groups: ['extras', 'sauce', 'meal'],
    photos: ['mushroom-swiss-smash'],
  },
  {
    key: 'kanto-overload',
    category: 'burgers',
    name: 'Kanto Overload',
    description: 'Three patties, bacon, egg and double cheese.',
    price: 329,
    groups: ['extras', 'sauce'],
    pairs: ['loaded-bacon-fries', 'thick-shake'],
    photos: ['kanto-overload'],
    featured: true,
    isNew: true,
  },
  {
    key: 'crispy-chicken-sandwich',
    category: 'chicken-rice',
    name: 'Crispy Chicken Sandwich',
    price: 179,
    groups: ['extras', 'sauce', 'meal'],
    photos: ['crispy-chicken-sandwich'],
  },
  {
    key: 'chicken-nuggets',
    category: 'chicken-rice',
    name: 'Chicken Nuggets',
    axes: [{ name: 'Pieces', values: ['6 pcs', '10 pcs'] }],
    price: byValue({ '6 pcs': 119, '10 pcs': 179 }),
    groups: ['dip'],
    photos: ['chicken-nuggets'],
    isNew: true,
  },
  {
    key: 'burger-steak-rice',
    category: 'chicken-rice',
    name: 'Burger Steak with Rice',
    price: 129,
    groups: ['rice'],
    photos: ['burger-steak-rice'],
  },
  {
    key: 'kanto-fries',
    category: 'sides',
    name: 'Kanto Fries',
    axes: [{ name: 'Size', values: ['Regular', 'Large'] }],
    price: byValue({ Regular: 69, Large: 99 }),
    groups: ['sauce'],
    photos: ['kanto-fries'],
  },
  {
    key: 'cheese-fries',
    category: 'sides',
    name: 'Cheese Fries',
    price: 119,
    photos: ['cheese-fries'],
  },
  {
    key: 'onion-rings',
    category: 'sides',
    name: 'Onion Rings',
    price: 99,
    groups: ['sauce'],
    photos: ['onion-rings'],
    // The "Sold out today" item of this shop.
    availability: () => 'sold_out_today',
  },
  {
    key: 'loaded-bacon-fries',
    category: 'sides',
    name: 'Loaded Bacon Fries',
    price: 149,
    photos: ['loaded-bacon-fries'],
    isNew: true,
  },
  {
    key: 'smash-combo',
    category: 'combos',
    name: 'Smash Combo',
    description: 'Classic Smash, regular fries and iced tea.',
    price: 219,
    groups: ['side-upgrade', 'drink'],
    photos: ['smash-combo'],
    featured: true,
  },
  {
    key: 'barkada-bucket',
    category: 'combos',
    name: 'Barkada Bucket',
    description: '4 Classic Smash, 2 large fries, 10 nuggets and 4 iced teas. For groups.',
    price: 899,
    groups: ['dip-bucket'],
    photos: ['barkada-bucket'],
    isNew: true,
  },
  {
    key: 'house-iced-tea',
    category: 'drinks',
    name: 'House Iced Tea',
    axes: [{ name: 'Size', values: ['16 oz', '22 oz'] }],
    price: byValue({ '16 oz': 45, '22 oz': 65 }),
    photos: ['house-iced-tea'],
  },
  {
    key: 'calamansi-juice',
    category: 'drinks',
    name: 'Calamansi Juice',
    price: 55,
    photos: ['calamansi-juice'],
  },
  {
    key: 'soda-in-can',
    category: 'drinks',
    name: 'Soda in Can',
    price: 55,
    photos: ['soda-in-can'],
  },
  {
    key: 'thick-shake',
    category: 'drinks',
    name: 'Thick Shake',
    axes: [{ name: 'Flavour', values: ['Vanilla', 'Chocolate', 'Ube'] }],
    price: 129,
    photos: ['thick-shake'],
    isNew: true,
  },
]);

export const KANTO_SMASH_PACK: ShopPack = {
  storefront: {
    slug: 'kanto-smash',
    info: {
      name: 'Kanto Smash Burgers',
      tagline: 'Smashed fresh, served hot sa kanto.',
      about:
        "Thin, crispy-edged smash burgers on toasted potato buns, made to order. Born as a weekend stall, now the barkada's late-night stop in Marikina.",
      kind: 'food',
      isDemo: true,
      logo: 'demo:kanto-smash/brand/logo',
      contact: {
        phone: '0917 801 2201',
        messengerUsername: 'kantosmash.sample',
        facebookUrl: 'https://www.facebook.com/kantosmash.sample',
        googleReviewUrl: 'https://g.page/r/kantosmash-sample/review',
        address: '28 Bayan-Bayanan Ave., Brgy. Concepcion Uno, Marikina City, Metro Manila 1807',
        showAddress: true,
        pin: { lat: 14.643, lng: 121.101 },
        pickupNote: 'Near the Concepcion Uno barangay hall. Say your order number at the counter.',
      },
    },
    look: {
      brandColor: '#D7372F',
      surface: 'dark',
      banners: [
        {
          ref: 'demo:kanto-smash/banners/banner-1',
          alt: 'Kanto Overload with three patties, bacon and egg',
          title: 'New: Kanto Overload',
          description: 'Triple patty, bacon and a runny egg.',
          link: { kind: 'item', targetId: 'ks-kanto-overload' },
        },
        { ref: 'demo:kanto-smash/banners/banner-2', alt: 'Smash burgers on the griddle at night' },
        {
          ref: 'demo:kanto-smash/banners/banner-3',
          alt: 'Barkada Bucket for groups',
          title: '8 stamps = 1 free Classic Smash',
          description: 'Join free and get your first stamp today.',
          link: { kind: 'rewards', targetId: null },
        },
      ],
      bannerSeconds: 5,
      // The hours already say this; the slot stays for real shop news (decision R13).
      announcement: null,
      sections: ALL_SECTIONS_ON,
    },
    // Opens at 9 AM so the demo is open when people try it (decision R47).
    hours: [...days([1, 2, 3, 4], '09:00', '22:00'), ...days([5, 6, 0], '09:00', '24:00')],
    closures: [],
    pause: { busyUntil: null, paused: false },
    orderTypes: ['walk_in', 'pickup', 'delivery'],
    prepMinutes: 20,
    takeOrdersWhileClosed: true,
    payments: [
      { method: 'cash', accountName: null, accountNumber: null, qr: null, sample: true },
      { method: 'cod', accountName: null, accountNumber: null, qr: null, sample: true },
      {
        method: 'gcash',
        accountName: 'Paolo R.',
        accountNumber: '0917 000 0001',
        qr: null,
        sample: true,
      },
      {
        method: 'maya',
        accountName: 'Paolo R.',
        accountNumber: '0917 000 0002',
        qr: null,
        sample: true,
      },
    ],
    codMaxTotal: peso(3000),
    delivery: {
      distance: [
        { fromKm: 0, toKm: 3, fee: peso(49), etaText: '30 to 45 min', minOrder: 0 },
        { fromKm: 3, toKm: 5, fee: peso(79), etaText: '45 to 60 min', minOrder: 0 },
      ],
      zones: [
        {
          id: 'ks-z-concepcion',
          name: 'Concepcion Uno and Dos',
          fee: peso(40),
          etaText: '30 to 45 min',
        },
        {
          id: 'ks-z-heights',
          name: 'Marikina Heights and Parang',
          fee: peso(60),
          etaText: '45 to 60 min',
        },
        { id: 'ks-z-marikina', name: 'Rest of Marikina', fee: peso(80), etaText: '45 to 75 min' },
      ],
      freeDeliveryFrom: null,
    },
    stampCard: {
      status: 'on',
      rule: {
        minOrderTotal: peso(250),
        stampsNeeded: 8,
        welcomeStamps: 1,
        maxEarned: 1,
        period: 'day',
      },
      reward: {
        kind: 'free_item',
        amount: null,
        itemId: 'ks-classic-smash',
        variantId: 'ks-classic-smash--single',
        title: 'Free Classic Smash (Single)',
        description: '8 stamps get you a free Classic Smash. 1 stamp per order of ₱250 or more.',
        image: 'demo:kanto-smash/items/classic-smash',
        quantityTotal: null,
        quantityLeft: null,
        onePerCustomer: false,
      },
    },
    membersCount: 128,
  },
  catalog: { categories, items, optionGroups },
};
