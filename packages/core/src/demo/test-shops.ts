// Two test shops that exist only in mock and test runs, never in a production build (the data layer gates them).
// test-blank: nothing set up. test-stress: long text, big amounts, many items.
import type { Item } from '../schemas/catalog.js';
import type { ShopPack } from '../schemas/shop-pack.js';
import type { Storefront } from '../schemas/storefront.js';
import {
  ALL_SECTIONS_ON,
  category,
  DAILY,
  days,
  group,
  makeItems,
  peso,
  templates,
  type ItemSpec,
} from './packs/build.js';

export const TEST_SHOP_SLUGS = ['test-blank', 'test-stress'] as const;
export type TestShopSlug = (typeof TEST_SHOP_SLUGS)[number];

export function isTestShopSlug(slug: string): slug is TestShopSlug {
  return TEST_SHOP_SLUGS.some((s) => s === slug);
}

const BLANK_STOREFRONT: Storefront = {
  slug: 'test-blank',
  info: {
    name: 'Test Blank Shop',
    tagline: null,
    about: null,
    kind: 'food',
    isDemo: false,
    logo: null,
    contact: {
      phone: null,
      messengerUsername: null,
      facebookUrl: null,
      googleReviewUrl: null,
      address: null,
      showAddress: false,
      pin: null,
      pickupNote: null,
    },
  },
  look: {
    brandColor: '#2456D3',
    surface: 'light',
    pageColor: null,
    cardColor: null,
    logoShape: 'circle',
    fontPair: 'malinaw',
    banners: [],
    bannerSeconds: 5,
    announcement: null,
    sections: ALL_SECTIONS_ON,
  },
  hours: days(DAILY, '09:00', '21:00'),
  closures: [],
  pause: { busyUntil: null, paused: false },
  orderTypes: ['walk_in'],
  prepMinutes: 20,
  takeOrdersWhileClosed: true,
  daysAhead: 7,
  slotMinutes: 30,
  ordersPerSlot: null,
  payments: [
    {
      id: 'ts0-pay-cash',
      method: 'cash',
      bank: null,
      accountName: null,
      accountNumber: null,
      qr: null,
      sample: false,
    },
  ],
  codMaxTotal: null,
  delivery: { distance: [], zones: [], freeDeliveryFrom: null },
  stampCard: {
    status: 'off',
    rule: { minOrderTotal: 0, stampsNeeded: 10, welcomeStamps: 1, maxEarned: 1, period: 'day' },
    reward: {
      kind: 'discount',
      amount: peso(100),
      itemId: null,
      variantId: null,
      title: '₱100 off',
      description: null,
      image: null,
      quantityTotal: null,
      quantityLeft: null,
      onePerCustomer: false,
    },
  },
  membersCount: 0,
};

export const TEST_BLANK_PACK: ShopPack = {
  storefront: BLANK_STOREFRONT,
  catalog: {
    categories: [],
    items: [],
    optionGroups: [],
    variantTemplates: templates('tb', 'food'),
  },
};

const S = 'ts';
const STRESS_CATEGORIES = [
  category(S, 'tops', 'Everyday tops and shirts for any season', 'tshirt', 0),
  category(S, 'bottoms', 'Bottoms', 'trousers', 1),
  category(S, 'dresses', 'Dresses', 'dress', 2),
  category(S, 'sets', 'Sets', 'set', 3),
  category(S, 'bags', 'Bags', 'accessories', 4),
  category(S, 'jewellery', 'Jewellery', 'earrings', 5),
  category(S, 'hats', 'Hats', 'hat', 6),
  // Every item here is sold out.
  category(S, 'sold-out', 'Sold out collection', 'other', 7),
];

const STRESS_GROUP = group(S, 'ten', 'Ten finishing touches to choose from', 0, 10, [
  { name: 'Embroidered initials on the left sleeve', price: 150 },
  { name: 'Gift wrap', price: 60 },
  { name: 'Handwritten card' },
  { name: 'Extra button set', price: 25 },
  { name: 'Shorten sleeves', price: 120 },
  { name: 'Lengthen hem', price: 120 },
  { name: 'Add pocket', price: 200 },
  { name: 'Iron-on patch', price: 80 },
  { name: 'Express pressing', price: 50 },
  { name: 'Reusable garment bag', price: 180 },
]);

const LONG_NAMES = [
  'Hand-loomed Abaca and Piña Blend Wrap Cardigan with Pockets',
  'Extra Long Linen Button-down Shirt with Mother-of-Pearl Buttons',
  'Relaxed Fit Wide-leg Trousers in Organic Cotton Twill (Ankle)',
  'Reversible Woven Bucket Hat with Hand-stitched Inner Lining',
];

function stressSpecs(): ItemSpec[] {
  const specs: ItemSpec[] = [];
  const cats = STRESS_CATEGORIES.map((c) => c.id.replace(`${S}-c-`, ''));
  for (let i = 0; i < 60; i += 1) {
    const cat = cats[i % cats.length] ?? 'tops';
    const longName = LONG_NAMES[i % LONG_NAMES.length] ?? 'Item';
    const name = i % 3 === 0 ? `${longName} No. ${i + 1}` : `Test item ${i + 1}`;
    specs.push({
      key: `item-${i + 1}`,
      category: cat,
      name,
      description: i % 5 === 0 ? `${longName}. `.repeat(4).trim().slice(0, 290) : undefined,
      price: 99 + i * 37,
      ...(cat === 'sold-out' ? { availability: () => 'sold_out' as const } : {}),
    });
  }
  // A big amount that must still fit: ₱12,345.50.
  specs[1] = {
    key: 'item-2',
    category: 'tops',
    name: 'Made-to-measure Barong Tagalog',
    price: 12345.5,
  };
  // 30 variants: 6 sizes × 5 colours.
  specs[2] = {
    key: 'item-3',
    category: 'tops',
    name: 'Everyday Tee in Thirty Combinations of Size and Colour',
    axes: [
      { name: 'Size', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { name: 'Colour', values: ['Black', 'White', 'Sand', 'Olive', 'Indigo'] },
    ],
    price: 450,
    groups: ['ten'],
  };
  // Exactly 30 combinations (5 × 3 × 2), base ₱12,345.50, one choice with price changes,
  // one linked and one custom choice, one special price and one sold-out combination (T46).
  specs.push({
    key: 'item-combos',
    category: 'tops',
    name: 'Made-to-measure Barong in Thirty Versions',
    price: 12345.5,
    axes: [
      {
        name: 'Portion',
        values: [
          'Small',
          { name: 'Medium', price: 100 },
          { name: 'Large', price: 200 },
          { name: 'XL', price: 300 },
          { name: 'XXL', price: 400 },
        ],
      },
      { name: 'Patty', template: 'patty', values: ['Single', 'Double', 'Triple'] },
      { name: 'Packaging', values: ['Standard', 'Gift Box'] },
    ],
    special: (values) =>
      values[0] === 'XXL' && values[1] === 'Triple' && values[2] === 'Gift Box' ? 20000 : null,
    availability: (values) =>
      values[0] === 'Small' && values[1] === 'Single' && values[2] === 'Standard'
        ? 'sold_out'
        : 'available',
    noticeDays: 30,
  });
  return specs;
}

const stressLongName = 'A'.repeat(30);
const stressLongOptions = Array.from({ length: 10 }, (_, i) => `Opt ${i + 1} `.padEnd(30, 'x'));
const stressTemplates = templates(S, 'food', {
  extra: [
    {
      key: 'stress-30',
      name: stressLongName,
      options: stressLongOptions,
    },
  ],
});

const stressItems: Item[] = makeItems(null, S, stressSpecs(), false);

const STRESS_STOREFRONT: Storefront = {
  ...BLANK_STOREFRONT,
  slug: 'test-stress',
  info: {
    ...BLANK_STOREFRONT.info,
    // 60 characters.
    name: 'The Very Long Named Test Stress Shops of Barangay San Isidro',
    tagline: 'A tagline that is long enough to wrap onto a second line on phones',
    about: 'Long text everywhere. '.repeat(25).trim().slice(0, 590),
    kind: 'retail',
    contact: {
      ...BLANK_STOREFRONT.info.contact,
      phone: '0917 000 9999',
      address:
        'Unit 1234, Tower 5, A Very Long Building Name, 1234 Some Long Street, Brgy. San Isidro, Somewhere City 1234',
      showAddress: true,
      pin: { lat: 14.6, lng: 121.0 },
    },
  },
  look: {
    ...BLANK_STOREFRONT.look,
    brandColor: '#FFF3A3',
    banners: [
      { ref: 'test:test-stress/banners/banner-1', alt: 'Test banner 1 (no photo)' },
      { ref: 'test:test-stress/banners/banner-2', alt: 'Test banner 2 (no photo)' },
      { ref: 'test:test-stress/banners/banner-3', alt: 'Test banner 3 (no photo)' },
    ],
    announcement: {
      // 200 characters.
      text: 'This is a long announcement to test wrapping. '.repeat(5).slice(0, 200),
      tone: 'warning',
      endsAt: null,
    },
  },
  orderTypes: ['walk_in', 'pickup', 'delivery'],
  prepMinutes: 20,
  takeOrdersWhileClosed: true,
  daysAhead: 60,
  slotMinutes: 30,
  ordersPerSlot: 1,
  payments: [
    {
      id: 'ts-pay-cash',
      method: 'cash',
      bank: null,
      accountName: null,
      accountNumber: null,
      qr: null,
      sample: true,
    },
    {
      id: 'ts-pay-cod',
      method: 'cod',
      bank: null,
      accountName: null,
      accountNumber: null,
      qr: null,
      sample: true,
    },
    {
      id: 'ts-pay-gcash',
      method: 'gcash',
      bank: null,
      accountName: 'Test Account With A Long Name',
      accountNumber: '0917 000 9999',
      qr: null,
      sample: true,
    },
    {
      id: 'ts-pay-bank',
      method: 'bank',
      bank: 'bdo',
      accountName: 'Test Bank Account',
      accountNumber: '0000 0000 0000',
      qr: null,
      sample: true,
    },
  ],
  codMaxTotal: peso(3000),
  delivery: {
    distance: [{ fromKm: 0, toKm: 5, fee: peso(99), etaText: '1 to 2 hours', minOrder: peso(500) }],
    zones: [
      {
        id: 'ts-z-metro',
        name: 'Metro Manila (a long zone name for wrapping)',
        fee: peso(150),
        etaText: 'Next day',
      },
    ],
    freeDeliveryFrom: peso(5000),
  },
  stampCard: {
    status: 'paused',
    rule: {
      minOrderTotal: peso(500),
      stampsNeeded: 20,
      welcomeStamps: 1,
      maxEarned: 1,
      period: 'week',
    },
    reward: {
      kind: 'discount',
      amount: peso(1234.5),
      itemId: null,
      variantId: null,
      title: '₱1,234.50 off your next big order',
      description: null,
      image: null,
      quantityTotal: null,
      quantityLeft: null,
      onePerCustomer: false,
    },
  },
  membersCount: 12345,
};

export const TEST_STRESS_PACK: ShopPack = {
  storefront: STRESS_STOREFRONT,
  catalog: {
    categories: STRESS_CATEGORIES,
    items: stressItems,
    optionGroups: [STRESS_GROUP],
    variantTemplates: stressTemplates,
  },
};

export const TEST_SHOP_PACKS: Readonly<Record<TestShopSlug, ShopPack>> = {
  'test-blank': TEST_BLANK_PACK,
  'test-stress': TEST_STRESS_PACK,
};
