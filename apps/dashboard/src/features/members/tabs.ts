import { membersWords } from '@smartapp/core';
import { useMembersOverview } from '@smartapp/data';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { usePathTabs, type PathTab } from '@/app/tabs';

const MEMBERS_TABS: readonly PathTab[] = [
  { id: 'members', label: membersWords.tabs.members, to: '/members' },
  { id: 'stamp-card', label: membersWords.tabs.stampCard, to: '/members/stamp-card' },
  { id: 'claims', label: membersWords.tabs.prizes, to: '/members/claims' },
];

/** Members, Stamp card and Prizes; Prizes shows how many wait at the counter. */
export function useMembersTabs(): NavItem[] {
  const tabs = usePathTabs(MEMBERS_TABS);
  const toGive = useMembersOverview().data?.prizesToGive ?? 0;
  return tabs.map((tab) => (tab.id === 'claims' && toGive > 0 ? { ...tab, count: toGive } : tab));
}
