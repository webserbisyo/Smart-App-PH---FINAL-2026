// Each demo shop's usual week (decision T71): how many orders a day, which days and hours are busy, and how
// customers order and pay. The mock history (packages/data) turns this into 60 days of light past orders.
import { z } from 'zod';
import { OrderTypeEnum, PaymentMethodEnum } from '../schemas/enums.js';

const WeightSchema = z.number().min(0);

export const ShopRhythmSchema = z.object({
  // Orders on a usual day, low and high.
  perDay: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  // Sunday first; 1 is a usual day.
  weekdays: z.array(WeightSchema).length(7),
  // Extra weight for busy hours ([hour, weight]); other open hours weigh 1.
  peaks: z.array(z.tuple([z.number().int().min(0).max(23), WeightSchema])),
  types: z.array(z.tuple([OrderTypeEnum, WeightSchema])).min(1),
  methods: z.array(z.tuple([PaymentMethodEnum, WeightSchema])).min(1),
  // Lines in one order, and the most of one line.
  lines: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
  maxQty: z.number().int().min(1),
  // Paydays (15th and the last day of the month) count this many times a usual day.
  payday: z.number().min(0),
});
export type ShopRhythm = z.infer<typeof ShopRhythmSchema>;

const DEFAULT_RHYTHM: ShopRhythm = {
  perDay: [20, 35],
  weekdays: [1, 1, 1, 1, 1, 1.1, 1.1],
  peaks: [
    [12, 2],
    [18, 2],
  ],
  types: [
    ['walk_in', 2],
    ['pickup', 2],
    ['delivery', 1],
  ],
  methods: [
    ['cash', 3],
    ['gcash', 2],
  ],
  lines: [1, 3],
  maxQty: 2,
  payday: 1,
};

const RHYTHMS: Readonly<Record<string, ShopRhythm>> = {
  // Lunch and dinner, busy Friday to Sunday, mostly walk-in.
  'kanto-smash': {
    perDay: [35, 55],
    weekdays: [1.3, 0.85, 0.85, 0.9, 0.95, 1.25, 1.4],
    peaks: [
      [12, 4],
      [13, 3],
      [18, 3.5],
      [19, 4],
      [20, 3],
    ],
    types: [
      ['walk_in', 45],
      ['pickup', 30],
      ['delivery', 25],
    ],
    methods: [
      ['cash', 4],
      ['gcash', 4],
      ['maya', 1],
      ['bank', 1],
      ['cod', 1],
    ],
    lines: [1, 3],
    maxQty: 2,
    payday: 1.1,
  },
  // Morning coffee and a 3 PM break, quieter on weekends.
  'kape-juan': {
    perDay: [70, 90],
    weekdays: [0.7, 1.1, 1.1, 1.1, 1.1, 1.05, 0.8],
    peaks: [
      [7, 4],
      [8, 4.5],
      [9, 2.5],
      [15, 2.5],
      [16, 2],
    ],
    types: [
      ['pickup', 55],
      ['walk_in', 35],
      ['delivery', 10],
    ],
    methods: [
      ['gcash', 6],
      ['cash', 3],
      ['maya', 1],
    ],
    lines: [1, 2],
    maxQty: 2,
    payday: 1,
  },
  // Pandesal at dawn and merienda, cake bookings make Saturday big.
  'lola-remy': {
    perDay: [40, 60],
    weekdays: [1.1, 0.9, 0.9, 0.9, 0.95, 1, 1.35],
    peaks: [
      [6, 4],
      [7, 3.5],
      [8, 2],
      [16, 2.5],
      [17, 2],
    ],
    types: [
      ['walk_in', 60],
      ['pickup', 30],
      ['delivery', 10],
    ],
    methods: [
      ['cash', 6],
      ['gcash', 3],
      ['maya', 1],
    ],
    lines: [1, 3],
    maxQty: 3,
    payday: 1,
  },
  // Refills before work and after, Monday and Saturday restock.
  aqualinis: {
    perDay: [35, 45],
    weekdays: [0.7, 1.3, 1, 1, 1, 1, 1.25],
    peaks: [
      [7, 3.5],
      [8, 3],
      [17, 3],
      [18, 3.5],
      [19, 2],
    ],
    types: [
      ['delivery', 60],
      ['pickup', 25],
      ['walk_in', 15],
    ],
    methods: [
      ['cod', 5],
      ['cash', 3],
      ['gcash', 2],
    ],
    lines: [1, 2],
    maxQty: 4,
    payday: 1.1,
  },
  // Online shoppers late at night, big on paydays.
  'tala-apparel': {
    perDay: [5, 12],
    weekdays: [1.2, 0.9, 0.9, 0.95, 1, 1.1, 1.2],
    peaks: [
      [20, 4],
      [21, 5],
      [22, 4],
      [23, 3],
      [12, 1.5],
    ],
    types: [
      ['delivery', 75],
      ['pickup', 25],
    ],
    methods: [
      ['gcash', 5],
      ['bank', 3],
      ['maya', 1],
      ['cod', 1],
    ],
    lines: [1, 2],
    maxQty: 1,
    payday: 1.8,
  },
};

/** The demo rhythm of a shop; any other shop gets a plain one. */
export function shopRhythm(slug: string): ShopRhythm {
  return ShopRhythmSchema.parse(RHYTHMS[slug] ?? DEFAULT_RHYTHM);
}
