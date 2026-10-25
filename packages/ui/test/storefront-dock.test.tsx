// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cartThumbCount, StorefrontDock, type DockCart } from '../src/compositions/storefront-dock';
import type { NavItem } from '../src/lib/nav';

function item(id: string, label: string, active: boolean): NavItem {
  return { id, label, icon: null, link: <a href={`/${id}`} />, active };
}

const items: NavItem[] = [
  item('home', 'Home', true),
  item('menu', 'Menu', false),
  item('rewards', 'Rewards', false),
  item('orders', 'Orders', false),
];

const cart = (count: number): DockCart => ({
  count,
  totalLabel: '₱345',
  thumbs: [null, null, null],
  link: <button type="button" />,
  label: `Basket, ${count} items, ₱345`,
});

beforeAll(() => {
  // jsdom has no ResizeObserver; the dock measures itself with one.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('StorefrontDock', () => {
  afterEach(cleanup);

  it('marks only the active tab with aria-current', () => {
    render(<StorefrontDock label="Shop" items={items} cart={null} />);
    expect(screen.getByRole('link', { name: /home/i }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /menu/i }).getAttribute('aria-current')).toBeNull();
  });

  it('shows the cart segment only with items in the basket', () => {
    const { rerender } = render(<StorefrontDock label="Shop" items={items} cart={null} />);
    expect(screen.queryByRole('button', { name: /basket/i })).toBeNull();
    rerender(<StorefrontDock label="Shop" items={items} cart={cart(0)} />);
    expect(screen.queryByRole('button', { name: /basket/i })).toBeNull();
    rerender(<StorefrontDock label="Shop" items={items} cart={cart(3)} />);
    expect(screen.getByRole('button', { name: 'Basket, 3 items, ₱345' })).toBeTruthy();
  });
});

describe('cartThumbCount', () => {
  // The dock is the screen minus 16 px each side, at most 440 px.
  const dock = (screen: number) => Math.min(440, screen - 32);

  it('fits up to 3 thumbnails on a wide dock with a short total', () => {
    expect(cartThumbCount({ dockWidth: dock(768), items: 4, totalLabel: '₱345', thumbs: 3 })).toBe(
      3,
    );
  });

  it('drops thumbnails as the total grows or the phone narrows, never below 0', () => {
    const counts = [440, 400, 380, 340, 328].map((w) =>
      cartThumbCount({ dockWidth: w, items: 4, totalLabel: '₱12,345.50', thumbs: 3 }),
    );
    expect(counts).toEqual([3, 2, 1, 0, 0]);
    expect(cartThumbCount({ dockWidth: 0, items: 4, totalLabel: '₱12,345.50', thumbs: 3 })).toBe(0);
  });

  it('never shows more thumbnails than lines', () => {
    expect(cartThumbCount({ dockWidth: 440, items: 3, totalLabel: '₱49', thumbs: 1 })).toBe(1);
  });

  it('keeps tabs and segment inside a 360 px phone with a ₱12,345.50 total', () => {
    const width = dock(360);
    const used = 4 * (44 + 4) + 8 + 24 + 20 + 8 + '₱12,345.50'.length * 7;
    expect(used).toBeLessThanOrEqual(width);
  });
});
