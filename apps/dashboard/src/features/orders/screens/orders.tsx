import { ReceiptTextIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';
import { useOrdersTabs } from '../tabs.js';

export function OrdersScreen() {
  return (
    <EmptyPage
      title={words.screens.orders.title}
      tabs={useOrdersTabs()}
      icon={<ReceiptTextIcon />}
      line={words.screens.orders.empty}
    />
  );
}
