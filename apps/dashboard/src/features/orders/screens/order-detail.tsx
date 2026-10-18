import { ReceiptTextIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { EmptyPage } from '@/app/empty-page';

export function OrderDetailScreen() {
  return (
    <EmptyPage
      title={words.screens.orders.detailTitle}
      icon={<ReceiptTextIcon />}
      line={words.screens.orders.detailEmpty}
    />
  );
}
