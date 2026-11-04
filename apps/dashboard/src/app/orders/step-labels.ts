import type { OrderStatus, OrderType, ShopKind } from '@smartapp/core';
import { ordersWords } from '@smartapp/core';

export interface StepLabels {
  idle: string;
  busy: string;
  done: string;
}

/** The words on a button that moves an order to `to` (short verbs, decision T43). */
export function stepLabels(to: OrderStatus, type: OrderType, kind: ShopKind): StepLabels {
  const b = ordersWords.buttons;
  switch (to) {
    case 'preparing':
      return { idle: b.start(kind), busy: b.starting, done: b.started };
    case 'ready':
      return { idle: b.markReady, busy: b.markingReady, done: b.ready };
    case 'out_for_delivery':
      return { idle: b.sendOut, busy: b.sendingOut, done: b.sentOut };
    default:
      return {
        idle: type === 'delivery' ? b.delivered : b.handOver,
        busy: b.completing,
        done: b.completed,
      };
  }
}
