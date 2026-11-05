import { membersWords } from '@smartapp/core';
import { useMembersOverview, useStampCard } from '@smartapp/data';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { usePathTabs, type PathTab } from '@/app/tabs';

const MEMBERS_TABS: readonly PathTab[] = [
  { id: 'members', label: membersWords.tabs.members, to: '/members' },
  { id: 'stamp-card', label: membersWords.tabs.stampCard, to: '/members/stamp-card' },
  { id: 'claims', label: membersWords.tabs.prizes, to: '/members/claims' },
];

/**
 * Members, Stamp card and Prizes. Prizes shows how many wait at the counter, and only shows for a custom
 * prize card (or while claims still wait after the prize changed).
 */
export function useMembersTabs(): NavItem[] {
  const tabs = usePathTabs(MEMBERS_TABS);
  const toGive = useMembersOverview().data?.prizesToGive ?? 0;
  const kind = useStampCard().data?.reward.kind;
  const showPrizes = kind === 'custom' || toGive > 0;
  return tabs
    .filter((tab) => tab.id !== 'claims' || showPrizes || tab.active)
    .map((tab) => (tab.id === 'claims' && toGive > 0 ? { ...tab, count: toGive } : tab));
}
