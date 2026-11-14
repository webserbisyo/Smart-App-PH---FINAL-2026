import { describe, expect, it } from 'vitest';
import {
  AdminShopListSchema,
  AdminTodaySchema,
  TrackingSummarySchema,
  type SupportSession,
} from '@smartapp/core';
import { setMockOwnerSlug, setMockSupportSession } from '../src/mocks/store';
import { errorCode, mnl, testStore } from './helpers';

const START = mnl('2026-11-13 12:00');

function store(scenario = {}) {
  setMockOwnerSlug('kanto-smash');
  setMockSupportSession(null);
  return testStore(START, scenario).store;
}

describe('Super Admin mock (T88 to T92)', () => {
  it('Today lists what needs the founder, with numbers that add up', async () => {
    const s = store();
    const today = await s.platform.getAdminToday();
    expect(AdminTodaySchema.safeParse(today).success).toBe(true);
    const kinds = today.needs.map((n) => n.kind);
    expect(kinds).toContain('payment');
    expect(kinds).toContain('go_live');
    expect(kinds).toContain('tracking_failed');
    expect(kinds[0]).toBe('payment');
    expect(today.funnel.visits).toBeGreaterThanOrEqual(today.funnel.leads);
    expect(today.funnel.leads).toBeGreaterThanOrEqual(today.funnel.signedUp);
    expect(today.funnel.signedUp).toBeGreaterThanOrEqual(today.funnel.live);
    expect(today.payingShops).toBeLessThanOrEqual(today.liveShops);
  });

  it('chips count shops, search finds an owner, leads are their own list', async () => {
    const s = store();
    const all = await s.platform.listAdminShops({ filter: 'all' });
    expect(AdminShopListSchema.safeParse(all).success).toBe(true);
    expect(all.rows).toHaveLength(20);
    expect(all.counts.leads).toBe(6);
    const found = await s.platform.listAdminShops({ filter: 'all', q: 'paolo' });
    expect(found.rows.map((r) => r.slug)).toEqual(['kanto-smash']);
    const asked = await s.platform.listAdminShops({ filter: 'setting_up' });
    expect(asked.rows.length).toBe(5);
  });

  it('approve to go live starts the trial then; a payment needs approving, a reject says why', async () => {
    const s = store();
    const { rows } = await s.platform.listAdminShops({ filter: 'needs_you' });
    const waiting = rows.find((r) => r.stage === 'asked');
    expect(waiting).toBeDefined();
    const live = await s.platform.approveGoLive({ shopId: waiting?.id ?? '' });
    expect(live.stage).toBe('live');
    expect(live.planStatus).toBe('trial');
    expect(live.trialEndsAt).toBe(
      new Date(new Date(START).getTime() + 14 * 86_400_000).toISOString(),
    );
    expect(live.thread.at(-1)?.kind).toBe('live');

    const paying = rows.find((r) => r.pending !== null);
    const pending = paying?.pending;
    expect(pending).toBeTruthy();
    expect(
      await errorCode(
        s.platform.reviewPlanPayment({
          shopId: paying?.id ?? '',
          paymentId: pending?.id ?? '',
          verdict: 'approve',
          amount: 100,
          amountReason: null,
        }),
      ),
    ).toBe('invalid_input');
    const rejected = await s.platform.reviewPlanPayment({
      shopId: paying?.id ?? '',
      paymentId: pending?.id ?? '',
      verdict: 'reject',
      reason: 'unreadable',
    });
    expect(rejected.pending).toBeNull();
    expect(rejected.thread.at(-1)).toMatchObject({ kind: 'rejected', reason: 'unreadable' });
  });

  it('record a payment, extra days, close at the period end, delete only with the name', async () => {
    const s = store();
    const { rows } = await s.platform.listAdminShops({ filter: 'overdue' });
    const late = rows[0];
    expect(late).toBeDefined();
    const paid = await s.platform.recordPlanPayment({
      shopId: late?.id ?? '',
      months: 1,
      method: 'cash',
      reference: 'CASH-1113',
      amount: 39_900,
      note: 'Paid at the bazaar',
    });
    expect(paid.planStatus).toBe('active');
    expect(paid.activity[0]?.kind).toBe('payment_recorded');
    expect(paid.activity[0]?.events).toContain('Purchase');

    const more = await s.platform.extendPlan({
      shopId: late?.id ?? '',
      days: 7,
      reason: 'Typhoon week',
    });
    expect(more.paidUntil).not.toBe(paid.paidUntil);

    const closing = await s.platform.closeShop({
      shopId: late?.id ?? '',
      reason: 'owner_asked',
      when: 'period_end',
      note: null,
    });
    expect(closing.stage).toBe('live');
    expect(closing.closesOn).toBe(more.paidUntil);

    const closed = (await s.platform.listAdminShops({ filter: 'closed' })).rows[0];
    expect(
      await errorCode(s.platform.deleteShop({ shopId: closed?.id ?? '', confirmName: 'nope' })),
    ).toBe('name_mismatch');
    await s.platform.deleteShop({ shopId: closed?.id ?? '', confirmName: closed?.name ?? '' });
    expect((await s.platform.listAdminShops({ filter: 'closed' })).rows).toHaveLength(0);
  });

  it('help mode locks plan payments and the password while it lasts (T91)', async () => {
    const s = store();
    const session: SupportSession = await s.platform.startSupport({
      shopId: 'shop_kanto-smash',
      reason: 'set_up',
    });
    setMockSupportSession(session);
    expect(
      await errorCode(
        s.ownerSettings.submitPlanPayment({
          months: 1,
          method: 'gcash',
          reference: '1234 567 890',
          proofPath: 'uploads/plan_proof/a.webp',
        }),
      ),
    ).toBe('support_locked');
    expect((await s.onboarding.getOnboarding()).helpedNow).toBe(true);
    const shop = await s.platform.getAdminShop({ shopId: 'shop_kanto-smash' });
    expect(shop.activity[0]).toMatchObject({ kind: 'support', minutes: 60, reason: 'set_up' });
    await s.platform.endSupport();
    setMockSupportSession(null);
    expect((await s.onboarding.getOnboarding()).helpedNow).toBe(false);
  });

  it('owner side: ask to go live needs the 4 steps, then shows on Today', async () => {
    const s = store({ stage: 'setting_up' });
    const before = await s.onboarding.getOnboarding();
    expect(before.stage).toBe('setting_up');
    const asked = await s.onboarding.askToGoLive();
    expect(asked.stage).toBe('asked');
    const today = await s.platform.getAdminToday();
    expect(
      today.needs.some((n) => n.kind === 'go_live' && n.shopName === 'Kanto Smash Burgers'),
    ).toBe(true);
  });

  it('tracking: switching off skips events; Retry clears failures; a lead is logged with a masked phone', async () => {
    const s = store();
    const t0 = await s.platform.getTracking();
    expect(TrackingSummarySchema.safeParse(t0).success).toBe(true);
    expect(t0.failed).toBe(2);
    const retried = await s.platform.retryTrackEvents();
    expect(retried.failed).toBe(0);
    await s.platform.setTracking({ sending: false, testMode: false });
    await s.onboarding.saveSignupLead({
      fullName: 'Ana Reyes',
      email: 'ana@example.com',
      phone: '+639171112222',
      termsVersion: '2026-11',
      source: { channel: 'facebook_ad', campaign: 'nov-launch-food' },
      eventId: 'lead:test-0001',
      fbp: null,
      fbc: null,
      pageUrl: 'https://app.webserbisyo.com/signup',
    });
    const after = await s.platform.getTracking();
    expect(after.events[0]).toMatchObject({
      name: 'Lead',
      status: 'skipped',
      subject: '0917 ••• 2222',
    });
    const leads = await s.platform.listLeads();
    expect(leads[0]?.fullName).toBe('Ana Reyes');
  });
});
