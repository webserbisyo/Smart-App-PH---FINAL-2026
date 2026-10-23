import { StampIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';
import { useMembersTabs } from '../tabs.js';

export function StampCardScreen() {
  return (
    <EmptyPage
      title={words.screens.members.title}
      tabs={useMembersTabs()}
      icon={<StampIcon />}
      line={words.screens.members.emptyStampCard}
    />
  );
}
