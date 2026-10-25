'use client';

import { useMemo } from 'react';
import { formatPeso, words, type OrderReceipt, type Storefront } from '@smartapp/core';
import {
  ThermalReceiptCard,
  type ThermalReceiptItem,
} from '@smartapp/ui/vendor/opensource-ui/thermal-receipt';
import { QRCode, QRCodeSvg } from '@smartapp/ui/components/qr-code';
import { formatManilaDateTime, formatOrderNumber } from '../receipt-rules';
import { paymentChip } from '../receipt-look';

export interface ThermalSlipProps {
  readonly order: OrderReceipt;
  readonly storefront: Storefront;
  readonly receiptUrl: string;
}

export function ThermalSlip({ order, storefront, receiptUrl }: ThermalSlipProps) {
  const items = useMemo<readonly ThermalReceiptItem[]>(() => {
    const lines: ThermalReceiptItem[] = order.lines.map((line, idx) => {
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
    // The delivery fee is a row above the subtotal, so the rows add up to it.
    if (order.totals.deliveryFee > 0) {
      lines.push({
        key: 'delivery-fee',
        name: words.basket.deliveryFee,
        price: formatPeso(order.totals.deliveryFee),
      });
    }
    return lines;
  }, [order.lines, order.totals.deliveryFee]);

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
          tax: formatPeso(-order.totals.discount),
        }
      : {};

  return (
    <div id="receipt-thermal-slip" className="w-full px-1 py-2">
      <ThermalReceiptCard
        storeName={storefront.info.name}
        orderId={orderNumStr}
        date={dateStr}
        items={items}
        subtotalLabel={words.basket.subtotal}
        subtotal={formatPeso(order.totals.subtotal + order.totals.deliveryFee)}
        totalLabel={words.basket.total}
        total={formatPeso(order.totals.total)}
        footer={words.shop.orderSlip}
        {...addressProp}
        {...discountProp}
        code={
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-xs font-semibold">
              {words.receipt.paidWith(
                words.shop.paymentMethod[order.paymentMethod],
                paymentChip(order).label,
              )}
            </p>
            <QRCode value={receiptUrl} size={100}>
              <QRCodeSvg className="rounded-sm" />
            </QRCode>
          </div>
        }
      />
    </div>
  );
}
