import { describe, expect, it } from 'vitest';
import {
  NO_REFERENCE,
  PROOFS_PER_ORDER,
  hasReference,
  orderProofs,
  shopAnswerCount,
} from '../src/rules/order-chat.js';
import type { OrderMessage } from '../src/schemas/order.js';

const at = '2026-11-11T05:00:00.000Z';
const proof = {
  id: 'p1',
  status: 'rejected' as const,
  referenceNo: '1234',
  path: 'proofs/x/1.webp',
  uploadedAt: at,
  rejectReason: 'Amount is short',
};

const messages: OrderMessage[] = [
  { id: 'm1', kind: 'status', at, status: 'placed', proof: null, text: null },
  { id: 'm2', kind: 'proof', at, status: null, proof, text: null },
  { id: 'm3', kind: 'status', at, status: null, proof: null, text: 'Payment not approved' },
  { id: 'm4', kind: 'rider', at, status: null, proof: null, text: null },
];

describe('order chat', () => {
  it('counts only the shop’s answers, never plain status markers or photos', () => {
    expect(shopAnswerCount(messages)).toBe(2);
    expect(shopAnswerCount(messages.slice(0, 2))).toBe(0);
  });

  it('lists the photos sent, oldest first, under the limit of 3', () => {
    expect(orderProofs(messages)).toEqual([proof]);
    expect(PROOFS_PER_ORDER).toBe(3);
  });

  it('treats a photo sent without a reference as having none', () => {
    expect(hasReference(NO_REFERENCE)).toBe(false);
    expect(hasReference(' ')).toBe(false);
    expect(hasReference('1023 456 7890')).toBe(true);
  });
});
