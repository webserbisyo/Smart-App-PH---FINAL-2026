import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  distanceRowProblems,
  hoursProblems,
  normalisePhPhone,
  NotificationPrefsSchema,
  OrderTypeEnum,
  OwnerAvatarSchema,
  OwnerProfileSchema,
  OwnerSettingsSchema,
  PaymentAccountsSchema,
  ShopKindEnum,
  startingAvatar,
  type DeliverySettings,
  type HoursSettings,
  type NotificationPrefs,
  type OrderType,
  type OrderingSettings,
  type OwnerProfile,
  type OwnerSettings,
  type PaymentSettings,
  type SaveProfileInput,
  type ShopFacts,
} from '@smartapp/core';
import { and, asc, count, eq, gte, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import type { CallerUser } from '../auth/caller.js';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import {
  closures,
  deliveryDistanceRows,
  deliveryZones,
  openingHours,
  orders,
  paymentAccounts,
  profiles,
  shopSettings,
  tenantMembers,
  tenants,
} from '../db/generated/schema.js';
import { MediaService } from '../media/media.service.js';

// Orders still to come (Settings warns what stays booked when an order type goes off).
const OPEN_STATUSES = ['placed', 'preparing', 'ready', 'out_for_delivery'];
const TRANSFER_METHODS = ['gcash', 'maya', 'bank', 'qr_ph'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "09:00:00" from Postgres to our "09:00". */
function clock(value: string): string {
  return value.slice(0, 5);
}

/** Delivery rows are whole metres in the database and km on screen (X5): 2.5 km is 2500 m. */
function metres(km: number): number {
  return Math.round(km * 1000);
}

function km(m: number): number {
  return m / 1000;
}

function fieldErrors(entries: Iterable<[string, string]>): Record<string, string[]> {
  return Object.fromEntries([...entries].map(([key, problem]) => [key, [problem]]));
}

/**
 * Settings (api.md "Settings (owner)", T64 to T68): one read for the whole area, one save per section, each
 * in the request's transaction, each answering the whole read again. The shop is the request's shop (RLS);
 * nothing here takes a shop id from the browser.
 */
@Injectable()
export class SettingsService {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async getSettings(): Promise<OwnerSettings> {
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    const [shop] = await tx
      .select({
        slug: tenants.slug,
        name: tenants.name,
        kind: tenants.kind,
        isDemo: tenants.isDemo,
      })
      .from(tenants)
      .where(eq(tenants.id, shopId));
    const [s] = await tx.select().from(shopSettings).where(eq(shopSettings.tenantId, shopId));
    if (!shop || !s) throw notFound();

    const hours = await tx
      .select({ day: openingHours.weekday, open: openingHours.opens, close: openingHours.closes })
      .from(openingHours)
      .where(eq(openingHours.tenantId, shopId))
      .orderBy(asc(openingHours.weekday), asc(openingHours.opens));
    // Past days off no longer matter; the list is today onwards (Manila).
    const daysOff = await tx
      .select({ date: closures.date, reason: closures.reason })
      .from(closures)
      .where(
        and(
          eq(closures.tenantId, shopId),
          gte(closures.date, sql`(now() at time zone 'Asia/Manila')::date`),
        ),
      )
      .orderBy(asc(closures.date));
    const distance = await tx
      .select()
      .from(deliveryDistanceRows)
      .where(eq(deliveryDistanceRows.tenantId, shopId))
      .orderBy(asc(deliveryDistanceRows.fromM));
    const zones = await tx
      .select()
      .from(deliveryZones)
      .where(eq(deliveryZones.tenantId, shopId))
      .orderBy(asc(deliveryZones.sort), asc(deliveryZones.createdAt));
    const accounts = await tx
      .select()
      .from(paymentAccounts)
      .where(and(eq(paymentAccounts.tenantId, shopId), isNull(paymentAccounts.removedAt)))
      .orderBy(asc(paymentAccounts.sort), asc(paymentAccounts.createdAt));
    const booked = await tx
      .select({ type: orders.type, n: count() })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, shopId),
          inArray(orders.type, ['pickup', 'delivery']),
          inArray(orders.status, OPEN_STATUSES),
          sql`${orders.dueAt} > now()`,
        ),
      )
      .groupBy(orders.type);

    // Checked by OwnerSettingsSchema below, like every other part of the answer.
    const payments: unknown[] = [];
    for (const a of accounts) {
      payments.push({
        id: a.id,
        method: a.method,
        bank: a.bank,
        accountName: a.accountName,
        accountNumber: a.accountNumber,
        qr: await this.media.refById(a.qrMediaId),
        sample: a.isSample,
      });
    }

    const orderTypes: OrderType[] = [];
    if (s.walkInOn) orderTypes.push('walk_in');
    if (s.pickupOn) orderTypes.push('pickup');
    if (s.deliveryOn) orderTypes.push('delivery');

    return OwnerSettingsSchema.parse({
      slug: shop.slug,
      kind: ShopKindEnum.parse(shop.kind),
      isDemo: shop.isDemo,
      shop: {
        name: shop.name,
        contact: {
          phone: s.phone,
          messengerUsername: s.messengerUsername,
          facebookUrl: s.facebookUrl,
          googleReviewUrl: s.googleReviewUrl,
          address: s.address,
          showAddress: s.showAddress,
          pin: s.pinLat !== null && s.pinLng !== null ? { lat: s.pinLat, lng: s.pinLng } : null,
          pickupNote: s.pickupNote,
        },
      },
      hours: {
        hours: hours.map((h) => ({ day: h.day, open: clock(h.open), close: clock(h.close) })),
        closures: daysOff,
      },
      ordering: {
        orderTypes,
        rules: {
          daysAhead: s.daysAhead,
          slotMinutes: s.slotMinutes,
          ordersPerSlot: s.ordersPerSlot,
          prepMinutes: s.prepMinutes,
          takeOrdersWhileClosed: s.takeOrdersWhileClosed,
        },
      },
      delivery: {
        distance: distance.map((r) => ({
          fromKm: km(r.fromM),
          toKm: km(r.toM),
          fee: r.fee,
          etaText: r.etaText,
          minOrder: r.minOrder,
        })),
        zones: zones.map((z) => ({ id: z.id, name: z.name, fee: z.fee, etaText: z.etaText })),
        freeDeliveryFrom: s.freeDeliveryFrom,
      },
      payments: { payments, codMaxTotal: s.codMaxTotal },
      booked: {
        pickup: booked.find((b) => b.type === 'pickup')?.n ?? 0,
        delivery: booked.find((b) => b.type === 'delivery')?.n ?? 0,
      },
    });
  }

  async saveShopFacts(input: ShopFacts): Promise<OwnerSettings> {
    const shopId = this.db.shopId;
    const c = input.contact;
    if (c.phone && !normalisePhPhone(c.phone).ok) {
      throw new ApiFailure('invalid_input', 400, { phone: ['invalid'] });
    }
    await this.db.tx
      .update(tenants)
      .set({ name: input.name, updatedAt: sql`now()` })
      .where(eq(tenants.id, shopId));
    await this.db.tx
      .update(shopSettings)
      .set({
        phone: c.phone,
        messengerUsername: c.messengerUsername,
        facebookUrl: c.facebookUrl,
        googleReviewUrl: c.googleReviewUrl,
        address: c.address,
        showAddress: c.showAddress,
        pinLat: c.pin?.lat ?? null,
        pinLng: c.pin?.lng ?? null,
        pickupNote: c.pickupNote,
        updatedAt: sql`now()`,
      })
      .where(eq(shopSettings.tenantId, shopId));
    return this.getSettings();
  }

  /** Opening hours and days off replace the old ones; overlaps answer hours_overlap per row. */
  async saveHours(input: HoursSettings): Promise<OwnerSettings> {
    const shopId = this.db.shopId;
    const problems = hoursProblems(input.hours);
    if (problems.size > 0) {
      throw new ApiFailure(
        'hours_overlap',
        400,
        fieldErrors([...problems].map(([i, p]) => [`hours.${i}`, p])),
      );
    }
    await this.db.tx.delete(openingHours).where(eq(openingHours.tenantId, shopId));
    if (input.hours.length > 0) {
      await this.db.tx.insert(openingHours).values(
        input.hours.map((h) => ({
          tenantId: shopId,
          weekday: h.day,
          opens: h.open,
          closes: h.close,
        })),
      );
    }
    // The same day twice keeps the first; past days are kept as they were.
    const byDate = new Map<string, (typeof input.closures)[number]>();
    for (const day of input.closures) if (!byDate.has(day.date)) byDate.set(day.date, day);
    const daysOff = [...byDate.values()];
    await this.db.tx
      .delete(closures)
      .where(
        and(
          eq(closures.tenantId, shopId),
          gte(closures.date, sql`(now() at time zone 'Asia/Manila')::date`),
        ),
      );
    if (daysOff.length > 0) {
      await this.db.tx
        .insert(closures)
        .values(daysOff.map((d) => ({ tenantId: shopId, date: d.date, reason: d.reason })))
        .onConflictDoUpdate({
          target: [closures.tenantId, closures.date],
          set: { reason: sql`excluded.reason` },
        });
    }
    return this.getSettings();
  }

  async saveOrdering(input: OrderingSettings): Promise<OwnerSettings> {
    const types = new Set(input.orderTypes.map((t) => OrderTypeEnum.parse(t)));
    if (types.size === 0) throw new ApiFailure('last_order_type', 400);
    await this.db.tx
      .update(shopSettings)
      .set({
        walkInOn: types.has('walk_in'),
        pickupOn: types.has('pickup'),
        deliveryOn: types.has('delivery'),
        daysAhead: input.rules.daysAhead,
        slotMinutes: input.rules.slotMinutes,
        ordersPerSlot: input.rules.ordersPerSlot,
        prepMinutes: input.rules.prepMinutes,
        takeOrdersWhileClosed: input.rules.takeOrdersWhileClosed,
        updatedAt: sql`now()`,
      })
      .where(eq(shopSettings.tenantId, this.db.shopId));
    return this.getSettings();
  }

  /**
   * Distance rows are replaced (km to whole metres, X5). Zones keep their ids, so an order that went to a
   * zone still knows it; a zone that is gone leaves its orders without one (the key sets it to null).
   */
  async saveDelivery(input: DeliverySettings): Promise<OwnerSettings> {
    const shopId = this.db.shopId;
    const problems = distanceRowProblems(input.distance);
    if (problems.size > 0) {
      throw new ApiFailure(
        'invalid_input',
        400,
        fieldErrors([...problems].map(([i, p]) => [`distance.${i}`, p])),
      );
    }
    await this.db.tx.delete(deliveryDistanceRows).where(eq(deliveryDistanceRows.tenantId, shopId));
    if (input.distance.length > 0) {
      await this.db.tx.insert(deliveryDistanceRows).values(
        input.distance.map((r) => ({
          tenantId: shopId,
          fromM: metres(r.fromKm),
          toM: metres(r.toKm),
          fee: r.fee,
          etaText: r.etaText,
          minOrder: r.minOrder,
        })),
      );
    }

    const existing = await this.db.tx.select({ id: deliveryZones.id }).from(deliveryZones);
    const known = new Set(existing.map((z) => z.id));
    const keep: string[] = [];
    for (const [sort, zone] of input.zones.entries()) {
      if (known.has(zone.id)) {
        keep.push(zone.id);
        await this.db.tx
          .update(deliveryZones)
          .set({ name: zone.name, fee: zone.fee, etaText: zone.etaText, sort })
          .where(eq(deliveryZones.id, zone.id));
      } else {
        const id = randomUUID();
        keep.push(id);
        await this.db.tx.insert(deliveryZones).values({
          id,
          tenantId: shopId,
          name: zone.name,
          fee: zone.fee,
          etaText: zone.etaText,
          sort,
        });
      }
    }
    await this.db.tx
      .delete(deliveryZones)
      .where(
        keep.length > 0
          ? and(eq(deliveryZones.tenantId, shopId), notInArray(deliveryZones.id, keep))
          : eq(deliveryZones.tenantId, shopId),
      );
    await this.db.tx
      .update(shopSettings)
      .set({ freeDeliveryFrom: input.freeDeliveryFrom, updatedAt: sql`now()` })
      .where(eq(shopSettings.tenantId, shopId));
    return this.getSettings();
  }

  /**
   * Ways to pay. An account keeps its id when edited (orders and Home know which account was paid); one the
   * owner removed is kept as removed, because old orders point at it. A new account gets a new id (a sample
   * id like "gcash-1" from the screen is new). The QR must be one of this shop's confirmed QR uploads.
   */
  async savePayments(input: PaymentSettings): Promise<OwnerSettings> {
    const shopId = this.db.shopId;
    if (input.payments.length === 0) throw new ApiFailure('last_payment_method', 400);
    const parsed = PaymentAccountsSchema.safeParse(input.payments);
    if (!parsed.success) throw new ApiFailure('invalid_input', 400);
    const missing = parsed.data.filter(
      (p) => TRANSFER_METHODS.includes(p.method) && (!p.accountName || !p.accountNumber),
    );
    if (missing.length > 0) {
      throw new ApiFailure(
        'invalid_input',
        400,
        fieldErrors(missing.map((p) => [p.id, 'missing'])),
      );
    }

    const qrIds = new Map<string, string | null>();
    const badQr: [string, string][] = [];
    for (const p of parsed.data) {
      if (!p.qr || p.method === 'cash' || p.method === 'cod') {
        qrIds.set(p.id, null);
        continue;
      }
      const file = await this.media.fileOf(p.qr, ['qr']);
      if (file) qrIds.set(p.id, file.id);
      else badQr.push([`${p.id}.qr`, 'invalid']);
    }
    if (badQr.length > 0) throw new ApiFailure('invalid_input', 400, fieldErrors(badQr));

    const current = await this.db.tx
      .select({ id: paymentAccounts.id })
      .from(paymentAccounts)
      .where(isNull(paymentAccounts.removedAt));
    const known = new Set(current.map((a) => a.id));
    const kept = parsed.data.filter((p) => UUID.test(p.id) && known.has(p.id)).map((p) => p.id);

    // Removed first, so a new account of the same way to pay fits the one-per-way rule.
    await this.db.tx
      .update(paymentAccounts)
      .set({ removedAt: sql`now()` })
      .where(
        kept.length > 0
          ? and(isNull(paymentAccounts.removedAt), notInArray(paymentAccounts.id, kept))
          : isNull(paymentAccounts.removedAt),
      );
    for (const [sort, p] of parsed.data.entries()) {
      const values = {
        method: p.method,
        bank: p.bank,
        accountName: p.method === 'cash' || p.method === 'cod' ? null : p.accountName,
        accountNumber: p.method === 'cash' || p.method === 'cod' ? null : p.accountNumber,
        qrMediaId: qrIds.get(p.id) ?? null,
        sort,
      };
      if (kept.includes(p.id)) {
        await this.db.tx.update(paymentAccounts).set(values).where(eq(paymentAccounts.id, p.id));
      } else {
        await this.db.tx.insert(paymentAccounts).values({ ...values, tenantId: shopId });
      }
    }
    await this.db.tx
      .update(shopSettings)
      .set({ codMaxTotal: input.codMaxTotal, updatedAt: sql`now()` })
      .where(eq(shopSettings.tenantId, shopId));
    return this.getSettings();
  }

  // ---------- the owner ----------

  async getProfile(user: CallerUser): Promise<OwnerProfile> {
    const [row] = await this.db.tx
      .select({ fullName: profiles.fullName, avatar: profiles.avatar })
      .from(profiles)
      .where(eq(profiles.id, user.id));
    const name = row?.fullName ?? user.fullName ?? user.email.split('@')[0] ?? 'Owner';
    const avatar = OwnerAvatarSchema.safeParse(row?.avatar);
    return OwnerProfileSchema.parse({
      name,
      email: user.email,
      avatar: avatar.success ? avatar.data : startingAvatar(name),
    });
  }

  /** A photo must be one of the shop's confirmed avatar uploads; its size comes from the file (T68). */
  async saveProfile(user: CallerUser, input: SaveProfileInput): Promise<OwnerProfile> {
    let avatar = input.avatar;
    if (avatar.kind === 'photo') {
      // The profile route needs no shop; a photo is a file of the owner's shop, so the shop is looked up here.
      const [member] = await this.db.tx
        .select({ tenantId: tenantMembers.tenantId })
        .from(tenantMembers)
        .where(eq(tenantMembers.userId, user.id))
        .limit(1);
      if (member) await this.db.useShop(member.tenantId);
      const file = member ? await this.media.fileOf(avatar.ref, ['avatar']) : null;
      if (!file) throw new ApiFailure('invalid_input', 400, { avatar: ['invalid'] });
      avatar = { kind: 'photo', ref: this.media.refOf(file.bucket, file.path), bytes: file.bytes };
    }
    await this.db.tx
      .update(profiles)
      .set({ fullName: input.name, avatar, updatedAt: sql`now()` })
      .where(eq(profiles.id, user.id));
    return this.getProfile(user);
  }

  // ---------- emails to the owner ----------

  async getNotificationPrefs(user: CallerUser): Promise<NotificationPrefs> {
    const [m] = await this.db.tx
      .select()
      .from(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, this.db.shopId), eq(tenantMembers.userId, user.id)));
    if (!m) throw notFound();
    return NotificationPrefsSchema.parse({
      newOrder: m.notifyNewOrder,
      paymentToCheck: m.notifyPaymentToCheck,
      storage: m.notifyStorage,
      planPayment: m.notifyPlanPayment,
      // X6: no separate address means the login email.
      email: m.notifyEmail ?? user.email,
    });
  }

  async saveNotificationPrefs(
    user: CallerUser,
    input: NotificationPrefs,
  ): Promise<NotificationPrefs> {
    const email = input.email.trim().toLowerCase();
    await this.db.tx
      .update(tenantMembers)
      .set({
        notifyNewOrder: input.newOrder,
        notifyPaymentToCheck: input.paymentToCheck,
        notifyStorage: input.storage,
        notifyPlanPayment: input.planPayment,
        notifyEmail: email === user.email.toLowerCase() ? null : email,
      })
      .where(and(eq(tenantMembers.tenantId, this.db.shopId), eq(tenantMembers.userId, user.id)));
    return this.getNotificationPrefs(user);
  }
}
