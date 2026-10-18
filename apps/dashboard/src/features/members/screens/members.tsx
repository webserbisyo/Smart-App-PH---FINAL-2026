import { UsersIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';
import { useMembersTabs } from '../tabs.js';

export function MembersScreen() {
  return (
    <EmptyPage
      title={words.screens.members.title}
      tabs={useMembersTabs()}
      icon={<UsersIcon />}
      line={words.screens.members.emptyMembers}
    />
  );
}
