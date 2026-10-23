import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/app/supabase.js', () => ({ supabase: {} }));
vi.mock('../src/app/env.js', () => ({
  env: {
    VITE_SUPABASE_URL: 'http://localhost:54321',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'test',
    VITE_API_URL: 'http://localhost:4000',
    VITE_STOREFRONT_URL: 'http://localhost:3000',
    VITE_SHOW_KIT: 'false',
  },
}));

const { router } = await import('../src/app/router.js');
const { NAV } = await import('../src/app/nav.js');
const { isActivePath } = await import('../src/app/use-nav-items.js');

// Section 7 of docs/prompts/T05-dashboard-shell.md.
const SPEC_ROUTES = [
  '/',
  '/orders',
  '/orders/$orderId',
  '/catalog',
  '/catalog/categories',
  '/catalog/add-ons',
  '/catalog/new',
  '/catalog/$itemId',
  '/members',
  '/members/stamp-card',
  '/members/claims',
  '/members/$customerId',
  '/insights',
  '/settings',
  '/settings/shop',
  '/settings/hours',
  '/settings/ordering',
  '/settings/delivery',
  '/settings/payments',
  '/settings/notifications',
  '/settings/plan',
  '/settings/account',
  '/editor',
  '/login',
  '/signup',
];

const routePaths = new Set(
  Object.keys(router.routesByPath).map((path) => path.replace(/(.)\/$/, '$1')),
);

describe('dashboard routes', () => {
  it('has every route from the spec', () => {
    for (const path of SPEC_ROUTES) {
      expect(routePaths.has(path), `missing route ${path}`).toBe(true);
    }
  });

  it('has a route for every nav item', () => {
    for (const item of NAV) {
      expect(routePaths.has(item.path), `nav item ${item.id} has no route`).toBe(true);
    }
  });

  it('puts Home, Orders, catalog and Members in the dock and the rest in More', () => {
    expect(NAV.filter((item) => item.placement === 'dock').map((item) => item.id)).toEqual([
      'home',
      'orders',
      'catalog',
      'members',
    ]);
    expect(NAV.filter((item) => item.placement === 'more').map((item) => item.id)).toEqual([
      'editor',
      'insights',
      'settings',
    ]);
  });

  it('keeps an area active on its sub-pages, and Home only on /', () => {
    expect(isActivePath('/orders/123', '/orders')).toBe(true);
    expect(isActivePath('/ordersx', '/orders')).toBe(false);
    expect(isActivePath('/orders', '/')).toBe(false);
    expect(isActivePath('/', '/')).toBe(true);
  });
});
