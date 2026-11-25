import { formatPeso, pushWords, type OrderStatus, type OrderType } from '@smartapp/core';

/**
 * The Declarative Web Push shape (R5): iPhones (iOS 18.4+) show it without running the worker; other browsers
 * hand it to the worker, which reads the same fields (X9). Under 4 KB, no phone or address.
 */
export interface PushMessage {
  web_push: 8030;
  notification: {
    title: string;
    body: string;
    navigate: string;
    lang: 'en';
    tag: string;
  };
}

const TITLE_MAX = 80;
const BODY_MAX = 240;

export function pushMessage(input: {
  title: string;
  body: string;
  navigate: string;
  tag: string;
}): PushMessage {
  return {
    web_push: 8030,
    notification: {
      title: input.title.slice(0, TITLE_MAX),
      body: input.body.slice(0, BODY_MAX),
      navigate: input.navigate,
      lang: 'en',
      tag: input.tag,
    },
  };
}

/** "#012": the order number as the owner and customer see it. */
export function orderNoText(orderNo: number): string {
  return `#${String(orderNo).padStart(3, '0')}`;
}

/** The first word of a name: the only part of a customer a push may carry. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0]?.slice(0, 40) ?? '';
}

/** A topic is at most 32 letters: the order id without its dashes (RFC 8030). */
export function topicOf(orderId: string): string {
  return orderId.replace(/-/g, '').slice(0, 32);
}

/** The customer's words for an order step; null when the step sends nothing. */
export function statusBody(status: OrderStatus, type: OrderType, orderNo: number): string | null {
  const no = orderNoText(orderNo);
  const w = pushWords.status;
  switch (status) {
    case 'preparing':
      return w.preparing(no);
    case 'ready':
      return type === 'delivery' ? w.readyDelivery(no) : w.readyPickup(no);
    case 'out_for_delivery':
      return w.onTheWay(no);
    case 'cancelled':
      return w.cancelled(no);
    case 'expired':
      return w.expired(no);
    case 'placed':
    case 'completed':
      // Completed waits for phase 6, where it is one push with the stamp (T106).
      return null;
  }
}

export function ownerNewOrder(input: {
  orderNo: number;
  total: number;
  customerName: string;
  type: OrderType;
}): { title: string; body: string } {
  const no = orderNoText(input.orderNo);
  return {
    title: pushWords.owner.newOrder(no, formatPeso(input.total)),
    body: pushWords.owner.newOrderBody(
      firstName(input.customerName),
      pushWords.orderType[input.type],
    ),
  };
}

export function ownerPayment(input: { orderNo: number; total: number; customerName: string }): {
  title: string;
  body: string;
} {
  return {
    title: pushWords.owner.payment(orderNoText(input.orderNo)),
    body: pushWords.owner.paymentBody(firstName(input.customerName), formatPeso(input.total)),
  };
}
