// Words for the ordering flow fixes (T127): sold out, editing a basket line, the sold-out jam and the shared
// slot picker's part-of-day tabs. Their own file (not words.ts), because one module is shared by every
// storefront page: only the lazy basket, item sheet, checkout and pickers load this one.
export const orderFlowWords = {
  // Sold out at the time the order is for: the Add button says so and stays off.
  soldOut: 'Sold out',
  soldOutBack: (when: string) => `Sold out today · back ${when}`,
  // Edit in the basket.
  edit: 'Edit',
  editItem: (name: string) => `Edit ${name}`,
  updateWithPrice: (price: string) => `Update · ${price}`,
  updating: 'Saving...',
  updated: 'Updated',
  editScope: 'Change',
  editAll: (count: number) => `All ${count}`,
  editOne: 'Just 1',
  editOneHint: (rest: number) =>
    `The other ${rest === 1 ? 'one stays' : `${rest} stay`} as ${rest === 1 ? 'it is' : 'they are'}.`,
  updatedToast: (name: string) => `${name} updated`,
  joinedToast: (name: string) => `Joined with your other ${name}`,
  // Lines that can't be ordered sit on top of the basket under one line.
  cantOrder: (count: number) =>
    `${count} ${count === 1 ? 'item' : 'items'} can't be ordered right now. Remove ${count === 1 ? 'it' : 'them'} to check out.`,
  removeAll: (count: number) => (count === 1 ? 'Remove' : `Remove ${count}`),
  removedMany: (count: number) => `Removed ${count} items`,
  // A sold-out line stopped the order: name it and take it out in one tap.
  soldOutHint: (names: string) =>
    `${names} just sold out. Remove it, check your new total, then place your order.`,
  removeSoldOut: (count: number) =>
    count === 1 ? 'Remove sold-out item' : `Remove ${count} sold-out items`,
} as const;
