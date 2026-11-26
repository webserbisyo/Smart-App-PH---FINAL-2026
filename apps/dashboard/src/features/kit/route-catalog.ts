// Every page of both apps in one list (decision T98): /kit/routes shows it, and the UI scan in CI
// (tooling/e2e/ui-scan.e2e.ts) opens each page marked `scan`. Plain data, no React, so tooling can read it.
// Add a line here when a page is added; the scan then covers it.

export interface CatalogRoute {
  /** The route as the router writes it ($param for a value). */
  readonly path: string;
  /** A real address to open, with sample values for any $param. Missing when it needs a value we don't have. */
  readonly open?: string;
  readonly label: string;
  /** Opened by the UI scan in CI. Redirects and pages that need a one-off value are left out. */
  readonly scan: boolean;
  readonly note?: string;
}

/** Dashboard pages for a shop owner (signed in as a demo shop owner). */
export const DASHBOARD_ROUTES: readonly CatalogRoute[] = [
  { path: '/', open: '/', label: 'Home', scan: true },
  { path: '/orders', open: '/orders', label: 'Orders', scan: true },
  { path: '/orders/$orderId', label: 'Order (opens on Orders)', scan: false, note: 'Redirect' },
  { path: '/orders/new', open: '/orders/new', label: 'New order', scan: true },
  {
    path: '/orders/$orderId/edit',
    label: 'Edit order',
    scan: false,
    note: 'Needs an open order id; opened from the order panel',
  },
  { path: '/catalog', open: '/catalog', label: 'Menu', scan: true },
  { path: '/catalog/categories', open: '/catalog/categories', label: 'Categories', scan: true },
  { path: '/catalog/add-ons', open: '/catalog/add-ons', label: 'Add-ons', scan: true },
  { path: '/catalog/variants', open: '/catalog/variants', label: 'Variants', scan: true },
  { path: '/catalog/new', open: '/catalog/new', label: 'New item', scan: true },
  {
    path: '/catalog/$itemId',
    open: '/catalog/ks-classic-smash',
    label: 'Edit item',
    scan: true,
    note: 'Kanto Smash item',
  },
  { path: '/members', open: '/members', label: 'Members', scan: true },
  { path: '/members/stamp-card', open: '/members/stamp-card', label: 'Stamp card', scan: true },
  { path: '/members/claims', open: '/members/claims', label: 'Claims', scan: true },
  {
    path: '/members/$customerId',
    label: 'Member (opens on Members)',
    scan: false,
    note: 'Redirect',
  },
  { path: '/m/$code', label: 'Find a member by card code', scan: false, note: 'Needs a card code' },
  { path: '/insights', label: 'Insights (opens Home trends)', scan: false, note: 'Redirect' },
  { path: '/settings', open: '/settings', label: 'Settings', scan: true },
  { path: '/settings/shop', open: '/settings/shop', label: 'Shop details', scan: true },
  { path: '/settings/hours', open: '/settings/hours', label: 'Hours', scan: true },
  { path: '/settings/ordering', open: '/settings/ordering', label: 'Ordering', scan: true },
  { path: '/settings/delivery', open: '/settings/delivery', label: 'Delivery', scan: true },
  { path: '/settings/payments', open: '/settings/payments', label: 'Payments', scan: true },
  { path: '/settings/account', open: '/settings/account', label: 'Account', scan: true },
  {
    path: '/settings/notifications',
    open: '/settings/notifications',
    label: 'Notifications',
    scan: true,
  },
  { path: '/settings/plan', open: '/settings/plan', label: 'Plan', scan: true },
  { path: '/settings/storage', open: '/settings/storage', label: 'Storage', scan: true },
  { path: '/editor', open: '/editor', label: 'App editor', scan: true },
];

/** Dashboard pages for the platform admin (signed in as the demo admin). */
export const ADMIN_ROUTES: readonly CatalogRoute[] = [
  { path: '/admin', open: '/admin', label: 'Admin home', scan: true },
  { path: '/admin/shops', open: '/admin/shops', label: 'Shops', scan: true },
  { path: '/admin/payments', open: '/admin/payments', label: 'Payments', scan: true },
  { path: '/admin/tracking', open: '/admin/tracking', label: 'Tracking', scan: true },
  { path: '/admin/setup', open: '/admin/setup', label: 'Setup', scan: true },
  {
    path: '/second-step',
    label: 'Second step (authenticator code)',
    scan: false,
    note: 'Only on the API with the second step on; sample data goes straight to Super Admin',
  },
];

/** Dashboard pages for someone signed out. */
export const GUEST_ROUTES: readonly CatalogRoute[] = [
  { path: '/login', open: '/login', label: 'Sign in', scan: true },
  { path: '/signup', open: '/signup', label: 'Sign up', scan: true },
  { path: '/forgot', open: '/forgot', label: 'Forgot password', scan: true },
  { path: '/logout', label: 'Sign out', scan: false, note: 'Signs out, then opens Sign in' },
];

/** Our own storefront pages outside any shop. */
export const PLATFORM_ROUTES: readonly CatalogRoute[] = [
  { path: '/', open: '/', label: 'Platform page', scan: true },
  { path: '/samples', open: '/samples', label: 'Sample shops (T109)', scan: true },
];

/** Storefront pages inside one shop; each path follows /<shop slug>. */
export const STOREFRONT_ROUTES: readonly CatalogRoute[] = [
  { path: '', open: '', label: 'Shop home', scan: true },
  { path: '/menu', open: '/menu', label: 'Menu', scan: true },
  { path: '/checkout', open: '/checkout', label: 'Checkout', scan: true },
  { path: '/orders', open: '/orders', label: 'My orders', scan: true },
  { path: '/rewards', open: '/rewards', label: 'Rewards', scan: true },
  { path: '/account', open: '/account', label: 'Account', scan: true },
  { path: '/join', open: '/join', label: 'Join (become a member)', scan: true },
  { path: '/privacy', open: '/privacy', label: 'Privacy', scan: true },
  { path: '/o/[token]', label: 'Receipt link', scan: false, note: 'Needs an order link' },
  {
    path: '/preview',
    label: 'Owner preview',
    scan: false,
    note: 'Opened from the dashboard editor',
  },
  { path: '/[...rest]', open: '/no-such-page', label: 'Not found', scan: true },
];

/** The two demo shops the scan opens: one food, one retail (AGENTS: check both kinds). */
export const SCAN_SHOPS = ['kanto-smash', 'tala-apparel'] as const;
