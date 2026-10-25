import type { ShopPack } from '../../schemas/shop-pack.js';
import { ALL_SECTIONS_ON, category, DAILY, days, group, makeItems, peso } from './build.js';

const P = 'lr';

const categories = [
  category(P, 'bread', 'Pandesal and Bread', 'bread', 0),
  category(P, 'pastries', 'Ensaymada and Pastries', 'pastry', 1),
  category(P, 'cakes', 'Cakes', 'cake', 2),
  category(P, 'pasalubong', 'Pasalubong', 'pasalubong', 3),
  category(P, 'drinks', 'Drinks', 'coffee', 4),
];

const optionGroups = [
  group(P, 'cake', 'Cake extras', 0, 3, [
    { name: '"Happy Birthday" topper', price: 30 },
    { name: 'Candles', price: 20 },
    { name: 'Write a short greeting in the note' },
  ]),
  group(P, 'wrap', 'Pasalubong wrap', 0, 1, [{ name: 'Banana-leaf and twine wrap', price: 20 }]),
];

const CAKE_SIZE = { name: 'Size', values: ['6"', '8"'] } as const;

const items = makeItems('lola-remy', P, [
  {
    key: 'classic-pandesal',
    category: 'bread',
    name: 'Classic Pandesal',
    description: 'Baked twice a day, at 5 AM and 3 PM.',
    axes: [{ name: 'Pack', values: ['1 pc', '10 pcs', '20 pcs'] }],
    price: (values) => ({ '1 pc': 5, '10 pcs': 50, '20 pcs': 95 })[values[0] ?? ''] ?? 0,
    pairs: ['brewed-coffee', 'tsokolate'],
    photos: ['classic-pandesal'],
    featured: true,
  },
  {
    key: 'ube-cheese-pandesal',
    category: 'bread',
    name: 'Ube Cheese Pandesal',
    axes: [{ name: 'Pack', values: ['1 pc', '10 pcs'] }],
    price: (values) => (values[0] === '10 pcs' ? 140 : 15),
    pairs: ['brewed-coffee'],
    photos: ['ube-cheese-pandesal'],
    featured: true,
  },
  {
    key: 'spanish-bread',
    category: 'bread',
    name: 'Spanish Bread',
    price: 10,
    photos: ['spanish-bread'],
  },
  {
    key: 'pan-de-coco',
    category: 'bread',
    name: 'Pan de Coco',
    price: 12,
    photos: ['pan-de-coco'],
  },
  { key: 'monay', category: 'bread', name: 'Monay', price: 10, photos: ['monay'] },
  {
    key: 'kababayan',
    category: 'bread',
    name: 'Kababayan',
    price: 12,
    photos: ['kababayan'],
    isNew: true,
  },
  {
    key: 'classic-ensaymada',
    category: 'pastries',
    name: 'Classic Ensaymada',
    price: 35,
    pairs: ['tsokolate'],
    photos: ['classic-ensaymada'],
  },
  {
    key: 'ube-ensaymada',
    category: 'pastries',
    name: 'Ube Ensaymada',
    price: 45,
    photos: ['ube-ensaymada'],
    // The "Sold out today" item of this shop.
    availability: () => 'sold_out_today',
  },
  {
    key: 'cheese-roll',
    category: 'pastries',
    name: 'Cheese Roll',
    price: 25,
    photos: ['cheese-roll'],
  },
  {
    key: 'hopia-ube',
    category: 'pastries',
    name: 'Hopia Ube (6)',
    price: 90,
    photos: ['hopia-ube'],
  },
  {
    key: 'chocolate-moist-cake',
    category: 'cakes',
    name: 'Chocolate Moist Cake',
    axes: [CAKE_SIZE],
    price: (values) => (values[0] === '8"' ? 650 : 450),
    groups: ['cake'],
    photos: ['chocolate-moist-cake'],
  },
  {
    key: 'ube-macapuno-cake',
    category: 'cakes',
    name: 'Ube Macapuno Cake',
    axes: [CAKE_SIZE],
    price: (values) => (values[0] === '8"' ? 750 : 520),
    groups: ['cake'],
    photos: ['ube-macapuno-cake'],
    featured: true,
  },
  { key: 'mamon', category: 'cakes', name: 'Mamon (box of 6)', price: 180, photos: ['mamon'] },
  {
    key: 'ensaymada-malolos-box',
    category: 'pasalubong',
    name: 'Ensaymada Malolos (box of 6)',
    price: 360,
    groups: ['wrap'],
    photos: ['ensaymada-malolos-box'],
    featured: true,
  },
  {
    key: 'inipit',
    category: 'pasalubong',
    name: 'Inipit (box of 10)',
    price: 180,
    groups: ['wrap'],
    photos: ['inipit'],
  },
  {
    key: 'pasalubong-box',
    category: 'pasalubong',
    name: "Lola's Pasalubong Box",
    description: 'Ensaymada, inipit, hopia and mamon.',
    price: 499,
    groups: ['wrap'],
    photos: ['pasalubong-box'],
    isNew: true,
  },
  {
    key: 'brewed-coffee',
    category: 'drinks',
    name: 'Brewed Coffee',
    price: 40,
    photos: ['brewed-coffee'],
  },
  {
    key: 'sagot-gulaman',
    category: 'drinks',
    name: "Sago't Gulaman",
    price: 35,
    photos: ['sagot-gulaman'],
  },
  {
    key: 'tsokolate',
    category: 'drinks',
    name: 'Tsokolate',
    price: 45,
    photos: ['tsokolate'],
    isNew: true,
  },
]);

export const LOLA_REMY_PACK: ShopPack = {
  storefront: {
    slug: 'lola-remy',
    info: {
      name: 'Panaderya ni Lola Remy',
      tagline: 'Mainit na pandesal since 1987.',
      about:
        "A family bakeshop in Malolos baking pandesal twice a day (5 AM and 3 PM), Ensaymada Malolos and Bulacan pasalubong from Lola Remy's recipes, now run by her apo.",
      kind: 'food',
      isDemo: true,
      logo: 'demo:lola-remy/brand/logo',
      contact: {
        phone: '0906 318 6605',
        messengerUsername: 'lolaremy.sample',
        facebookUrl: 'https://www.facebook.com/lolaremy.sample',
        googleReviewUrl: 'https://g.page/r/lolaremy-sample/review',
        address: '214 Paseo del Congreso, City of Malolos, Bulacan 3000',
        showAddress: true,
        pin: { lat: 14.847, lng: 120.812 },
        pickupNote: "5 minutes' walk from Barasoain Church.",
      },
    },
    look: {
      brandColor: '#C27C2C',
      banners: [
        { ref: 'demo:lola-remy/banners/banner-1', alt: 'Hot pandesal on a bilao at 5 AM' },
        { ref: 'demo:lola-remy/banners/banner-2', alt: 'Ensaymada Malolos in a pasalubong box' },
        { ref: 'demo:lola-remy/banners/banner-3', alt: 'Ube macapuno cake' },
      ],
      bannerSeconds: 5,
      announcement: {
        text: 'Fresh pandesal at 5 AM and 3 PM. Order the night before and pick up hot.',
        tone: 'info',
        endsAt: null,
      },
      sections: { ...ALL_SECTIONS_ON, membersCount: false },
    },
    // Opens 5 AM: the closed-shop scheduling demo.
    hours: days(DAILY, '05:00', '20:00'),
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
        accountName: 'Carla B.',
        accountNumber: '0906 000 0001',
        qr: null,
        sample: true,
      },
      {
        method: 'qr_ph',
        accountName: 'Panaderya ni Lola Remy (Sample)',
        accountNumber: null,
        qr: null,
        sample: true,
      },
    ],
    codMaxTotal: null,
    delivery: {
      distance: [{ fromKm: 0, toKm: 3, fee: peso(40), etaText: '30 to 45 min', minOrder: 0 }],
      zones: [
        { id: 'lr-z-malolos', name: 'Malolos proper', fee: peso(50), etaText: '45 to 60 min' },
        { id: 'lr-z-nearby', name: 'Nearby barangays', fee: peso(80), etaText: '1 to 1.5 hours' },
      ],
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
        kind: 'free_item',
        amount: null,
        itemId: 'lr-ube-cheese-pandesal',
        variantId: 'lr-ube-cheese-pandesal--10-pcs',
        title: 'Free Ube Cheese Pandesal (10 pcs)',
        description: '10 stamps get you a free pack of 10. 1 stamp per order of ₱150 or more.',
        image: 'demo:lola-remy/items/ube-cheese-pandesal',
        quantityTotal: null,
        quantityLeft: null,
        onePerCustomer: false,
      },
    },
    membersCount: 503,
  },
  catalog: { categories, items, optionGroups },
};
