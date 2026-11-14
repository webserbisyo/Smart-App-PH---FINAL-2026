import { describe, expect, it } from 'vitest';
import {
  CleanupPreviewSchema,
  DataExportSchema,
  MB,
  OwnerProfileSchema,
  OwnerSettingsSchema,
  PlanSchema,
  storageLevel,
  StorageSummarySchema,
} from '@smartapp/core';
import { setMockOwnerSlug } from '../src/mocks/store';
import { errorCode, mnl, testStore } from './helpers';

const START = mnl('2026-11-05 12:00');

function shopStore(slug: string, scenario = {}) {
  setMockOwnerSlug(slug);
  return testStore(START, scenario);
}

describe('ownerSettings mock adapter (T64 to T68)', () => {
  it('reads the whole Settings area and saves each section into the storefront', async () => {
    const { store } = shopStore('kanto-smash');
    const s = await store.ownerSettings.getSettings();
    expect(OwnerSettingsSchema.safeParse(s).success).toBe(true);
    expect(s.shop.name).toBe('Kanto Smash Burgers');

    await store.ownerSettings.saveShopFacts({
      name: 'Kanto Smash QC',
      contact: { ...s.shop.contact, pickupNote: 'Side window' },
    });
    const shop = await store.storefront.getStorefront({ slug: 'kanto-smash' });
    expect(shop?.storefront.info.name).toBe('Kanto Smash QC');
    expect(shop?.storefront.info.contact.pickupNote).toBe('Side window');

    expect(
      await errorCode(
        store.ownerSettings.saveShopFacts({
          name: 'Kanto',
          contact: { ...s.shop.contact, phone: '12' },
        }),
      ),
    ).toBe('invalid_input');
  });

  it('refuses overlapping hours, no order type and no way to pay', async () => {
    const { store } = shopStore('kanto-smash');
    const s = await store.ownerSettings.getSettings();
    expect(
      await errorCode(
        store.ownerSettings.saveHours({
          hours: [
            { day: 1, open: '09:00', close: '15:00' },
            { day: 1, open: '14:00', close: '18:00' },
          ],
          closures: [],
        }),
      ),
    ).toBe('hours_overlap');
    expect(
      await errorCode(
        store.ownerSettings.saveOrdering({ orderTypes: [], rules: s.ordering.rules }),
      ),
    ).toBe('last_order_type');
    expect(
      await errorCode(store.ownerSettings.savePayments({ payments: [], codMaxTotal: null })),
    ).toBe('last_payment_method');
    expect(
      await errorCode(
        store.ownerSettings.saveDelivery({
          ...s.delivery,
          distance: [
            { fromKm: 0, toKm: 3, fee: 4900, etaText: '30 min', minOrder: 0 },
            { fromKm: 4, toKm: 6, fee: 7900, etaText: '45 min', minOrder: 0 },
          ],
        }),
      ),
    ).toBe('invalid_input');

    const saved = await store.ownerSettings.saveOrdering({
      orderTypes: ['pickup'],
      rules: { ...s.ordering.rules, prepMinutes: 35 },
    });
    expect(saved.ordering.orderTypes).toEqual(['pickup']);
    expect((await store.ownerOrders.getBookingRules({ slug: 'kanto-smash' })).prepMinutes).toBe(35);
  });

  it('each demo shop tells its storage story', async () => {
    const expected: Record<string, [number, string]> = {
      aqualinis: [61, 'ok'],
      'kape-juan': [128, 'ok'],
      'kanto-smash': [212, 'ok'],
      'tala-apparel': [431, 'high'],
      'lola-remy': [486, 'almost'],
    };
    for (const [slug, [mb, level]] of Object.entries(expected)) {
      const { store } = shopStore(slug);
      const summary = await store.ownerSettings.getStorage();
      expect(StorageSummarySchema.safeParse(summary).success, slug).toBe(true);
      expect(Math.abs(summary.usedBytes / MB - mb), slug).toBeLessThan(mb * 0.1);
      expect(storageLevel(summary.usedBytes, summary.limitBytes), slug).toBe(level);
    }
  });

  it('a cleanup deletes only what its preview listed', async () => {
    const { store } = shopStore('lola-remy');
    const before = await store.ownerSettings.getStorage();
    const preview = await store.ownerSettings.previewCleanup({ kind: 'old_proofs' });
    expect(CleanupPreviewSchema.safeParse(preview).success).toBe(true);
    expect(preview.files).toBeGreaterThan(100);
    expect(preview.savedCopy).toBe(false);
    expect(
      await errorCode(store.ownerSettings.runCleanup({ kind: 'old_proofs', token: 'stale' })),
    ).toBe('cleanup_changed');
    const after = await store.ownerSettings.runCleanup({
      kind: 'old_proofs',
      token: preview.token,
    });
    expect(after.usedBytes).toBe(before.usedBytes - preview.bytes);
    expect(after.cleanups.find((c) => c.kind === 'old_proofs')?.files).toBe(0);
  });

  it('an export becomes ready, holds the proofs, then offers to delete them', async () => {
    const { store, clock } = shopStore('kanto-smash');
    const made = await store.ownerSettings.createExport({
      range: 'everything',
      parts: { orders: true, payments: true, proofs: true },
    });
    expect(made.status).toBe('preparing');
    clock.now = new Date(new Date(START).getTime() + 5_000);
    const ready = await store.ownerSettings.getExport({ id: made.id });
    expect(DataExportSchema.safeParse(ready).success).toBe(true);
    expect(ready.status).toBe('ready');
    expect(ready.proofFiles).toBeGreaterThan(100);
    const saved = await store.ownerSettings.previewCleanup({ kind: 'exported_proofs' });
    expect(saved.files).toBeGreaterThan(0);
    expect(saved.savedCopy).toBe(true);
    const oldProofs = await store.ownerSettings.previewCleanup({ kind: 'old_proofs' });
    expect(oldProofs.savedCopy).toBe(true);
  });

  it('a failed export says so (dev scenario)', async () => {
    const { store, clock } = shopStore('kanto-smash', { exportFails: true });
    const made = await store.ownerSettings.createExport({
      range: 'this_month',
      parts: { orders: true, payments: false, proofs: false },
    });
    clock.now = new Date(new Date(START).getTime() + 5_000);
    expect((await store.ownerSettings.getExport({ id: made.id })).status).toBe('failed');
  });

  it('full storage stops menu uploads but never proofs or plan receipts', async () => {
    const { store } = shopStore('kanto-smash', { storage: 'full' });
    expect(
      await errorCode(store.ownerCatalog.createUploadUrl({ kind: 'item', bytes: 200_000 })),
    ).toBe('storage_full');
    const receipt = await store.ownerCatalog.createUploadUrl({
      kind: 'plan_proof',
      bytes: 200_000,
    });
    expect(receipt.path).toContain('plan_proof');
  });

  it('uploads move the meter', async () => {
    const { store } = shopStore('aqualinis');
    const before = await store.ownerSettings.getStorage();
    await store.ownerCatalog.createUploadUrl({ kind: 'item', bytes: 180_000 });
    const after = await store.ownerSettings.getStorage();
    expect(after.usedBytes - before.usedBytes).toBe(180_000);
  });

  it('plan: trial shop, payment waits until Super Admin approves it (T88)', async () => {
    const { store } = shopStore('aqualinis');
    const plan = await store.ownerSettings.getPlan();
    expect(PlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.status).toBe('trial');
    expect(plan.sixMonthBonus).toBe(true);
    const sent = await store.ownerSettings.submitPlanPayment({
      months: 3,
      method: 'gcash',
      reference: '1023 456 789 012',
      proofPath: 'uploads/plan_proof/x.webp',
    });
    expect(sent.pending?.amount).toBe(119_700);
    expect(sent.pending?.proofUrl).toMatch(/^data:image\/svg/);
    expect(sent.thread.at(-1)?.kind).toBe('payment');
    expect(
      await errorCode(
        store.ownerSettings.submitPlanPayment({
          months: 1,
          method: 'maya',
          reference: '9999 456 789 012',
          proofPath: 'uploads/plan_proof/y.webp',
        }),
      ),
    ).toBe('payment_not_pending');
    // It never approves itself.
    expect((await store.ownerSettings.getPlan()).pending).not.toBeNull();
    const pendingId = sent.pending?.id ?? '';
    await store.platform.reviewPlanPayment({
      shopId: 'shop_aqualinis',
      paymentId: pendingId,
      verdict: 'approve',
      amount: null,
      amountReason: null,
    });
    const approved = await store.ownerSettings.getPlan();
    expect(approved.pending).toBeNull();
    expect(approved.status).toBe('active');
    expect(approved.paidUntil).toBe('2027-02-05');
    expect(approved.thread.at(-1)?.kind).toBe('approved');
  });

  it('plan: 6 months cost 5 with the bonus, and a note lands in the Billing chat', async () => {
    const { store } = shopStore('aqualinis');
    const sent = await store.ownerSettings.submitPlanPayment({
      months: 6,
      method: 'maya',
      reference: '5555 456 789 012',
      proofPath: 'uploads/plan_proof/z.webp',
    });
    expect(sent.pending?.amount).toBe(199_500);
    const noted = await store.ownerSettings.sendPlanNote({ text: 'Sent from my sister’s Maya' });
    expect(noted.thread.at(-1)).toMatchObject({ from: 'owner', kind: 'note' });
  });

  it('plan scenarios: due, overdue, paused', async () => {
    for (const [plan, status] of [
      ['due', 'due'],
      ['overdue', 'overdue'],
      ['paused', 'paused'],
    ] as const) {
      const { store } = shopStore('kanto-smash', { plan });
      expect((await store.ownerSettings.getPlan()).status).toBe(status);
    }
  });

  it('profile: a face uses no storage, a photo does; password code and emails', async () => {
    const { store } = shopStore('kape-juan');
    const profile = await store.ownerSettings.getProfile();
    expect(OwnerProfileSchema.safeParse(profile).success).toBe(true);
    await store.ownerSettings.saveProfile({
      name: 'Maria Santos',
      avatar: { kind: 'photo', ref: 'uploads/avatar/me.webp', bytes: 20_000 },
    });
    const withPhoto = await store.ownerSettings.getStorage();
    expect(withPhoto.kinds.find((k) => k.kind === 'profile')?.bytes).toBe(20_000);
    await store.ownerSettings.saveProfile({
      name: 'Maria Santos',
      avatar: { kind: 'face', style: 'pixel', face: 3, theme: 'mint' },
    });
    expect(
      (await store.ownerSettings.getStorage()).kinds.find((k) => k.kind === 'profile')?.bytes,
    ).toBe(0);

    const code = await store.ownerSettings.sendPasswordCode();
    expect(code.devCode).toBe('123456');
    expect(await errorCode(store.ownerSettings.sendPasswordCode())).toBe('rate_limited');
    expect(
      await errorCode(
        store.ownerSettings.resetPasswordWithCode({ code: '000000', newPassword: 'longenough' }),
      ),
    ).toBe('invalid_code');
    expect(
      await errorCode(
        store.ownerSettings.resetPasswordWithCode({ code: '123456', newPassword: 'short' }),
      ),
    ).toBe('weak_password');
    expect(
      await store.ownerSettings.resetPasswordWithCode({
        code: '123456',
        newPassword: 'longenough',
      }),
    ).toEqual({ ok: true });

    const prefs = await store.ownerSettings.getNotificationPrefs();
    const next = await store.ownerSettings.saveNotificationPrefs({ ...prefs, newOrder: false });
    expect(next.newOrder).toBe(false);
    expect(
      await errorCode(store.ownerSettings.saveNotificationPrefs({ ...prefs, email: 'nope' })),
    ).toBe('invalid_input');
  });
});
