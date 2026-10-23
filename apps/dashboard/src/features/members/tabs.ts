import { words } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { usePathTabs, type PathTab } from '@/app/tabs';

const MEMBERS_TABS: readonly PathTab[] = [
  { id: 'members', label: words.screens.members.tabMembers, to: '/members' },
  { id: 'stamp-card', label: words.screens.members.tabStampCard, to: '/members/stamp-card' },
  { id: 'claims', label: words.screens.members.tabClaims, to: '/members/claims' },
];

export function useMembersTabs(): NavItem[] {
  return usePathTabs(MEMBERS_TABS);
}
