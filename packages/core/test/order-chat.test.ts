import { describe, expect, it } from 'vitest';
import {
  NO_REFERENCE,
  PROOFS_PER_ORDER,
  chatKey,
  chatLock,
  hasReference,
  lastLine,
  orderProofs,
  shopAnswerCount,
  unseenCount,
  waitingSince,
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

function line(id: string, from: OrderMessage['from'], minute = 0): OrderMessage {
  const t = new Date(Date.parse(at) + minute * 60_000).toISOString();
  return {
    id,
    kind: 'status',
    at: t,
    status: null,
    proof: null,
    text: null,
    from,
    via: 'app',
    seenAt: null,
  };
}

const messages: OrderMessage[] = [
  { ...line('m1', 'system'), kind: 'status', status: 'placed' },
  { ...line('m2', 'customer'), kind: 'proof', proof },
  { ...line('m3', 'shop'), kind: 'status', text: 'Payment not approved' },
  { ...line('m4', 'shop'), kind: 'rider' },
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

  it('waits from the customer’s first unanswered line until the shop answers (T87)', () => {
    const photo = { ...line('p', 'customer', 1), kind: 'proof' as const, proof };
    const again = { ...line('q', 'customer', 5), kind: 'proof' as const, proof };
    const answer = { ...line('a', 'shop', 3), text: 'Payment not approved' };
    expect(waitingSince([photo])).toBe(photo.at);
    expect(waitingSince([photo, answer])).toBeNull();
    expect(waitingSince([photo, answer, again])).toBe(again.at);
    expect(waitingSince([line('s', 'system', 9), photo])).toBe(photo.at);
  });

  it('counts only the customer’s unseen lines, and shows a person’s line last (T87)', () => {
    const seen = { ...line('p', 'customer', 1), seenAt: at };
    expect(unseenCount([seen, line('q', 'customer', 2), line('a', 'shop', 3)])).toBe(1);
    expect(lastLine([line('a', 'shop', 1), line('s', 'system', 2)])?.id).toBe('a');
    expect(lastLine([line('s', 'system', 2)])?.id).toBe('s');
    expect(lastLine([])).toBeNull();
  });

  it('keys a member’s chat by the member and a guest’s by the order; closed orders lock (T87)', () => {
    expect(chatKey({ id: 'o1', isMember: true, customerPhone: '0917' })).toBe('member:0917');
    expect(chatKey({ id: 'o1', isMember: false, customerPhone: '0917' })).toBe('order:o1');
    expect(chatLock('preparing')).toBe('photos_only');
    expect(chatLock('completed')).toBe('order_closed');
  });
});
