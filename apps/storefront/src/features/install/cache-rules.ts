// What the service worker keeps for offline (T13, decisions T6 and T26). Shared by sw.ts and the shop frame.

// Never cached: checkout, receipts, join, account, proofs, API, auth and the worker itself.
const PRIVATE_PATH =
  /^\/(?:api|auth|proofs|serwist)(?:\/|$)|^\/[^/]+\/(?:checkout|join|account|o)(?:\/|$)/;
// Kept for offline: Home, Menu, My orders and Rewards (the member QR works at the counter).
const SHOP_PAGE = /^\/[a-z0-9-]+(?:\/(?:menu|orders|rewards))?\/?$/;

/** A page or file that must always come from the network (anything with a token in the link too). */
export function isPrivateUrl(url: URL): boolean {
  return PRIVATE_PATH.test(url.pathname) || url.searchParams.has('token');
}

/** A shop page that opens from the saved copy when there is no signal. */
export function keepsOffline(pathname: string): boolean {
  return SHOP_PAGE.test(pathname) && !PRIVATE_PATH.test(pathname);
}
