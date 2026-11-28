// The two closed-shop words the open state line needs on every page (T129). Kept apart from
// closedShopWords so the top bar never brings the checkout's words into each page's first JavaScript.
export const closedTodayWords = {
  // "Closed today · Christmas" when the owner gave the closed day a reason.
  closedToday: (reason: string) => `Closed today · ${reason}`,
  opensAt: (when: string) => `Opens ${when}`,
} as const;
