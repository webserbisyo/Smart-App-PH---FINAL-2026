import { describe, expect, it } from 'vitest';
import {
  CounterChangeSchema,
  CustomerPageSchema,
  MemberDetailSchema,
  MembersOverviewSchema,
  OwnerClaimSchema,
  StampCardSettingsSchema,
} from '@smartapp/core';
import { setMockOwnerSlug } from '../src/mocks/store';
import { errorCode, mnl, testStore } from './helpers';

const START = mnl('2026-11-02 12:00');

function shopStore(slug: string) {
  setMockOwnerSlug(slug);
  return testStore(START);
}

const list = {
  filter: 'all',
  q: '',
  stamps: null,
  sort: 'last_order',
  cursor: 0,
  limit: 100,
} as const;

describe('ownerMembers mock adapter', () => {
  it('overview, list and detail parse and agree with each other', async () => {
    const { store } = shopStore('kanto-smash');
    const view = await store.ownerMembers.getMembersOverview();
    expect(MembersOverviewSchema.safeParse(view).success).toBe(true);
    expect(view.members).toBeGreaterThan(20);
    expect(view.guests).toBeGreaterThan(10);
    expect(view.progress.reduce((a, b) => a + b, 0)).toBe(view.members);
    expect(view.counts.all).toBe(view.members);
    expect(view.counts.ready).toBeGreaterThan(0);
    expect(view.counts.almost).toBeGreaterThan(0);
    expect(view.near.every((r) => r.segments.includes('almost'))).toBe(true);

    const page = await store.ownerMembers.listCustomers(list);
    expect(CustomerPageSchema.safeParse(page).success).toBe(true);
    expect(page.total).toBe(view.members);
    const guests = await store.ownerMembers.listCustomers({ ...list, filter: 'guests' });
    expect(guests.total).toBe(view.guests);
    expect(guests.rows.every((r) => !r.isMember && r.balance === 0)).toBe(true);

    const first = page.rows[0];
    if (!first) throw new Error('no member');
    const detail = await store.ownerMembers.getMember({ customerId: first.id });
    expect(MemberDetailSchema.safeParse(detail).success).toBe(true);
    expect(detail.history.reduce((sum, e) => sum + e.delta, 0)).toBe(detail.balance);
    expect(detail.visits).toBeGreaterThan(0);
  });

  it('the pulse adds up and moves with a counter stamp (T61, T63)', async () => {
    const { store } = shopStore('kape-juan');
    const view = await store.ownerMembers.getMembersOverview();
    const { pulse } = view;
    expect(pulse.joined).toBeGreaterThan(0);
    expect(pulse.stamps).toBeGreaterThan(0);
    expect(pulse.sales.members).toBeGreaterThan(0);
    expect(pulse.sales.guests).toBeGreaterThan(0);
    expect(pulse.top.length).toBeGreaterThan(0);
    expect(pulse.top.length).toBeLessThanOrEqual(5);
    expect(pulse.top.every((t) => t.row.isMember && t.visits > 0)).toBe(true);
    const visits = pulse.top.map((t) => t.visits);
    expect([...visits].sort((a, b) => b - a)).toEqual(visits);
    expect(pulse.activity.length).toBe(8);
    const times = pulse.activity.map((a) => a.at);
    expect([...times].sort().reverse()).toEqual(times);

    const id = view.near[0]?.id ?? '';
    await store.ownerMembers.giveStamp({ customerId: id, clientKey: 'p1', confirmRecent: false });
    const after = (await store.ownerMembers.getMembersOverview()).pulse;
    expect(after.stamps).toBe(pulse.stamps + 1);
    expect(after.activity[0]).toMatchObject({ kind: 'stamp', customerId: id, stamps: 1 });
  });

  it('a progress bar filters to members with exactly that many stamps', async () => {
    const { store } = shopStore('kanto-smash');
    const view = await store.ownerMembers.getMembersOverview();
    const goal = view.goal;
    const ready = await store.ownerMembers.listCustomers({ ...list, stamps: goal });
    expect(ready.total).toBe(view.progress[goal]);
    expect(ready.rows.every((r) => r.balance >= goal)).toBe(true);
  });

  it('search finds a member by name, mobile or exact code only (D7)', async () => {
    const { store } = shopStore('kanto-smash');
    const byName = await store.ownerMembers.listCustomers({ ...list, q: 'maria' });
    expect(byName.rows.map((r) => r.name)).toContain('Maria Santos');
    const byPhone = await store.ownerMembers.listCustomers({ ...list, q: '0917 000 2000' });
    expect(byPhone.rows[0]?.name).toBe('Maria Santos');
    const byCode = await store.ownerMembers.listCustomers({ ...list, q: 'ka4100' });
    expect(byCode.rows[0]?.memberCode).toBe('KA-4100');
    expect((await store.ownerMembers.listCustomers({ ...list, q: 'KA-4101' })).total).toBe(0);
    const found = await store.ownerMembers.findMember({ code: '4100' });
    expect(found.claimId).toBeNull();
    expect(await errorCode(store.ownerMembers.findMember({ code: '410' }))).toBe('not_found');
  });

  it('one tap stamps, a retry adds nothing, Undo cancels it and frees the daily change (D1, D2)', async () => {
    const { store, clock } = shopStore('kanto-smash');
    const id = (await store.ownerMembers.listCustomers(list)).rows[3]?.id ?? '';
    const before = await store.ownerMembers.getMember({ customerId: id });
    const change = await store.ownerMembers.giveStamp({
      customerId: id,
      clientKey: 'k1',
      confirmRecent: false,
    });
    expect(CounterChangeSchema.safeParse(change).success).toBe(true);
    expect(change.member.balance).toBe(before.balance + 1);
    expect(change.member.changesLeftToday).toBe(before.changesLeftToday - 1);
    const retry = await store.ownerMembers.giveStamp({
      customerId: id,
      clientKey: 'k1',
      confirmRecent: false,
    });
    expect(retry.member.balance).toBe(before.balance + 1);
    // A second tap within 2 minutes asks first.
    expect(
      await errorCode(
        store.ownerMembers.giveStamp({ customerId: id, clientKey: 'k2', confirmRecent: false }),
      ),
    ).toBe('stamp_recent');
    clock.now = new Date(clock.now.getTime() + 8_000);
    const undone = await store.ownerMembers.undoChange({ customerId: id, entryId: change.entryId });
    expect(undone.balance).toBe(before.balance);
    expect(undone.changesLeftToday).toBe(before.changesLeftToday);
    expect(undone.lastCounterStampAt).toBeNull();
    expect(undone.history.filter((e) => e.undone)).toHaveLength(2);
    expect(
      await errorCode(store.ownerMembers.undoChange({ customerId: id, entryId: change.entryId })),
    ).toBe('undo_expired');
  });

  it('Undo is refused after 15 seconds', async () => {
    const { store, clock } = shopStore('kanto-smash');
    const id = (await store.ownerMembers.listCustomers(list)).rows[4]?.id ?? '';
    const change = await store.ownerMembers.giveStamp({
      customerId: id,
      clientKey: 'u1',
      confirmRecent: false,
    });
    clock.now = new Date(clock.now.getTime() + 16_000);
    expect(
      await errorCode(store.ownerMembers.undoChange({ customerId: id, entryId: change.entryId })),
    ).toBe('undo_expired');
  });

  it('3 changes a day, never below 0, and a stopped card gives no stamps (M6, M1)', async () => {
    const { store, clock } = shopStore('kanto-smash');
    const rows = (await store.ownerMembers.listCustomers({ ...list, sort: 'stamps' })).rows;
    const id = rows[rows.length - 1]?.id ?? '';
    let detail = await store.ownerMembers.getMember({ customerId: id });
    for (let i = 0; i < detail.balance; i += 1) {
      if (detail.changesLeftToday === 0) break;
      detail = await store.ownerMembers.adjustStamps({
        customerId: id,
        delta: -1,
        reason: 'correction',
        note: null,
      });
    }
    if (detail.balance === 0 && detail.changesLeftToday > 0) {
      expect(
        await errorCode(
          store.ownerMembers.adjustStamps({
            customerId: id,
            delta: -1,
            reason: 'correction',
            note: null,
          }),
        ),
      ).toBe('stamps_insufficient');
    }
    while (detail.changesLeftToday > 0) {
      detail = await store.ownerMembers.adjustStamps({
        customerId: id,
        delta: 1,
        reason: 'goodwill',
        note: 'Birthday',
      });
      clock.now = new Date(clock.now.getTime() + 1000);
    }
    expect(
      await errorCode(
        store.ownerMembers.giveStamp({ customerId: id, clientKey: 'cap', confirmRecent: true }),
      ),
    ).toBe('stamp_cap_reached');
    expect(detail.history[0]?.note).toBe('Birthday');

    await store.ownerMembers.setStampCardStatus({ status: 'paused' });
    const other = rows[0]?.id ?? '';
    expect(
      await errorCode(
        store.ownerMembers.giveStamp({ customerId: other, clientKey: 'p', confirmRecent: false }),
      ),
    ).toBe('stamp_card_off');
  });

  it('uses a ready reward at the counter, even while paused (D3, M1)', async () => {
    const { store } = shopStore('kanto-smash');
    const ready = (await store.ownerMembers.listCustomers({ ...list, filter: 'ready' })).rows[0];
    if (!ready) throw new Error('no ready member');
    await store.ownerMembers.setStampCardStatus({ status: 'paused' });
    const used = await store.ownerMembers.useReward({ customerId: ready.id, clientKey: 'r1' });
    expect(used.member.balance).toBe(ready.balance - ready.goal);
    expect(used.member.history[0]?.kind).toBe('used');
    const again = await store.ownerMembers.useReward({ customerId: ready.id, clientKey: 'r1' });
    expect(again.member.balance).toBe(used.member.balance);
    expect(
      await errorCode(store.ownerMembers.useReward({ customerId: ready.id, clientKey: 'r2' })),
    ).toBe('stamps_insufficient');
  });

  it('a prize claim holds its piece; give and cancel work, cancel returns stamps and the piece (M7, D8)', async () => {
    const { store } = shopStore('kape-juan');
    const card = await store.ownerMembers.getStampCard();
    expect(card.reward.kind).toBe('custom');
    const claims = await store.ownerMembers.listRewardClaims();
    expect(claims.every((c) => OwnerClaimSchema.safeParse(c).success)).toBe(true);
    const held = (card.reward.quantityTotal ?? 0) - (card.reward.quantityLeft ?? 0);
    expect(held).toBe(claims.filter((c) => c.status !== 'cancelled').length);
    const pending = claims.filter((c) => c.status === 'pending');
    expect(pending.length).toBeGreaterThanOrEqual(2);
    const [a, b] = pending;
    if (!a || !b) throw new Error('no claims');
    expect(claims[0]?.status).toBe('pending');

    const found = await store.ownerMembers.findMember({ code: a.code.toLowerCase() });
    expect(found).toEqual({ customerId: a.customerId, claimId: a.id });
    expect((await store.ownerMembers.giveClaim({ claimId: a.id })).status).toBe('given');
    expect(await errorCode(store.ownerMembers.giveClaim({ claimId: a.id }))).toBe(
      'claim_not_pending',
    );

    const memberBefore = await store.ownerMembers.getMember({ customerId: b.customerId });
    const cancelled = await store.ownerMembers.cancelClaim({ claimId: b.id, reason: 'no_show' });
    expect(cancelled.cancelReason).toBe('no_show');
    const memberAfter = await store.ownerMembers.getMember({ customerId: b.customerId });
    expect(memberAfter.balance).toBe(memberBefore.balance + card.rule.stampsNeeded);
    expect(memberAfter.history[0]?.kind).toBe('returned');
    const after = await store.ownerMembers.getStampCard();
    expect(after.reward.quantityLeft).toBe((card.reward.quantityLeft ?? 0) + 1);
  });

  it('pieces can be added but never set below what claims hold (M7)', async () => {
    const { store } = shopStore('tala-apparel');
    const card = await store.ownerMembers.getStampCard();
    const held = (card.reward.quantityTotal ?? 0) - (card.reward.quantityLeft ?? 0);
    const more = await store.ownerMembers.saveStampCard({
      ...card,
      reward: { ...card.reward, quantityTotal: (card.reward.quantityTotal ?? 0) + 10 },
    });
    expect(more.reward.quantityLeft).toBe((card.reward.quantityLeft ?? 0) + 10);
    expect(
      await errorCode(
        store.ownerMembers.saveStampCard({
          ...card,
          reward: { ...card.reward, quantityTotal: held - 1 },
        }),
      ),
    ).toBe('invalid_input');
    expect(StampCardSettingsSchema.safeParse(more).success).toBe(true);
  });

  it('previews a goal change both ways (M9)', async () => {
    const { store } = shopStore('tala-apparel');
    const card = await store.ownerMembers.getStampCard();
    const view = await store.ownerMembers.getMembersOverview();
    const up = await store.ownerMembers.previewStampCardChange({
      ...card,
      rule: { ...card.rule, stampsNeeded: card.rule.stampsNeeded + 1 },
    });
    expect(up.loseReady).toBe(view.progress[card.rule.stampsNeeded]);
    expect(up.readyNow).toBe(0);
    const down = await store.ownerMembers.previewStampCardChange({
      ...card,
      rule: { ...card.rule, stampsNeeded: card.rule.stampsNeeded - 1 },
    });
    expect(down.readyNow).toBe(view.progress[card.rule.stampsNeeded - 1]);
  });

  it('the prize item cannot be hidden or removed while it is the prize (M10)', async () => {
    const { store } = shopStore('kanto-smash');
    const card = await store.ownerMembers.getStampCard();
    const itemId = card.reward.itemId ?? '';
    expect(
      await errorCode(store.ownerCatalog.setItemStatus({ id: itemId, status: 'archived' })),
    ).toBe('item_is_reward');
    expect(
      await errorCode(store.ownerCatalog.setItemStatus({ id: itemId, status: 'hidden' })),
    ).toBe('item_is_reward');
  });

  it('notes save trimmed and empty clears', async () => {
    const { store } = shopStore('kanto-smash');
    const id = (await store.ownerMembers.listCustomers(list)).rows[0]?.id ?? '';
    expect(
      (await store.ownerMembers.saveMemberNote({ customerId: id, note: '  less ice ' })).note,
    ).toBe('less ice');
    expect(
      (await store.ownerMembers.saveMemberNote({ customerId: id, note: '   ' })).note,
    ).toBeNull();
  });

  it('guests have no stamp actions and the Empty switch shows no one', async () => {
    const { store } = shopStore('kanto-smash');
    const guest = (await store.ownerMembers.listCustomers({ ...list, filter: 'guests' })).rows[0];
    if (!guest) throw new Error('no guest');
    expect(
      await errorCode(
        store.ownerMembers.giveStamp({
          customerId: guest.id,
          clientKey: 'g',
          confirmRecent: false,
        }),
      ),
    ).toBe('not_found');
    const empty = testStore(START, { empty: true }).store;
    expect((await empty.ownerMembers.getMembersOverview()).members).toBe(0);
  });
});
