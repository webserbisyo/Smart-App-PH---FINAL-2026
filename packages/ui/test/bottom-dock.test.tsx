// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BottomDock } from '../src/compositions/bottom-dock';
import type { NavItem } from '../src/lib/nav';

describe('BottomDock', () => {
  const items: NavItem[] = [
    { id: 'home', label: 'Home', href: '/', isActive: true },
    { id: 'orders', label: 'Orders', href: '/orders', badge: 4 },
    { id: 'catalog', label: 'Menu', href: '/catalog' },
    { id: 'members', label: 'Members', href: '/members' },
  ];

  it('renders all nav items with aria-current on active item', () => {
    render(<BottomDock items={items} />);

    expect(screen.getByText('Home')).toBeDefined();
    expect(screen.getByText('Orders')).toBeDefined();
    expect(screen.getByText('Menu')).toBeDefined();
    expect(screen.getByText('Members')).toBeDefined();

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink.getAttribute('aria-current')).toBe('page');

    const ordersLink = screen.getByRole('link', { name: /orders/i });
    expect(ordersLink.getAttribute('aria-current')).toBeNull();
  });

  it('displays badge count when greater than 0', () => {
    render(<BottomDock items={items} />);
    expect(screen.getByText('4')).toBeDefined();
  });
});
