import { describe, expect, it, vi } from 'vitest';
import { PublicShopSchema, TEST_SHOP_PACKS } from '@smartapp/core';
import { demoBasketLines } from '../src/mocks/activity';
import { getMockScenario, readMockScenarioFromUrl } from '../src/mocks/scenario';
import { errorCode, mnl, pickupPayload, testStore } from './helpers';

const OPEN_MONDAY = mnl('2026-10-26 12:00');

async function lines(store: ReturnType<typeof testStore>['store'], slug: string) {
  const shop = PublicShopSchema.parse(await store.storefront.getStorefront({ slug }));
  return demoBasketLines(shop, store.now());
}

function item(store: ReturnType<typeof testStore>['store'], slug: string, name: string) {
  const found = store.inspect(slug)?.shop.catalog.items.find((i) => i.name === name);
  if (!found) throw new Error(name);
  return found;
}

async function signIn(store: ReturnType<typeof testStore>['store'], email: string) {
  await store.customerAuth.sendCustomerCode({ email });
  await store.customerAuth.verifyCustomerCode({ email, code: '123456' });
}

describe('orders', () => {
  it('placeOrder is idempotent by clientKey', async () => {
    const { store } = testStore(OPEN_MONDAY);
    const payload = pickupPayload(await lines(store, 'kanto-smash'));
    const a = await store.storefront.placeOrder({
      slug: 'kanto-smash',
      payload,
      clientKey: 'same-key-1',
    });
    const b = await store.storefront.placeOrder({
      slug: 'kanto-smash',
      payload,
      clientKey: 'same-key-1',
    });
    expect(b).toEqual(a);
    expect(
      store.inspect('kanto-smash')?.orders.filter((o) => o.clientKey === 'same-key-1'),
    ).toHaveLength(1);
  });

  it('order numbers are gap-free and reset each Manila day', async () => {
    const { store, clock } = testStore(OPEN_MONDAY);
    const slug = 'kanto-smash';
    const payload = pickupPayload(await lines(store, slug), { paymentMethod: 'cash' });
    const today =
      store
        .inspect(slug)
        ?.orders.filter((o) => o.businessDate === '2026-10-26')
        .map((o) => o.receipt.orderNo) ?? [];
    const sorted = [...today].sort((a, b) => a - b);
    expect(sorted).toEqual(sorted.map((_, i) => i + 1));
    const first = await store.storefront.placeOrder({ slug, payload, clientKey: 'n-1' });
    const second = await store.storefront.placeOrder({ slug, payload, clientKey: 'n-2' });
    expect(first.orderNo).toBe(today.length + 1);
    expect(second.orderNo).toBe(today.length + 2);
    clock.now = new Date(mnl('2026-10-27 12:00'));
    const nextDay = await store.storefront.placeOrder({ slug, payload, clientKey: 'n-3' });
    expect(nextDay.orderNo).toBe(1);
  });

  it('a proof never marks an order paid; the 4th proof is refused; duplicates are blocked', async () => {
    const { store } = testStore(OPEN_MONDAY);
    const slug = 'kanto-smash';
    const placed = await store.storefront.placeOrder({
      slug,
      payload: pickupPayload(await lines(store, slug)),
      clientKey: 'p-1',
    });
    const send = async (ref: string) => {
      const upload = await store.storefront.createProofUploadUrl({ slug, token: placed.token });
      return store.storefront.submitProof({
        slug,
        token: placed.token,
        method: 'gcash',
        referenceNo: ref,
        path: upload.path,
      });
    };
    for (const ref of ['1111 2222 3333', '4444 5555 6666', '7777 8888 9999']) {
      const pay = await send(ref);
      expect(pay.status).toBe('pending');
      await store.ownerOrders.reviewPayment({
        slug,
        orderId: placed.orderId,
        approve: false,
        rejectReason: 'Wrong amount',
      });
    }
    expect(await errorCode(send('1212 3434 5656'))).toBe('too_many_proofs');

    const other = await store.storefront.placeOrder({
      slug,
      payload: pickupPayload(await lines(store, slug)),
      clientKey: 'p-2',
    });
    const upload = await store.storefront.createProofUploadUrl({ slug, token: other.token });
    await store.storefront.submitProof({
      slug,
      token: other.token,
      method: 'gcash',
      referenceNo: '5555-0000-1111',
      path: upload.path,
    });
    const third = await store.storefront.placeOrder({
      slug,
      payload: pickupPayload(await lines(store, slug), {
        customer: { name: 'Ana', phone: '0917 222 3333', email: null },
      }),
      clientKey: 'p-3',
    });
    const up3 = await store.storefront.createProofUploadUrl({ slug, token: third.token });
    expect(
      await errorCode(
        store.storefront.submitProof({
          slug,
          token: third.token,
          method: 'gcash',
          referenceNo: '5555 0000 1111',
          path: up3.path,
        }),
      ),
    ).toBe('duplicate_reference');
  });

  it('COD over the limit → cod_limit; delivery out of range → out_of_range', async () => {
    const { store } = testStore(OPEN_MONDAY);
    const bucket = item(store, 'kanto-smash', 'Barkada Bucket');
    const dip =
      store.inspect('kanto-smash')?.shop.catalog.optionGroups.find((g) => g.name === 'Dips')
        ?.options[0]?.id ?? '';
    const pin = store.inspect('kanto-smash')?.shop.storefront.info.contact.pin ?? {
      lat: 0,
      lng: 0,
    };
    const near = { lat: pin.lat + 1 / 111.195, lng: pin.lng };
    const payload = pickupPayload(
      [
        {
          itemId: bucket.id,
          variantId: bucket.variants[0]?.id ?? '',
          optionIds: [dip],
          note: '',
          qty: 4,
        },
      ],
      {
        type: 'delivery',
        paymentMethod: 'cod',
        delivery: {
          spot: near,
          zoneId: null,
          addressLine: '1 Sample St.',
          houseNo: null,
          floor: null,
          landmark: null,
        },
      },
    );
    const q = await store.storefront.quoteOrder({ slug: 'kanto-smash', payload });
    expect(q.problems.map((p) => p.code)).toContain('cod_limit');
    expect(
      await errorCode(
        store.storefront.placeOrder({ slug: 'kanto-smash', payload, clientKey: 'cod-1' }),
      ),
    ).toBe('cod_limit');

    const kapePin = store.inspect('kape-juan')?.shop.storefront.info.contact.pin ?? {
      lat: 0,
      lng: 0,
    };
    const far = { lat: kapePin.lat + 8 / 111.195, lng: kapePin.lng };
    const farPayload = pickupPayload(await lines(store, 'kape-juan'), {
      type: 'delivery',
      paymentMethod: 'gcash',
      delivery: {
        spot: far,
        zoneId: null,
        addressLine: '1 Far St.',
        houseNo: null,
        floor: null,
        landmark: null,
      },
    });
    const farQuote = await store.storefront.quoteOrder({ slug: 'kape-juan', payload: farPayload });
    expect(farQuote.problems).toEqual([{ code: 'out_of_range', amount: null, km: 4 }]);
  });

  it('sold out today is back after the next opening (time travel)', async () => {
    const { store, clock } = testStore(OPEN_MONDAY);
    const rings = item(store, 'kanto-smash', 'Onion Rings');
    const payload = pickupPayload([
      { itemId: rings.id, variantId: rings.variants[0]?.id ?? '', optionIds: [], note: '', qty: 1 },
    ]);
    const before = await store.storefront.quoteOrder({ slug: 'kanto-smash', payload });
    expect(before.lines[0]?.problems.map((p) => p.code)).toEqual(['sold_out_today']);
    clock.now = new Date(mnl('2026-10-27 11:05'));
    const after = await store.storefront.quoteOrder({ slug: 'kanto-smash', payload });
    expect(after.lines[0]?.problems).toEqual([]);
  });

  it('steps only move forward and completing needs paid', async () => {
    const { store } = testStore(OPEN_MONDAY);
    const slug = 'kanto-smash';
    const placed = await store.storefront.placeOrder({
      slug,
      payload: pickupPayload(await lines(store, slug), { paymentMethod: 'cash' }),
      clientKey: 's-1',
    });
    expect(
      await errorCode(
        store.ownerOrders.advanceOrder({ slug, orderId: placed.orderId, toStatus: 'ready' }),
      ),
    ).toBe('invalid_transition');
    await store.ownerOrders.advanceOrder({ slug, orderId: placed.orderId, toStatus: 'preparing' });
    await store.ownerOrders.advanceOrder({ slug, orderId: placed.orderId, toStatus: 'ready' });
    expect(
      await errorCode(
        store.ownerOrders.advanceOrder({ slug, orderId: placed.orderId, toStatus: 'completed' }),
      ),
    ).toBe('not_paid');
    await store.ownerOrders.recordPayment({ slug, orderId: placed.orderId, method: 'cash' });
    const done = await store.ownerOrders.advanceOrder({
      slug,
      orderId: placed.orderId,
      toStatus: 'completed',
    });
    expect(done.status).toBe('completed');
  });

  it('at most 3 unpaid orders per phone per 30 minutes', async () => {
    const { store } = testStore(OPEN_MONDAY);
    const slug = 'kanto-smash';
    const payload = pickupPayload(await lines(store, slug), {
      customer: { name: 'Rico', phone: '0917 333 4444', email: null },
    });
    for (const key of ['u-1', 'u-2', 'u-3'])
      await store.storefront.placeOrder({ slug, payload, clientKey: key });
    expect(await errorCode(store.storefront.placeOrder({ slug, payload, clientKey: 'u-4' }))).toBe(
      'rate_limited',
    );
  });
});

describe('stamps and rewards', () => {
  it('reward quantity race: two claims for the last piece, one wins', async () => {
    const { store } = testStore(OPEN_MONDAY);
    const slug = 'tala-apparel';
    const card = store.inspect(slug)?.shop.storefront.stampCard;
    if (card) card.reward.quantityLeft = 1;
    const claims: string[] = [];
    for (const [email, phone] of [
      ['a.racer@example.com', '0917 111 0001'],
      ['b.racer@example.com', '0917 111 0002'],
    ] as const) {
      await signIn(store, email);
      await store.storefront.joinAsMember({ slug, name: email, phone });
      store
        .inspect(slug)
        ?.members.find((m) => m.email === email)
        ?.ledger.push({
          kind: 'given',
          delta: 5,
          reasonCategory: 'goodwill',
          orderNo: null,
          at: OPEN_MONDAY,
        });
      claims.push(await errorCode(store.storefront.claimReward({ slug })));
    }
    expect(claims).toEqual(['no error', 'reward_all_claimed']);
    expect(store.inspect(slug)?.shop.storefront.stampCard.reward.quantityLeft).toBe(0);
  });

  it('a paused card refuses claims and earns no stamps', async () => {
    const { store } = testStore(OPEN_MONDAY);
    const slug = 'tala-apparel';
    await signIn(store, 'paused@example.com');
    await store.storefront.joinAsMember({ slug, name: 'Paused', phone: '0917 111 0003' });
    store
      .inspect(slug)
      ?.members.find((m) => m.email === 'paused@example.com')
      ?.ledger.push({
        kind: 'given',
        delta: 5,
        reasonCategory: 'goodwill',
        orderNo: null,
        at: OPEN_MONDAY,
      });
    const card = store.inspect(slug)?.shop.storefront.stampCard;
    if (card) card.status = 'paused';
    expect(await errorCode(store.storefront.claimReward({ slug }))).toBe('reward_paused');
  });

  it('stamp daily cap: the second completed order today earns nothing', async () => {
    const { store } = testStore(OPEN_MONDAY);
    const slug = 'kanto-smash';
    await signIn(store, 'suki@example.com');
    await store.storefront.joinAsMember({ slug, name: 'Suki', phone: '0917 111 0004' });
    const classic = item(store, slug, 'Classic Smash');
    const double = classic.variants.find((v) => v.values[0] === 'Double')?.id ?? '';
    const payload = pickupPayload(
      [{ itemId: classic.id, variantId: double, optionIds: [], note: '', qty: 2 }],
      {
        paymentMethod: 'cash',
        customer: { name: 'Suki', phone: '0917 111 0004', email: 'suki@example.com' },
      },
    );
    for (const key of ['d-1', 'd-2']) {
      const placed = await store.storefront.placeOrder({ slug, payload, clientKey: key });
      for (const to of ['preparing', 'ready'] as const)
        await store.ownerOrders.advanceOrder({ slug, orderId: placed.orderId, toStatus: to });
      await store.ownerOrders.recordPayment({ slug, orderId: placed.orderId, method: 'cash' });
      await store.ownerOrders.advanceOrder({
        slug,
        orderId: placed.orderId,
        toStatus: 'completed',
      });
    }
    const account = await store.storefront.getMyAccount({ slug });
    expect(account?.history.filter((h) => h.kind === 'earned')).toHaveLength(1);
    expect(account?.balance).toBe(2);
  });
});

describe('samples', () => {
  it('clearSamples makes a demo shop look like test-blank', async () => {
    const { store } = testStore(OPEN_MONDAY);
    const cleared = await store.ownerSamples.clearSamples({ slug: 'kanto-smash' });
    const blank = TEST_SHOP_PACKS['test-blank'];
    expect(cleared.catalog).toEqual(blank.catalog);
    expect(cleared.storefront.look.banners).toEqual(blank.storefront.look.banners);
    expect(cleared.storefront.look.announcement).toBeNull();
    expect(cleared.storefront.info.logo).toBeNull();
    expect(cleared.storefront.stampCard.status).toBe(blank.storefront.stampCard.status);
    const restored = await store.ownerSamples.applySamplePack({
      slug: 'kanto-smash',
      packSlug: 'kanto-smash',
    });
    expect(restored.catalog.items).toHaveLength(18);
  });
});

describe('scenario switch', () => {
  it('is a no-op in production mode', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const before = getMockScenario();
    expect(readMockScenarioFromUrl(new URLSearchParams('mock=slow&as=member'), 'mock')).toBeNull();
    expect(getMockScenario()).toEqual(before);
    vi.unstubAllEnvs();
  });

  it('parses ?mock, ?as and ?now in dev', () => {
    const parsed = readMockScenarioFromUrl(
      new URLSearchParams('mock=closed&as=member-ready&now=2026-10-24T04:30%2B08:00'),
      'mock',
    );
    expect(parsed?.scenario).toEqual({
      closed: true,
      as: 'member-ready',
      now: '2026-10-23T20:30:00.000Z',
    });
    expect(readMockScenarioFromUrl(new URLSearchParams('mock=slow'), 'api')).toBeNull();
  });

  it('?as=member-ready gives the demo customer a ready reward', async () => {
    const { store } = testStore(OPEN_MONDAY, { as: 'member-ready' });
    const account = await store.storefront.getMyAccount({ slug: 'aqualinis' });
    expect(account?.rewardReady).toBe(true);
    const pending = testStore(OPEN_MONDAY, { as: 'member-pending' });
    expect(
      (await pending.store.storefront.getMyAccount({ slug: 'aqualinis' }))?.pendingStamps,
    ).toBe(1);
  });

  it('?mock=closed closes the shop for today; empty and error work', async () => {
    const closed = testStore(OPEN_MONDAY, { closed: true });
    const shop = PublicShopSchema.parse(
      await closed.store.storefront.getStorefront({ slug: 'kanto-smash' }),
    );
    expect(shop.storefront.closures.map((c) => c.date)).toContain('2026-10-26');
    const empty = testStore(OPEN_MONDAY, { empty: true });
    expect(
      (await empty.store.storefront.getStorefront({ slug: 'kanto-smash' }))?.catalog.items,
    ).toEqual([]);
    const error = testStore(OPEN_MONDAY, { fail: 'storefront' });
    expect(await errorCode(error.store.storefront.getStorefront({ slug: 'kanto-smash' }))).toBe(
      'unknown',
    );
  });

  it('test shops are only served outside production', async () => {
    const { store } = testStore(OPEN_MONDAY);
    expect(
      (await store.storefront.getStorefront({ slug: 'test-stress' }))?.catalog.items,
    ).toHaveLength(60);
  });
});
