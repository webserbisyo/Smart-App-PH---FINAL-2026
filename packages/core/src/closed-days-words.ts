// The owner's Closed dates card (T129): one day or several in a row, and a warning when orders are
// already booked on them. Their own file so the storefront's pages never carry them.
export const closedDaysWords = {
  oneDay: 'One day',
  severalDays: 'Several days',
  howMany: 'How long',
  days: 'Days',
  pickDays: 'Pick the first and last day',
  range: (from: string, to: string) => `${from} to ${to}`,
  dayCount: (n: number) => (n === 1 ? '1 day' : `${n} days`),
  add: (n: number) => (n <= 1 ? 'Add closed date' : `Add ${n} closed days`),
  allTaken: 'These days are already closed.',
  tooMany: (max: number) => `Up to ${max} closed dates. Remove some first.`,
  removeRange: (range: string) => `Remove ${range}`,
  booked: (n: number) =>
    n === 1
      ? '1 order is already booked on these days. Move it or message the customer.'
      : `${n} orders are already booked on these days. Move them or message the customers.`,
  bookedRow: (n: number) => (n === 1 ? '1 order booked' : `${n} orders booked`),
  openOrders: 'See in Orders',
} as const;
