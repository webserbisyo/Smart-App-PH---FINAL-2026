// Where each Home card sits (T83), shared by the cards and the skeleton so nothing moves on load.
// Phone: one column in reading order, Needs you first. Tablet: two columns, pairs share a height.
// Desktop: sales on the left two thirds (total, chart, then the money split beside best sellers), what's
// live on the right (Needs you, the board). Members closes the shorter column. Both columns end on one line:
// the last card of each fills what's left.

export const HOME_GRID = 'grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:items-stretch';
// The columns only exist on desktop; below that their cards sit straight in the grid.
export const HOME_MAIN = 'contents lg:col-span-2 lg:flex lg:flex-col lg:gap-4';
export const HOME_PAIR = 'contents lg:grid lg:flex-1 lg:grid-cols-2 lg:gap-4';
export const HOME_SIDE = 'contents lg:flex lg:flex-col lg:gap-4';

export const HOME_SLOTS = {
  needs: 'order-1 md:col-span-2 lg:order-none',
  money: 'order-2 md:col-span-2 lg:order-none',
  sales: 'order-3 md:col-span-2 lg:order-none',
  board: 'order-4 lg:order-none',
  mix: 'order-5 lg:order-none',
  best: 'order-6 lg:order-none',
  members: 'order-7 lg:order-none lg:flex-1',
  coming: 'order-8 md:col-span-2 lg:order-none lg:col-span-3',
} as const;
