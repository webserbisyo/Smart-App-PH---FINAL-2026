import * as React from 'react';
import { createPortal } from 'react-dom';
import type { BoardOrder, OwnerOrder } from '@smartapp/core';
import {
  errorWords,
  formatClock,
  formatManila,
  formatPeso,
  manilaDate,
  ordersWords,
  words,
} from '@smartapp/core';
import { errorCodeOf, useOrderDetail } from '@smartapp/data';
import { QRCode, QRCodeSvg } from '@smartapp/ui/components/qr-code';
import { notify } from '@smartapp/ui/compositions/notify';
import {
  ThermalReceiptCard,
  type ThermalReceiptItem,
} from '@smartapp/ui/vendor/opensource-ui/thermal-receipt';
import { env } from '../env.js';
import { useShop } from '../shop.js';
import { orderNoLabel } from './order-ticket-label.js';

/** The customer's receipt link, the same one the QR on their phone opens. */
export function receiptLink(slug: string, token: string): string {
  return `${env.VITE_STOREFRONT_URL}/${slug}/o/${token}`;
}

export interface PrintTicketProps {
  order: BoardOrder | OwnerOrder;
  shopName: string;
  receiptUrl: string;
  now: Date;
  /** Called once the QR is drawn (or failed), so printing waits for it. */
  onReady?: (() => void) | undefined;
}

function lineText(line: {
  qty: number;
  name: string;
  variantLabel: string | null;
  optionLabels: readonly string[];
  note: string | null;
}): string {
  const parts = [`${line.qty}x ${line.name}`];
  if (line.variantLabel) parts.push(`(${line.variantLabel})`);
  if (line.optionLabels.length > 0) parts.push(`+ ${line.optionLabels.join(', ')}`);
  if (line.note) parts.push(`[${line.note}]`);
  return parts.join(' ');
}

/**
 * The printed kitchen ticket (O5): the installed Thermal Receipt with every line, the order note, the
 * total and payment word, the receipt QR and the pickup code in large letters. globals.css prints it
 * black on white, edge to edge, and hides the rest of the page.
 */
export function PrintTicket({ order, shopName, receiptUrl, now, onReady }: PrintTicketProps) {
  const items = React.useMemo<ThermalReceiptItem[]>(() => {
    const rows: ThermalReceiptItem[] = order.lines.map((line, idx) => ({
      key: `line-${idx}`,
      name: lineText(line),
      price: 'lineTotal' in line ? formatPeso(line.lineTotal) : '',
    }));
    if ('moreLines' in order && order.moreLines > 0) {
      rows.push({ key: 'more', name: ordersWords.ticket.moreLines(order.moreLines), price: '' });
    }
    if (order.note) {
      rows.push({ key: 'note', name: `${ordersWords.ticket.orderNote}: ${order.note}`, price: '' });
    }
    return rows;
  }, [order]);

  const total = 'total' in order ? order.total : order.totals.total;
  const subtotal = 'totals' in order ? order.totals.subtotal + order.totals.deliveryFee : total;
  const discount = 'totals' in order ? order.totals.discount : 0;
  const otherDay = manilaDate(order.dueAt) !== manilaDate(now);
  const due = otherDay ? formatManila(order.dueAt, 'datetime') : formatClock(order.dueAt);
  const discountProps =
    discount > 0 ? { taxLabel: ordersWords.print.discount, tax: formatPeso(-discount) } : {};

  return (
    <ThermalReceiptCard
      storeName={shopName}
      storeAddress={order.customerName}
      orderId={`${orderNoLabel(order.orderNo)} · ${ordersWords.types[order.type]}`}
      date={ordersWords.print.due(due)}
      items={items}
      subtotalLabel={ordersWords.print.subtotal}
      subtotal={formatPeso(subtotal)}
      totalLabel={ordersWords.print.total}
      total={formatPeso(total)}
      footer={ordersWords.print.footer}
      {...discountProps}
      code={
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-semibold">
            {ordersWords.print.payment(
              words.shop.paymentMethod[order.paymentMethod],
              words.shop.paymentStatus[order.paymentStatus],
            )}
          </p>
          <QRCode
            value={receiptUrl}
            size={96}
            {...(onReady ? { onGenerated: onReady, onError: onReady } : {})}
          >
            <QRCodeSvg />
          </QRCode>
          <p className="text-xs">{ordersWords.print.code}</p>
          <p className="text-3xl font-bold tracking-widest">{order.pickupCode}</p>
        </div>
      }
    />
  );
}

// If the QR never reports back, print anyway after this long.
const QR_WAIT_MS = 2000;

function PrintJob({
  slug,
  orderId,
  onDone,
}: {
  slug: string;
  orderId: string;
  onDone: () => void;
}) {
  const shop = useShop();
  const { data, isError, error } = useOrderDetail(slug, orderId);
  const [qrReady, setQrReady] = React.useState(false);
  const markReady = React.useCallback(() => setQrReady(true), []);
  const now = React.useMemo(() => new Date(), []);

  React.useEffect(() => {
    if (!isError) return;
    notify({ title: errorWords(errorCodeOf(error)), tone: 'error' });
    onDone();
  }, [isError, error, onDone]);

  React.useEffect(() => {
    if (!data) return;
    const id = window.setTimeout(markReady, QR_WAIT_MS);
    return () => window.clearTimeout(id);
  }, [data, markReady]);

  React.useEffect(() => {
    if (!data || !qrReady) return;
    window.addEventListener('afterprint', onDone, { once: true });
    const id = window.setTimeout(() => window.print(), 50);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('afterprint', onDone);
    };
  }, [data, qrReady, onDone]);

  return (
    <div data-slot="print-ticket" className="hidden w-full print:block">
      {data && (
        <PrintTicket
          order={data}
          shopName={shop.name}
          receiptUrl={receiptLink(data.slug, data.token)}
          now={now}
          onReady={markReady}
        />
      )}
    </div>
  );
}

/**
 * Print one order's ticket through the browser print dialog. The full order loads first (every line),
 * then the ticket mounts at the end of <body> and the dialog opens once its QR is drawn.
 */
export function usePrintTicket(slug: string) {
  const [job, setJob] = React.useState<{ orderId: string; n: number } | null>(null);
  const print = React.useCallback((orderId: string) => {
    setJob((prev) => ({ orderId, n: (prev?.n ?? 0) + 1 }));
  }, []);
  const done = React.useCallback(() => setJob(null), []);
  const node =
    job && typeof document !== 'undefined'
      ? createPortal(
          <PrintJob key={job.n} slug={slug} orderId={job.orderId} onDone={done} />,
          document.body,
        )
      : null;
  return { print, isPrinting: job !== null, node };
}
