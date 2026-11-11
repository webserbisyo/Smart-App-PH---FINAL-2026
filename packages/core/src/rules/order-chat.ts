import type { OrderMessage, Proof } from '../schemas/order.js';

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
