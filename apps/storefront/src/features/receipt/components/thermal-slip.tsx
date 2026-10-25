'use client';

import { useMemo } from 'react';
import { formatPeso, words, type OrderReceipt, type Storefront } from '@smartapp/core';
import {
  ThermalReceiptCard,
  type ThermalReceiptItem,
} from '@smartapp/ui/vendor/opensource-ui/thermal-receipt';
import { QRCode, QRCodeSvg } from '@smartapp/ui/components/qr-code';
import { formatManilaDateTime, formatOrderNumber } from '../receipt-rules';

export interface ThermalSlipProps {
  readonly order: OrderReceipt;
  readonly storefront: Storefront;
  readonly receiptUrl: string;
}

export function ThermalSlip({ order, storefront, receiptUrl }: ThermalSlipProps) {
  const items = useMemo<readonly ThermalReceiptItem[]>(() => {
    return order.lines.map((line, idx) => {
      const parts: string[] = [line.name];
      if (line.variantLabel) parts.push(`(${line.variantLabel})`);
      if (line.optionLabels.length > 0) parts.push(`+ ${line.optionLabels.join(', ')}`);
      if (line.note) parts.push(`[${line.note}]`);

      const name = `${line.qty}x ${parts.join(' ')}`;
      return {
        key: `${line.itemId}-${line.variantId}-${idx}`,
        name,
        price: formatPeso(line.lineTotal),
      };
    });
  }, [order.lines]);

  const dateStr = useMemo(() => formatManilaDateTime(order.placedAt), [order.placedAt]);
  const orderNumStr = useMemo(() => formatOrderNumber(order.orderNo), [order.orderNo]);

  const storeAddress =
    storefront.info.contact.showAddress && storefront.info.contact.address
      ? storefront.info.contact.address
      : undefined;

  const addressProp = storeAddress ? { storeAddress } : {};
  const discountProp =
    order.totals.discount > 0
      ? {
          taxLabel: words.basket.discount,
          tax: `-${formatPeso(order.totals.discount)}`,
        }
      : {};

  return (
    <div id="receipt-thermal-slip" className="w-full">
      <ThermalReceiptCard
        storeName={storefront.info.name}
        orderId={orderNumStr}
        date={dateStr}
        items={items}
        subtotalLabel={words.basket.subtotal}
        subtotal={formatPeso(order.totals.subtotal)}
        totalLabel={words.basket.total}
        total={formatPeso(order.totals.total)}
        footer={words.shop.orderSlip}
        {...addressProp}
        {...discountProp}
        code={
          <div className="flex flex-col items-center gap-1">
            <QRCode value={receiptUrl} size={100}>
              <QRCodeSvg className="rounded" />
            </QRCode>
            <span className="text-xs text-muted-foreground">Show this at pickup</span>
          </div>
        }
      />
    </div>
  );
}
