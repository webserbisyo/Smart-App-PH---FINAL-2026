import type { ChatLock, OrderStatus } from '../schemas/enums.js';
import type { OrderMessage, Proof } from '../schemas/order.js';
import { isFinal } from './order-rules.js';

/**
 * The order chat (T81): one list of messages per order (the customer's payment photos, the shop's
 * answers and status lines), so free-text chat can switch on later without a new model.
 */

// Payment photos one order can take. A new photo is only possible after the shop said no to the last
// one, so a customer can never send two in a row.
export const PROOFS_PER_ORDER = 3;

// The photos sent on this order, oldest first.
export function orderProofs(messages: readonly OrderMessage[]): Proof[] {
  const proofs: Proof[] = [];
  for (const message of messages) if (message.proof) proofs.push(message.proof);
  return proofs;
}

// Lines that come from the shop: a decision, a rider, a tracking link, a new time. A plain status
// marker ("Preparing") is not an answer, so it never lights the chat's dot.
export function isShopAnswer(message: OrderMessage): boolean {
  if (message.kind === 'proof') return false;
  if (message.kind === 'status') return message.text !== null;
  return true;
}

export function shopAnswerCount(messages: readonly OrderMessage[]): number {
  return messages.filter(isShopAnswer).length;
}

// Sent in place of the reference number when the customer leaves it empty: the photo is the proof.
export const NO_REFERENCE = 'PROOF';

export function hasReference(referenceNo: string): boolean {
  return referenceNo.trim() !== '' && referenceNo.trim().toUpperCase() !== NO_REFERENCE;
}

// ---------------------------------------------------------------- The owner's side (T87)

/**
 * The chat a line belongs to. One chat per order for now; a member's key is theirs, so once live chat
 * arrives (MVP B) all their orders can share one chat with no change to the list.
 */
export function chatKey(order: { id: string; isMember: boolean; customerPhone: string }): string {
  return order.isMember ? `member:${order.customerPhone}` : `order:${order.id}`;
}

// Why the typing box is locked: photos and the shop's answers only for now, nothing once it is over.
export function chatLock(status: OrderStatus): ChatLock {
  return isFinal(status) ? 'order_closed' : 'photos_only';
}

// Since when the customer's newest line has waited for the shop, or null once the shop answered.
export function waitingSince(messages: readonly OrderMessage[]): string | null {
  let since: string | null = null;
  for (const message of [...messages].sort((a, b) => a.at.localeCompare(b.at))) {
    if (message.from === 'customer') since ??= message.at;
    else if (message.from === 'shop') since = null;
  }
  return since;
}

// The customer's lines the shop has not opened yet.
export function unseenCount(messages: readonly OrderMessage[]): number {
  return messages.filter((m) => m.from === 'customer' && m.seenAt === null).length;
}

// The newest line from a person, else the newest status line.
export function lastLine(messages: readonly OrderMessage[]): OrderMessage | null {
  const sorted = [...messages].sort((a, b) => a.at.localeCompare(b.at));
  const people = sorted.filter((m) => m.from !== 'system');
  return people.at(-1) ?? sorted.at(-1) ?? null;
}
