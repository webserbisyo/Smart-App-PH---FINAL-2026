import type { ShopPack } from '../../schemas/shop-pack.js';
import { ALL_SECTIONS_ON, category, days, group, makeItems, peso } from './build.js';

const P = 'ta';

const categories = [
  category(P, 'tops', 'Tops', 'tshirt', 0),
  category(P, 'bottoms', 'Bottoms', 'trousers', 1),
  category(P, 'dresses', 'Dresses', 'dress', 2),
  category(P, 'sets', 'Sets', 'set', 3),
  category(P, 'accessories', 'Accessories', 'accessories', 4),
];

const optionGroups = [
  group(P, 'gift', 'Gift wrap', 0, 2, [
    { name: 'Abaca gift wrap', price: 60 },
    { name: 'Handwritten card' },
  ]),
  group(P, 'hem', 'Hemming', 0, 1, [{ name: 'Hem to my length, write it in the note' }]),
];

const SIZES = { name: 'Size', values: ['S', 'M', 'L', 'XL'] } as const;

const items = makeItems('tala-apparel', P, [
  {
    key: 'tala-basic-tee',
    category: 'tops',
    name: 'Tala Basic Tee',
    description: 'Soft cotton everyday tee, sewn in Cebu.',
    axes: [
      SIZES,
      {
        name: 'Colour',
        values: [
          { name: 'Black', photo: 'tala-basic-tee-black' },
          { name: 'White', photo: 'tala-basic-tee-white' },
          { name: 'Sand', photo: 'tala-basic-tee-sand' },
        ],
      },
    ],
    price: 450,
    groups: ['gift'],
    pairs: ['wide-leg-trousers', 'woven-bucket-hat'],
    photos: ['tala-basic-tee-black', 'tala-basic-tee-white', 'tala-basic-tee-sand'],
    featured: true,
    // One sold-out combination (blueprint section 14).
    availability: (values) =>
      values[0] === 'M' && values[1] === 'Sand' ? 'sold_out' : 'available',
  },
  {
    key: 'linen-button-down',
    category: 'tops',
    name: 'Linen Button-down',
    axes: [
      SIZES,
      {
        name: 'Colour',
        values: [
          { name: 'Natural', photo: 'linen-button-down-natural' },
          { name: 'Indigo', photo: 'linen-button-down-indigo' },
        ],
      },
    ],
    price: 899,
    groups: ['gift'],
    pairs: ['wide-leg-trousers'],
    photos: ['linen-button-down-natural', 'linen-button-down-indigo'],
    featured: true,
  },
  {
    key: 'cropped-knit-top',
    category: 'tops',
    name: 'Cropped Knit Top',
    axes: [SIZES, { name: 'Colour', values: ['Cream', 'Terracotta'] }],
    price: 599,
    groups: ['gift'],
    photos: ['cropped-knit-top'],
  },
  {
    key: 'terno-sleeve-blouse',
    category: 'tops',
    name: 'Terno-sleeve Blouse',
    axes: [SIZES],
    price: 1199,
    groups: ['gift'],
    photos: ['terno-sleeve-blouse'],
    isNew: true,
  },
  {
    key: 'wide-leg-trousers',
    category: 'bottoms',
    name: 'Wide-leg Trousers',
    axes: [SIZES, { name: 'Colour', values: ['Black', 'Olive'] }],
    price: 1099,
    groups: ['hem', 'gift'],
    photos: ['wide-leg-trousers'],
  },
  {
    key: 'pleated-midi-skirt',
    category: 'bottoms',
    name: 'Pleated Midi Skirt',
    axes: [SIZES],
    price: 899,
    groups: ['gift'],
    photos: ['pleated-midi-skirt'],
  },
  {
    key: 'denim-shorts',
    category: 'bottoms',
    name: 'Denim Shorts',
    axes: [SIZES],
    price: 699,
    groups: ['gift'],
    photos: ['denim-shorts'],
  },
  {
    key: 'habi-print-midi-dress',
    category: 'dresses',
    name: 'Habi-print Midi Dress',
    axes: [SIZES],
    price: 1299,
    groups: ['gift'],
    photos: ['habi-print-midi-dress'],
    featured: true,
  },
  {
    key: 'weekend-set',
    category: 'sets',
    name: 'Weekend Set',
    description: 'Linen Button-down and Wide-leg Trousers.',
    axes: [SIZES],
    price: 1799,
    groups: ['hem', 'gift'],
    photos: ['weekend-set'],
    isNew: true,
  },
  {
    key: 'abaca-tote-bag',
    category: 'accessories',
    name: 'Abaca Tote Bag',
    price: 650,
    groups: ['gift'],
    photos: ['abaca-tote-bag'],
  },
  {
    key: 'capiz-shell-earrings',
    category: 'accessories',
    name: 'Capiz Shell Earrings',
    price: 350,
    groups: ['gift'],
    photos: ['capiz-shell-earrings'],
  },
  {
    key: 'woven-bucket-hat',
    category: 'accessories',
    name: 'Woven Bucket Hat',
    price: 450,
    groups: ['gift'],
    photos: ['woven-bucket-hat'],
  },
  {
    key: 'beaded-phone-strap',
    category: 'accessories',
    name: 'Beaded Phone Strap',
    price: 199,
    groups: ['gift'],
    photos: ['beaded-phone-strap'],
  },
  {
    key: 'pina-blend-scarf',
    category: 'accessories',
    name: 'Piña-blend Scarf',
    price: 799,
    groups: ['gift'],
    photos: ['pina-blend-scarf'],
    isNew: true,
  },
]);

export const TALA_APPAREL_PACK: ShopPack = {
  storefront: {
    slug: 'tala-apparel',
    info: {
      name: 'Tala Apparel',
      tagline: 'Everyday Filipino-made pieces na may kislap.',
      about:
        'Small-batch clothing and accessories sewn in Cebu, with woven and abaca details from local makers. Sizes S to XL; try-on at the studio by appointment.',
      kind: 'retail',
      isDemo: true,
      logo: 'demo:tala-apparel/brand/logo',
      contact: {
        phone: '0995 230 4403',
        messengerUsername: 'talaapparel.sample',
        facebookUrl: 'https://www.facebook.com/talaapparel.sample',
        googleReviewUrl: 'https://g.page/r/talaapparel-sample/review',
        address: '2/F, 88 Salinas Drive, Brgy. Lahug, Cebu City, Cebu 6000',
        showAddress: true,
        pin: { lat: 10.331, lng: 123.899 },
        pickupNote: 'Studio on the 2nd floor, two blocks from JY Square Mall.',
      },
    },
    look: {
      brandColor: '#2E3A87',
      banners: [
        { ref: 'demo:tala-apparel/banners/banner-1', alt: 'Linen pieces in warm window light' },
        {
          ref: 'demo:tala-apparel/banners/banner-2',
          alt: 'Abaca accessories with a spark of gold',
        },
        { ref: 'demo:tala-apparel/banners/banner-3', alt: 'Weekend Set in natural linen' },
      ],
      bannerSeconds: 6,
      announcement: null,
      sections: { ...ALL_SECTIONS_ON, membersCount: false },
    },
    // Closed on Mondays.
    hours: days([2, 3, 4, 5, 6, 0], '10:00', '19:00'),
    closures: [],
    pause: { busyUntil: null, paused: false },
    orderTypes: ['pickup', 'delivery'],
    prepMinutes: 30,
    takeOrdersWhileClosed: true,
    payments: [
      { method: 'cod', accountName: null, accountNumber: null, qr: null, sample: true },
      {
        method: 'gcash',
        accountName: 'Bea V.',
        accountNumber: '0995 000 0001',
        qr: null,
        sample: true,
      },
      {
        method: 'bank',
        accountName: 'Tala Apparel (Sample)',
        accountNumber: 'BPI 0000 0000 01',
        qr: null,
        sample: true,
      },
      {
        method: 'qr_ph',
        accountName: 'Tala Apparel (Sample)',
        accountNumber: null,
        qr: null,
        sample: true,
      },
    ],
    codMaxTotal: null,
    delivery: {
      distance: [],
      zones: [
        { id: 'ta-z-cebu', name: 'Cebu City', fee: peso(80), etaText: 'Same day' },
        { id: 'ta-z-mandaue', name: 'Mandaue', fee: peso(120), etaText: 'Same day' },
        {
          id: 'ta-z-lapu-lapu',
          name: 'Lapu-Lapu and Talisay',
          fee: peso(150),
          etaText: 'Next day',
        },
      ],
      freeDeliveryFrom: null,
    },
    stampCard: {
      status: 'on',
      rule: {
        minOrderTotal: peso(1000),
        stampsNeeded: 5,
        welcomeStamps: 1,
        maxEarned: 1,
        period: 'day',
      },
      reward: {
        kind: 'custom',
        amount: null,
        itemId: null,
        variantId: null,
        title: 'Kislap Limited Edition Tee',
        description:
          'A numbered tee, only 100 pieces. 5 stamps, 1 stamp per order of ₱1,000 or more.',
        image: 'demo:tala-apparel/items/prize',
        quantityTotal: 100,
        // At 20% or less the card shows "18 left".
        quantityLeft: 18,
        onePerCustomer: true,
      },
    },
    membersCount: 87,
  },
  catalog: { categories, items, optionGroups },
};
