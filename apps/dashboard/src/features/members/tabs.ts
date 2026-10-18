import { words } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';

export function getMembersTabs(activePath: string): NavItem[] {
  return [
    {
      id: 'members-all',
      label: words.screens.members.tabAll,
      href: '/members',
      isActive: activePath === '/members',
    },
    {
      id: 'members-stamp-card',
      label: words.screens.members.tabStampCard,
      href: '/members/stamp-card',
      isActive: activePath === '/members/stamp-card',
    },
    {
      id: 'members-claims',
      label: words.screens.members.tabClaims,
      href: '/members/claims',
      isActive: activePath === '/members/claims',
    },
  ];
}
