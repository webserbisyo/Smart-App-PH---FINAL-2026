import { createElement } from 'react';
import { Link, useRouterState, type LinkProps } from '@tanstack/react-router';
import type { NavItem } from '@smartapp/ui/lib/nav';

export interface PathTab {
  id: string;
  label: string;
  to: NonNullable<LinkProps['to']>;
}

// Tabs that are separate routes: the current path decides the active tab.
export function usePathTabs(tabs: readonly PathTab[]): NavItem[] {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return tabs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    icon: null,
    link: createElement(Link, { to: tab.to, preload: 'intent', activeOptions: { exact: true } }),
    active: pathname === tab.to,
  }));
}
