// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BottomDock } from '../src/compositions/bottom-dock';
import type { NavItem } from '../src/lib/nav';

function item(id: string, label: string, active: boolean, count?: number): NavItem {
  return { id, label, icon: null, link: <a href={`/${id}`} />, active, count };
}

describe('BottomDock', () => {
  afterEach(cleanup);

  const items: NavItem[] = [
    item('home', 'Home', true),
    item('orders', 'Orders', false, 4),
    item('catalog', 'Menu', false, 0),
    item('members', 'Members', false),
  ];

  it('marks only the active item with aria-current', () => {
    render(<BottomDock label="Main" items={items} />);
    expect(screen.getByRole('link', { name: /home/i }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /orders/i }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: /members/i }).getAttribute('aria-current')).toBeNull();
  });

  it('shows a badge only when count is above 0', () => {
    const { container } = render(<BottomDock label="Main" items={items} />);
    const badges = container.querySelectorAll('[data-slot="badge"]');
    expect(badges).toHaveLength(1);
    expect(badges[0]?.textContent).toBe('4');
    expect(screen.getByRole('link', { name: /orders/i }).contains(badges[0] ?? null)).toBe(true);
  });

  it('marks More as active when one of its items is active', () => {
    render(
      <BottomDock
        label="Main"
        items={items.map((i) => ({ ...i, active: false }))}
        more={{ label: 'More', items: [item('settings', 'Settings', true)] }}
      />,
    );
    expect(screen.getByRole('button', { name: /more/i }).hasAttribute('data-active')).toBe(true);
  });
});
