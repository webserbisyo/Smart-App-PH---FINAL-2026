import { HouseIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';

export function HomeScreen() {
  return (
    <EmptyPage
      title={words.screens.home.title}
      icon={<HouseIcon />}
      line={words.screens.home.empty}
    />
  );
}
