import type { ShopPack } from '../../schemas/shop-pack.js';
import { ALL_SECTIONS_ON, category, DAILY, days, group, makeItems, peso } from './build.js';

const P = 'kj';

const categories = [
  category(P, 'espresso', 'Espresso', 'coffee', 0),
  category(P, 'pinoy', 'Kapeng Pinoy', 'kapeng_pinoy', 1),
  category(P, 'non-coffee', 'Non-coffee', 'milk_tea', 2),
  category(P, 'food', 'Food', 'sandwich', 3),
  category(P, 'beans', 'Beans', 'beans', 4),
];

const optionGroups = [
  group(P, 'sugar', 'Sugar level', 1, 1, [
    { name: '0%' },
    { name: '25%' },
    { name: '50%' },
    { name: '100%', isDefault: true },
  ]),
  group(P, 'milk', 'Milk', 0, 1, [{ name: 'Oat milk', price: 40 }]),
  group(P, 'shot', 'Extra shot', 0, 2, [{ name: 'Extra shot', price: 40 }]),
  group(P, 'ice', 'Ice level', 0, 1, [
    { name: 'Regular ice', isDefault: true },
    { name: 'Less ice' },
  ]),
  group(P, 'toppings', 'Toppings', 0, 2, [
    { name: 'Sea salt cream', price: 30 },
    { name: 'Cinnamon dust' },
  ]),
  group(P, 'warm', 'Warm it up', 0, 1, [{ name: 'Warm it up' }]),
];

const SIZE_TEMP = [
  { name: 'Size', values: ['12 oz', '16 oz'] },
  { name: 'Temp', values: ['Hot', 'Iced'] },
] as const;
const bySize =
  (small: number, large: number) =>
  (values: readonly string[]): number =>
    values[0] === '16 oz' ? large : small;
const ESPRESSO_GROUPS = ['sugar', 'milk', 'shot', 'ice'];

const items = makeItems('kape-juan', P, [
  {
    key: 'americano',
    category: 'espresso',
    name: 'Americano',
    axes: SIZE_TEMP,
    price: bySize(110, 130),
    groups: ESPRESSO_GROUPS,
    pairs: ['banana-bread', 'ensaymada'],
    photos: ['americano'],
    isNew: true,
  },
  {
    key: 'cafe-latte',
    category: 'espresso',
    name: 'Café Latte',
    axes: SIZE_TEMP,
    price: bySize(140, 160),
    groups: ESPRESSO_GROUPS,
    pairs: ['ensaymada'],
    photos: ['cafe-latte'],
  },
  {
    key: 'spanish-latte',
    category: 'espresso',
    name: 'Spanish Latte',
    description: 'Espresso, milk and a little condensed milk.',
    axes: SIZE_TEMP,
    price: bySize(160, 180),
    groups: ESPRESSO_GROUPS,
    pairs: ['ensaymada', 'banana-bread'],
    photos: ['spanish-latte'],
    featured: true,
  },
  {
    key: 'caramel-macchiato',
    category: 'espresso',
    name: 'Caramel Macchiato',
    axes: SIZE_TEMP,
    price: bySize(170, 190),
    groups: ESPRESSO_GROUPS,
    photos: ['caramel-macchiato'],
  },
  {
    key: 'barako-brew',
    category: 'pinoy',
    name: 'Barako Brew',
    description: 'Batangas barako, strong and bold.',
    price: 95,
    groups: ['sugar'],
    pairs: ['longganisa-pandesal'],
    photos: ['barako-brew'],
    featured: true,
  },
  {
    key: 'iced-barako-muscovado',
    category: 'pinoy',
    name: 'Iced Barako with Muscovado',
    price: 130,
    groups: ['sugar', 'ice', 'toppings'],
    photos: ['iced-barako-muscovado'],
  },
  {
    key: 'tablea-mocha',
    category: 'pinoy',
    name: 'Tablea Mocha',
    price: 165,
    groups: ['sugar', 'milk', 'toppings'],
    photos: ['tablea-mocha'],
  },
  {
    key: 'sea-salt-barako-cream',
    category: 'pinoy',
    name: 'Sea Salt Barako Cream',
    price: 150,
    groups: ['sugar', 'ice'],
    photos: ['sea-salt-barako-cream'],
    isNew: true,
  },
  {
    key: 'matcha-latte',
    category: 'non-coffee',
    name: 'Matcha Latte',
    price: 170,
    groups: ['sugar', 'milk', 'ice'],
    photos: ['matcha-latte'],
  },
  {
    key: 'ube-latte',
    category: 'non-coffee',
    name: 'Ube Latte',
    price: 170,
    groups: ['sugar', 'milk', 'ice'],
    photos: ['ube-latte'],
    featured: true,
  },
  {
    key: 'tablea-hot-chocolate',
    category: 'non-coffee',
    name: 'Tablea Hot Chocolate',
    price: 140,
    groups: ['sugar', 'toppings'],
    photos: ['tablea-hot-chocolate'],
  },
  {
    key: 'calamansi-honey-fizz',
    category: 'non-coffee',
    name: 'Calamansi Honey Fizz',
    price: 120,
    groups: ['sugar'],
    photos: ['calamansi-honey-fizz'],
    isNew: true,
  },
  {
    key: 'ensaymada',
    category: 'food',
    name: 'Ensaymada',
    price: 85,
    groups: ['warm'],
    photos: ['ensaymada'],
  },
  {
    key: 'banana-bread',
    category: 'food',
    name: 'Banana Bread Slice',
    price: 75,
    groups: ['warm'],
    photos: ['banana-bread'],
    // The "Sold out today" item of this shop.
    availability: () => 'sold_out_today',
  },
  {
    key: 'chicken-pesto-sandwich',
    category: 'food',
    name: 'Chicken Pesto Sandwich',
    price: 185,
    groups: ['warm'],
    photos: ['chicken-pesto-sandwich'],
  },
  {
    key: 'longganisa-pandesal',
    category: 'food',
    name: 'Longganisa Pandesal',
    price: 145,
    groups: ['warm'],
    photos: ['longganisa-pandesal'],
    isNew: true,
  },
  {
    key: 'ube-cheesecake',
    category: 'food',
    name: 'Ube Cheesecake Slice',
    price: 160,
    photos: ['ube-cheesecake'],
    isNew: true,
  },
  {
    key: 'barako-beans-250g',
    category: 'beans',
    name: 'Barako Beans 250 g',
    axes: [{ name: 'Grind', values: ['Whole bean', 'Drip', 'Espresso'] }],
    price: 380,
    photos: ['barako-beans-250g'],
    isNew: true,
  },
]);

export const KAPE_JUAN_PACK: ShopPack = {
  storefront: {
    slug: 'kape-juan',
    info: {
      name: 'Kapé Juan Coffee',
      tagline: 'Barako-strong coffee, isang tasa at a time.',
      about:
        'A neighbourhood café on Maginhawa serving Batangas barako, tablea and Benguet arabica, with ensaymada and sandwiches from small bakers. Wi-Fi and outlets for study sessions.',
      kind: 'food',
      isDemo: true,
      logo: 'demo:kape-juan/brand/logo',
      contact: {
        phone: '0918 672 5504',
        messengerUsername: 'kapejuan.sample',
        facebookUrl: 'https://www.facebook.com/kapejuan.sample',
        googleReviewUrl: 'https://g.page/r/kapejuan-sample/review',
        address: '61 Maginhawa St., Brgy. Teachers Village East, Quezon City, Metro Manila 1101',
        showAddress: true,
        pin: { lat: 14.646, lng: 121.061 },
        pickupNote: 'Near the corner of Matatag St. Pickup shelf by the door.',
      },
    },
    look: {
      brandColor: '#6F4E37',
      surface: 'light',
      pageColor: '#EEE2CF',
      banners: [
        { ref: 'demo:kape-juan/banners/banner-1', alt: 'Barako coffee in warm morning light' },
        {
          ref: 'demo:kape-juan/banners/banner-2',
          alt: 'Spanish latte with ensaymada',
          title: 'Spanish latte + ensaymada',
          description: 'Our merienda pair, sweet and creamy.',
          link: { kind: 'item', targetId: 'kj-spanish-latte' },
        },
        {
          ref: 'demo:kape-juan/banners/banner-3',
          alt: 'Study corner with outlets and Wi-Fi',
          title: '10 stamps = a Suki Tumbler',
          description: 'Join free and get your first stamp today.',
          link: { kind: 'rewards', targetId: null },
        },
      ],
      bannerSeconds: 5,
      announcement: {
        text: 'Closed on 1 Nov for All Saints’ Day. Order ahead for pickup on 2 Nov.',
        tone: 'warning',
        endsAt: '2026-11-01T16:00:00.000Z',
      },
      sections: { ...ALL_SECTIONS_ON, membersCount: false },
    },
    hours: days(DAILY, '07:00', '22:00'),
    closures: [
      { date: '2026-11-01', reason: 'All Saints’ Day' },
      { date: '2026-12-25', reason: 'Christmas Day' },
    ],
    pause: { busyUntil: null, paused: false },
    orderTypes: ['walk_in', 'pickup', 'delivery'],
    prepMinutes: 15,
    takeOrdersWhileClosed: true,
    payments: [
      { method: 'cash', accountName: null, accountNumber: null, qr: null, sample: true },
      {
        method: 'gcash',
        accountName: 'Juan S.',
        accountNumber: '0918 000 0001',
        qr: null,
        sample: true,
      },
      {
        method: 'maya',
        accountName: 'Juan S.',
        accountNumber: '0918 000 0002',
        qr: null,
        sample: true,
      },
    ],
    codMaxTotal: null,
    delivery: {
      distance: [
        { fromKm: 0, toKm: 2, fee: peso(39), etaText: '20 to 30 min', minOrder: 0 },
        { fromKm: 2, toKm: 4, fee: peso(59), etaText: '30 to 45 min', minOrder: 0 },
      ],
      zones: [],
      freeDeliveryFrom: null,
    },
    stampCard: {
      status: 'on',
      rule: {
        minOrderTotal: peso(150),
        stampsNeeded: 10,
        welcomeStamps: 1,
        maxEarned: 1,
        period: 'day',
      },
      reward: {
        kind: 'custom',
        amount: null,
        itemId: null,
        variantId: null,
        title: 'Kapé Juan Suki Tumbler',
        description: 'Our limited Suki Tumbler. 10 stamps, 1 stamp per order of ₱150 or more.',
        image: 'demo:kape-juan/items/prize',
        // Mock value: the asset doc says "limited" without a number.
        quantityTotal: 50,
        quantityLeft: 50,
        onePerCustomer: true,
      },
    },
    membersCount: 215,
  },
  catalog: { categories, items, optionGroups },
};
