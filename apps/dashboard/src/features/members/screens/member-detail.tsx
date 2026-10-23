import { UserIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';

export function MemberDetailScreen() {
  return (
    <EmptyPage
      title={words.screens.members.detailTitle}
      icon={<UserIcon />}
      line={words.screens.members.detailEmpty}
    />
  );
}
