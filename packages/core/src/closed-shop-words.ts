// Words for ordering while the shop is closed, last orders and closed days (T129). Their own file (not
// words.ts): one words module is shared by every storefront page, so new words there would grow each page.
export const closedShopWords = {
  // "Closed today · Christmas" when the owner gave the closed day a reason.
  closedToday: (reason: string) => `Closed today · ${reason}`,
  // The order-now cut-off: closing time minus prep time.
  lastOrders: (time: string) => `Last orders were ${time}`,
  lastOrdersSaved: (time: string) => `Last orders were ${time}. Your basket is saved.`,
  lastOrdersPickTime: (time: string) => `Last orders were ${time}, so pick a time for later.`,
  lastOrdersDisabled: (time: string) => `Last orders were ${time} · Pick a time`,
  // The ASAP and Walk-in cards while the shop can't take an order for now.
  opensAt: (when: string) => `Opens ${when}`,
  walkInClosed: (when: string) => `Walk-in opens ${when}. Choose Pickup or Delivery.`,
  walkInClosedShort: (when: string) => `Walk-in opens ${when}`,
  closedPickTime: (when: string) => `Closed now · Opens ${when} · Pick a time`,
  // A booked time the shop can't take: never open (closed, too soon) or full.
  slotNotOpen: "That time isn't open. Pick another.",
  slotFull: 'That time just filled up. Pick another.',
  // The price check failed: Place order waits for a working one.
  priceCheckFailed: "Couldn't check prices. Try again.",
  tryAgain: 'Try again',
  // The time picker's columns (T129).
  hour: 'Hour',
  minute: 'Minute',
  amPm: 'AM or PM',
  timeFull: (time: string) => `${time}, full`,
  timeLeft: (time: string, left: number) => `${time}, ${left} left`,
} as const;
