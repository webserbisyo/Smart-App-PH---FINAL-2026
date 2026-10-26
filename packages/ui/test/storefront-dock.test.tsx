// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CartButton } from '../src/compositions/cart-button';
import { StorefrontDock } from '../src/compositions/storefront-dock';
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

describe('StorefrontDock', () => {
  afterEach(cleanup);

  it('marks only the active tab with aria-current and keeps every label for screen readers', () => {
    render(<StorefrontDock label="Shop" items={items} />);
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Menu' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('shows the cart beside the pill only when given one', () => {
    const cart = <CartButton count={3} label="Basket, 3 items, ₱345" onClick={() => {}} />;
    const { rerender } = render(<StorefrontDock label="Shop" items={items} />);
    expect(screen.queryByRole('button', { name: /basket/i })).toBeNull();
    rerender(<StorefrontDock label="Shop" items={items} cart={cart} />);
    expect(screen.getByRole('button', { name: 'Basket, 3 items, ₱345' })).toBeTruthy();
  });
});

describe('CartButton', () => {
  afterEach(cleanup);

  it('shows the count dot only with items, capped at 99+', () => {
    const { rerender, container } = render(
      <CartButton count={0} label="Basket" onClick={() => {}} />,
    );
    expect(container.textContent).toBe('');
    rerender(<CartButton count={120} label="Basket" onClick={() => {}} />);
    expect(container.textContent).toBe('99+');
  });

  it('pops when the count goes up, not when it goes down', () => {
    const { rerender, container } = render(
      <CartButton count={1} label="Basket" onClick={() => {}} />,
    );
    expect(container.querySelector('.cart-bump')).toBeNull();
    rerender(<CartButton count={2} label="Basket" onClick={() => {}} />);
    const first = container.querySelector('.cart-bump');
    expect(first).not.toBeNull();
    rerender(<CartButton count={1} label="Basket" onClick={() => {}} />);
    expect(container.querySelector('.cart-bump')).toBe(first);
  });

  it('opens the basket on tap', () => {
    const onClick = vi.fn();
    render(<CartButton count={2} label="Basket, 2 items" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Basket, 2 items' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
