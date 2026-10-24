import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BoardOrderSchema,
  MemberAccountSchema,
  OrderRatingSchema,
  OrderReceiptSchema,
  OrderRowSchema,
  OwnerOrderSchema,
  PaymentSchema,
  PublicShopSchema,
  QuoteSchema,
  RewardClaimSchema,
  SendCodeResultSchema,
} from '@smartapp/core';
import { DEMO_RECEIPT_TOKENS, demoBasketLines } from '../src/mocks/activity';
import { mnl, pickupPayload, testStore } from './helpers';

const api = readFileSync(resolve(import.meta.dirname, '../../../docs/api.md'), 'utf8');

function methodsIn(section: string): string[] {
  const start = api.indexOf(`## ${section}`);
  const end = api.indexOf('\n## ', start + 3);
  const text = api.slice(start, end === -1 ? undefined : end);
  return text
    .split('\n')
    .filter((line) => line.startsWith('| `'))
    .flatMap((line) => [...(line.split('|')[1] ?? '').matchAll(/`(\w+)`/g)].map((m) => m[1] ?? ''));
}

describe('contract: docs/api.md rows have mock methods with the same name', () => {
  const { store } = testStore();
  it.each([
    ['Storefront (public', store.storefront],
    ['Orders (owner)', store.ownerOrders],
    ['Samples (owner)', store.ownerSamples],
  ] as const)('%s', (section, adapter) => {
    const names = methodsIn(section);
    expect(names.length).toBeGreaterThan(1);
    for (const name of names) expect(Object.keys(adapter), name).toContain(name);
  });

  it('customer auth rows', () => {
    for (const name of ['sendCustomerCode', 'verifyCustomerCode']) {
      expect(Object.keys(store.customerAuth)).toContain(name);
    }
  });
});

describe('contract: outputs parse with their schemas', () => {
  it('storefront, account and owner methods', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));
    const slug = 'kanto-smash';
    const shop = await store.storefront.getStorefront({ slug });
    expect(PublicShopSchema.safeParse(shop).success).toBe(true);
    expect(await store.storefront.getStorefront({ slug: 'nope' })).toBeNull();

    const lines = demoBasketLines(PublicShopSchema.parse(shop), new Date(mnl('2026-10-26 12:00')));
    expect(lines.length).toBeGreaterThan(0);
    const q = await store.storefront.quoteOrder({ slug, payload: pickupPayload(lines) });
    expect(QuoteSchema.safeParse(q).success).toBe(true);
    expect(q.problems).toEqual([]);

    const placed = await store.storefront.placeOrder({
      slug,
      payload: pickupPayload(lines),
      clientKey: 'contract-1',
    });
    expect(
      OrderReceiptSchema.safeParse(await store.storefront.getOrder({ slug, token: placed.token }))
        .success,
    ).toBe(true);
    const rows = await store.storefront.listMyOrders({ slug, tokens: [placed.token] });
    expect(rows.every((r) => OrderRowSchema.safeParse(r).success)).toBe(true);

    for (const token of DEMO_RECEIPT_TOKENS) {
      const receipt = await store.storefront.getOrder({ slug, token });
      expect(OrderReceiptSchema.safeParse(receipt).success, token).toBe(true);
    }

    const upload = await store.storefront.createProofUploadUrl({ slug, token: placed.token });
    const pay = await store.storefront.submitProof({
      slug,
      token: placed.token,
      method: 'gcash',
      referenceNo: '9001 234 5678',
      path: upload.path,
    });
    expect(PaymentSchema.safeParse(pay).success).toBe(true);

    const sent = await store.customerAuth.sendCustomerCode({ email: 'ana@example.com' });
    expect(SendCodeResultSchema.safeParse(sent).success).toBe(true);
    expect(sent.devCode).toBe('123456');
    await store.customerAuth.verifyCustomerCode({ email: 'ana@example.com', code: '123456' });
    const account = await store.storefront.joinAsMember({
      slug,
      name: 'Ana',
      phone: '0917 555 0001',
    });
    expect(MemberAccountSchema.safeParse(account).success).toBe(true);
    expect(account.balance).toBe(1);

    const board = await store.ownerOrders.listOrders({ slug, open: true });
    expect(board.length).toBeGreaterThan(0);
    expect(board.every((o) => BoardOrderSchema.safeParse(o).success)).toBe(true);
    const detail = await store.ownerOrders.getOrderDetail({ slug, orderId: placed.orderId });
    expect(OwnerOrderSchema.safeParse(detail).success).toBe(true);

    const rating = await store.storefront.rateOrder({
      slug,
      token: 'demo-completed',
      stars: 5,
      comment: 'Ok',
    });
    expect(OrderRatingSchema.safeParse(rating).success).toBe(true);

    expect(
      await store.storefront.resolveMapsLink({
        url: 'https://www.google.com/maps/@14.6,121.1,17z',
      }),
    ).toEqual({ lat: 14.6, lng: 121.1 });
  });

  it('a custom prize claim parses', async () => {
    const { store } = testStore();
    const slug = 'tala-apparel';
    await store.customerAuth.sendCustomerCode({ email: 'bea.fan@example.com' });
    await store.customerAuth.verifyCustomerCode({ email: 'bea.fan@example.com', code: '123456' });
    await store.storefront.joinAsMember({ slug, name: 'Fan', phone: '0917 555 0002' });
    const member = store.inspect(slug)?.members.find((m) => m.email === 'bea.fan@example.com');
    for (let i = 0; i < 5; i += 1) {
      member?.ledger.push({
        kind: 'given',
        delta: 1,
        reasonCategory: 'goodwill',
        orderNo: null,
        at: mnl('2026-10-25 10:00'),
      });
    }
    const claim = await store.storefront.claimReward({ slug });
    expect(RewardClaimSchema.safeParse(claim).success).toBe(true);
  });
});
