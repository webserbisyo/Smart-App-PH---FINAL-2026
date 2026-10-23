import { ChartColumnIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';
import { useInsightsTabs } from '../tabs.js';

export function InsightsScreen() {
  return (
    <EmptyPage
      title={words.screens.insights.title}
      tabs={useInsightsTabs()}
      icon={<ChartColumnIcon />}
      line={words.screens.insights.empty}
    />
  );
}
