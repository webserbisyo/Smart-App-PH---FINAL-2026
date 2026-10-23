import { GiftIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';
import { useMembersTabs } from '../tabs.js';

export function PrizeClaimsScreen() {
  return (
    <EmptyPage
      title={words.screens.members.title}
      tabs={useMembersTabs()}
      icon={<GiftIcon />}
      line={words.screens.members.emptyClaims}
    />
  );
}
