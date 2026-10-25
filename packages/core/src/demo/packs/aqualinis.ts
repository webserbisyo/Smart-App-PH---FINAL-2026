import type { ShopPack } from '../../schemas/shop-pack.js';
import { ALL_SECTIONS_ON, category, days, group, makeItems, peso } from './build.js';

const P = 'aq';

const categories = [
  category(P, 'refills', 'Refills', 'water_gallon', 0),
  category(P, 'containers', 'New Containers', 'container', 1),
  category(P, 'bottled', 'Bottled Water', 'water', 2),
  category(P, 'ice', 'Ice', 'ice', 3),
];

const optionGroups = [
  group(P, 'care', 'Refill care', 0, 2, [
    { name: 'Sanitise my container', isDefault: true },
    { name: 'New cap seal', isDefault: true },
  ]),
];

const WATER_PRICE: Record<string, number> = { Purified: 30, Mineral: 40, Alkaline: 45 };

const items = makeItems('aqualinis', P, [
  {
    key: 'five-gallon-refill',
    category: 'refills',
    name: '5-Gallon Refill',
    description: '8-stage filtration, tested monthly. Bring your container or we pick it up.',
    axes: [
      {
        name: 'Water',
        values: [
          { name: 'Purified', photo: 'refill-purified' },
          { name: 'Alkaline', photo: 'refill-alkaline' },
          { name: 'Mineral', photo: 'refill-mineral' },
        ],
      },
      { name: 'Container', values: ['Round', { name: 'Slim with faucet', photo: 'refill-slim' }] },
    ],
    price: (values) => WATER_PRICE[values[0] ?? ''] ?? 0,
    groups: ['care'],
    pairs: ['family-week-pack', 'tube-ice'],
    photos: ['refill-purified', 'refill-alkaline', 'refill-mineral', 'refill-slim'],
    featured: true,
  },
  {
    key: 'family-week-pack',
    category: 'refills',
    name: 'Family Week Pack',
    description: '4 purified round refills for the week.',
    price: 110,
    groups: ['care'],
    photos: ['family-week-pack'],
    featured: true,
    isNew: true,
  },
  {
    key: 'round-container',
    category: 'containers',
    name: 'Round 5-Gallon with Cap',
    price: 250,
    photos: ['round-container'],
  },
  {
    key: 'slim-container',
    category: 'containers',
    name: 'Slim 5-Gallon with Faucet',
    price: 280,
    photos: ['slim-container'],
  },
  {
    key: 'replacement-faucet',
    category: 'containers',
    name: 'Replacement Faucet',
    price: 60,
    photos: ['replacement-faucet'],
  },
  {
    key: 'manual-water-pump',
    category: 'containers',
    name: 'Manual Water Pump',
    price: 180,
    photos: ['manual-water-pump'],
    isNew: true,
  },
  {
    key: 'bottled-water-case',
    category: 'bottled',
    name: 'Bottled Water Case',
    axes: [{ name: 'Size', values: ['350 mL × 24', '500 mL × 24', '1 L × 12'] }],
    price: (values) =>
      ({ '350 mL × 24': 160, '500 mL × 24': 180, '1 L × 12': 180 })[values[0] ?? ''] ?? 0,
    photos: ['bottled-water-case'],
  },
  {
    key: 'tube-ice',
    category: 'ice',
    name: 'Tube Ice',
    axes: [{ name: 'Weight', values: ['2 kg', '5 kg'] }],
    price: (values) => (values[0] === '5 kg' ? 110 : 50),
    photos: ['tube-ice'],
  },
]);

export const AQUALINIS_PACK: ShopPack = {
  storefront: {
    slug: 'aqualinis',
    info: {
      name: 'AquaLinis Water Refilling Station',
      tagline: 'Malinis, malamig, hatid sa pinto.',
      about:
        'Purified, alkaline and mineral water refills with 8-stage filtration, tested monthly. Free delivery within the Pamplona barangays for 2 gallons or more.',
      kind: 'retail',
      isDemo: true,
      logo: 'demo:aqualinis/brand/logo',
      contact: {
        phone: '0928 455 3302',
        messengerUsername: 'aqualinis.sample',
        facebookUrl: 'https://www.facebook.com/aqualinis.sample',
        googleReviewUrl: 'https://g.page/r/aqualinis-sample/review',
        address:
          'Unit 3, 145 Alabang–Zapote Road, Brgy. Pamplona Dos, Las Piñas City, Metro Manila 1740',
        showAddress: true,
        pin: { lat: 14.451, lng: 120.984 },
        pickupNote: '5 minutes from Las Piñas City Hall. Bring your container.',
      },
    },
    look: {
      brandColor: '#0E7AC4',
      banners: [
        {
          ref: 'demo:aqualinis/banners/banner-1',
          alt: 'Fresh 5-gallon refills ready for delivery',
        },
        { ref: 'demo:aqualinis/banners/banner-2', alt: 'Water droplets on a clean container' },
        { ref: 'demo:aqualinis/banners/banner-3', alt: 'Family Week Pack of 4 refills' },
      ],
      bannerSeconds: 5,
      announcement: {
        text: 'Free delivery in Pamplona Uno, Dos and Tres for 2 gallons or more.',
        tone: 'success',
        endsAt: null,
      },
      sections: { ...ALL_SECTIONS_ON, membersCount: false },
    },
    hours: [...days([1, 2, 3, 4, 5, 6], '06:00', '20:00'), ...days([0], '07:00', '17:00')],
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
        accountName: 'Ramon D.',
        accountNumber: '0928 000 0001',
        qr: null,
        sample: true,
      },
    ],
    codMaxTotal: null,
    delivery: {
      distance: [],
      zones: [
        {
          id: 'aq-z-pamplona',
          name: 'Pamplona Uno, Dos and Tres',
          fee: 0,
          etaText: '30 to 60 min',
        },
        { id: 'aq-z-talon', name: 'Talon and Almanza', fee: peso(20), etaText: '45 to 75 min' },
        { id: 'aq-z-las-pinas', name: 'Rest of Las Piñas', fee: peso(40), etaText: '1 to 2 hours' },
      ],
      freeDeliveryFrom: null,
    },
    stampCard: {
      status: 'on',
      rule: { minOrderTotal: 0, stampsNeeded: 10, welcomeStamps: 1, maxEarned: 1, period: 'day' },
      reward: {
        kind: 'discount',
        amount: peso(100),
        itemId: null,
        variantId: null,
        title: '₱100 off',
        description: '10 stamps get you ₱100 off your order. 1 stamp per order.',
        image: null,
        quantityTotal: null,
        quantityLeft: null,
        onePerCustomer: false,
      },
    },
    membersCount: 342,
  },
  catalog: { categories, items, optionGroups },
};
