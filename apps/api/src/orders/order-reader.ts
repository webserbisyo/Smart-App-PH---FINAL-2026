import { Inject, Injectable } from '@nestjs/common';
import {
  BoardOrderSchema,
  chatKey,
  ChatSummarySchema,
  chatLock,
  defaultMemberFace,
  formatPeso,
  isTransfer,
  lastLine,
  NO_REFERENCE,
  orderProofs,
  OrderReceiptSchema,
  OrderRowSchema,
  OrderStatusEnum,
  OwnerAvatarSchema,
  OwnerOrderSchema,
  PaymentMethodEnum,
  PaymentSchema,
  unseenCount,
  waitingSince,
  words,
  type BoardOrder,
  type ChatSummary,
  type OrderMessage,
  type OrderReceipt,
  type OrderRow,
  type OwnerAvatar,
  type OwnerOrder,
  type Payment,
  type Proof,
} from '@smartapp/core';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { Db } from '../db/db.service.js';
import {
  itemPhotos,
  mediaFiles,
  members,
  orderEvents,
  orderLineOptions,
  orderLines,
  orderMessages,
  orderRatings,
  orders,
  paymentAccounts,
  paymentProofs,
  stampCards,
  stampEntries,
  tenants,
} from '../db/generated/schema.js';
import { MediaService } from '../media/media.service.js';

// A size or add-on removed from the menu after the sale (X1): the line keeps its words, the link is gone.
const GONE_ID = 'removed';

type OrderRowDb = typeof orders.$inferSelect;

/** One order as the API knows it: the receipt plus what only the shop sees. */
export interface OrderView {
  id: string;
  row: OrderRowDb;
  receipt: OrderReceipt;
  proofs: Proof[];
  isFirstOrder: boolean;
  isMember: boolean;
  memberStamps: { have: number; goal: number } | null;
  customerAvatar: OwnerAvatar | null;
  lastStepAt: string;
  photos: Map<string, string>;
}

function iso(value: string): string;
function iso(value: string | null): string | null;
function iso(value: string | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

function groupBy<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = out.get(k);
    if (list) list.push(row);
    else out.set(k, [row]);
  }
  return out;
}

function message(
  id: string,
  at: string,
  part: Partial<Omit<OrderMessage, 'id' | 'at'>>,
): OrderMessage {
  return {
    id,
    at,
    kind: part.kind ?? 'status',
    status: part.status ?? null,
    proof: part.proof ?? null,
    text: part.text ?? null,
    from: part.from ?? 'system',
    via: part.via ?? 'app',
    seenAt: part.seenAt ?? null,
  };
}

/**
 * Reads orders for the storefront's receipt and the owner's Orders (api.md "Storefront" and "Orders"). Every
 * list reads each order table once for all the orders it shows (never one query per order). The chat is put
 * together from the facts that cause it: status steps from order_events, photos and the shop's answers from
 * payment_proofs, a cancel or refund from the order, rider, tracking, time and change lines from
 * order_messages. Nothing is stored twice.
 */
@Injectable()
export class OrderReader {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async byToken(token: string): Promise<OrderView | null> {
    if (token.length < 16 || token.length > 64) return null;
    const [row] = await this.db.tx
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.token, token)));
    if (!row) return null;
    const [view] = await this.views([row]);
    return view ?? null;
  }

  async byId(id: string): Promise<OrderView | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const [row] = await this.db.tx
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, this.db.shopId), eq(orders.id, id)));
    if (!row) return null;
    const [view] = await this.views([row]);
    return view ?? null;
  }

  /** Builds the views of these rows, in the same order. */
  async views(rows: readonly OrderRowDb[]): Promise<OrderView[]> {
    if (rows.length === 0) return [];
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    const ids = rows.map((r) => r.id);
    const [shop] = await tx
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, shopId));
    const slug = shop?.slug ?? '';

    const lineRows = await tx
      .select()
      .from(orderLines)
      .where(and(eq(orderLines.tenantId, shopId), inArray(orderLines.orderId, ids)))
      .orderBy(asc(orderLines.orderId), asc(orderLines.sort));
    const lineIds = lineRows.map((l) => l.id);
    const optionRows =
      lineIds.length === 0
        ? []
        : await tx
            .select()
            .from(orderLineOptions)
            .where(
              and(eq(orderLineOptions.tenantId, shopId), inArray(orderLineOptions.lineId, lineIds)),
            );
    const eventRows = await tx
      .select()
      .from(orderEvents)
      .where(
        and(
          eq(orderEvents.tenantId, shopId),
          inArray(orderEvents.orderId, ids),
          isNull(orderEvents.undoneAt),
        ),
      )
      .orderBy(asc(orderEvents.at), asc(orderEvents.id));
    const messageRows = await tx
      .select()
      .from(orderMessages)
      .where(and(eq(orderMessages.tenantId, shopId), inArray(orderMessages.orderId, ids)))
      .orderBy(asc(orderMessages.createdAt));
    const proofRows = await tx
      .select({
        id: paymentProofs.id,
        orderId: paymentProofs.orderId,
        referenceNo: paymentProofs.referenceNo,
        status: paymentProofs.status,
        rejectReason: paymentProofs.rejectReason,
        seenAt: paymentProofs.seenAt,
        decidedAt: paymentProofs.decidedAt,
        createdAt: paymentProofs.createdAt,
        path: mediaFiles.path,
        deletedAt: mediaFiles.deletedAt,
      })
      .from(paymentProofs)
      .leftJoin(mediaFiles, eq(mediaFiles.id, paymentProofs.mediaId))
      .where(and(eq(paymentProofs.tenantId, shopId), inArray(paymentProofs.orderId, ids)))
      .orderBy(asc(paymentProofs.createdAt));
    const ratingRows = await tx
      .select()
      .from(orderRatings)
      .where(and(eq(orderRatings.tenantId, shopId), inArray(orderRatings.orderId, ids)));

    const accountIds = [
      ...new Set(rows.flatMap((r) => (r.paymentAccountId ? [r.paymentAccountId] : []))),
    ];
    const accounts =
      accountIds.length === 0
        ? []
        : await tx
            .select()
            .from(paymentAccounts)
            .where(
              and(eq(paymentAccounts.tenantId, shopId), inArray(paymentAccounts.id, accountIds)),
            );
    const accountOf = new Map(accounts.map((a) => [a.id, a]));
    const qrOf = new Map<string, string | null>();
    for (const a of accounts) qrOf.set(a.id, await this.media.refById(a.qrMediaId));

    // First order: no earlier order from the same mobile number at this shop.
    const phones = [...new Set(rows.flatMap((r) => (r.customerPhone ? [r.customerPhone] : [])))];
    const firsts =
      phones.length === 0
        ? []
        : await tx
            .select({
              phone: orders.customerPhone,
              first: sql<string>`min(${orders.placedAt})`,
            })
            .from(orders)
            .where(and(eq(orders.tenantId, shopId), inArray(orders.customerPhone, phones)))
            .groupBy(orders.customerPhone);
    const firstOf = new Map(firsts.map((f) => [f.phone, new Date(f.first).getTime()]));

    // Members on these orders: their face and their stamps toward the prize.
    const memberIds = [...new Set(rows.flatMap((r) => (r.memberId ? [r.memberId] : [])))];
    const memberRows =
      memberIds.length === 0
        ? []
        : await tx
            .select({
              id: members.id,
              email: members.email,
              avatar: members.avatar,
              erasedAt: members.erasedAt,
            })
            .from(members)
            .where(and(eq(members.tenantId, shopId), inArray(members.id, memberIds)));
    const balances =
      memberIds.length === 0
        ? []
        : await tx
            .select({
              memberId: stampEntries.memberId,
              n: sql<number>`coalesce(sum(${stampEntries.delta}), 0)::int`,
            })
            .from(stampEntries)
            .where(
              and(eq(stampEntries.tenantId, shopId), inArray(stampEntries.memberId, memberIds)),
            )
            .groupBy(stampEntries.memberId);
    const [card] = await tx
      .select({ status: stampCards.status, needed: stampCards.stampsNeeded })
      .from(stampCards)
      .where(eq(stampCards.tenantId, shopId));
    const memberOf = new Map(memberRows.map((m) => [m.id, m]));
    const balanceOf = new Map(balances.map((b) => [b.memberId, Number(b.n)]));

    // The first photo of each ordered item, for the ticket's photo stack and My orders.
    const itemIds = [...new Set(lineRows.map((l) => l.itemId))];
    const photoRows =
      itemIds.length === 0
        ? []
        : await tx
            .select({ itemId: itemPhotos.itemId, bucket: mediaFiles.bucket, path: mediaFiles.path })
            .from(itemPhotos)
            .innerJoin(mediaFiles, eq(mediaFiles.id, itemPhotos.mediaId))
            .where(and(eq(itemPhotos.tenantId, shopId), inArray(itemPhotos.itemId, itemIds)))
            .orderBy(asc(itemPhotos.itemId), asc(itemPhotos.sort));
    const photos = new Map<string, string>();
    for (const p of photoRows) {
      if (photos.has(p.itemId)) continue;
      const ref = this.media.refFor(p.bucket, p.path);
      if (ref) photos.set(p.itemId, ref);
    }

    const linesOf = groupBy(lineRows, (l) => l.orderId);
    const optionsOf = groupBy(optionRows, (o) => o.lineId);
    const eventsOf = groupBy(eventRows, (e) => e.orderId);
    const messagesOf = groupBy(messageRows, (m) => m.orderId);
    const proofsOf = groupBy(proofRows, (p) => p.orderId);
    const ratingOf = new Map(ratingRows.map((r) => [r.orderId, r]));

    return rows.map((row) => {
      const placedAt = iso(row.placedAt);
      const lines = (linesOf.get(row.id) ?? []).map((l) => {
        const opts = optionsOf.get(l.id) ?? [];
        return {
          name: l.name,
          variantLabel: l.variantLabel,
          optionLabels: opts.map((o) => o.name),
          note: l.note,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
          itemId: l.itemId,
          variantId: l.variantId ?? GONE_ID,
          optionIds: opts.flatMap((o) => (o.optionId ? [o.optionId] : [])),
        };
      });

      const events = (eventsOf.get(row.id) ?? []).map((e) => ({
        status: OrderStatusEnum.parse(e.status),
        at: iso(e.at),
      }));
      if (events.length === 0) events.push({ status: 'placed', at: placedAt });

      const proofs: Proof[] = (proofsOf.get(row.id) ?? []).map((p) => ({
        id: p.id,
        status: p.status === 'approved' || p.status === 'rejected' ? p.status : 'pending',
        referenceNo: p.referenceNo ?? NO_REFERENCE,
        // The photo goes after 30 days; its row and reference stay (T81).
        path: p.path && !p.deletedAt ? p.path : `gone/${p.id}`,
        uploadedAt: iso(p.createdAt),
        rejectReason: p.rejectReason,
      }));

      const thread: OrderMessage[] = [];
      for (const [i, p] of (proofsOf.get(row.id) ?? []).entries()) {
        const proof = proofs[i];
        if (!proof) continue;
        thread.push(
          message(`${p.id}-m`, proof.uploadedAt, {
            kind: 'proof',
            proof,
            from: 'customer',
            seenAt: iso(p.seenAt),
          }),
        );
        if (p.decidedAt && proof.status === 'approved') {
          thread.push(
            message(`${p.id}-a`, iso(p.decidedAt), {
              text: words.shop.thread.paymentApproved,
              from: 'shop',
            }),
          );
        }
        if (p.decidedAt && proof.status === 'rejected') {
          thread.push(
            message(`${p.id}-r`, iso(p.decidedAt), {
              text: words.shop.thread.paymentRejected(p.rejectReason ?? ''),
              from: 'shop',
            }),
          );
        }
      }
      for (const [i, e] of events.entries()) {
        if (i === 0) continue;
        thread.push(
          message(`${row.id}-${e.status}-${i}`, e.at, {
            status: e.status,
            text: e.status === 'expired' ? words.shop.thread.expired : null,
          }),
        );
      }
      if (row.status === 'cancelled') {
        const at = events.at(-1)?.at ?? placedAt;
        thread.push(
          message(`${row.id}-cancel`, at, {
            text:
              row.refundAmount !== null && row.refundReason
                ? words.shop.thread.refunded(formatPeso(row.refundAmount), row.refundReason)
                : words.shop.thread.cancelled(row.cancelReason ?? ''),
            from: 'shop',
          }),
        );
      }
      for (const m of messagesOf.get(row.id) ?? []) {
        thread.push(
          message(m.id, iso(m.createdAt), {
            kind:
              m.kind === 'rider' || m.kind === 'tracking' || m.kind === 'changed'
                ? m.kind
                : 'schedule',
            text: m.text,
            from: m.from === 'customer' || m.from === 'system' ? m.from : 'shop',
            via: m.via === 'messenger' ? 'messenger' : 'app',
            seenAt: iso(m.seenAt),
          }),
        );
      }
      thread.sort((a, b) => a.at.localeCompare(b.at));

      const account = row.paymentAccountId ? accountOf.get(row.paymentAccountId) : undefined;
      const method = PaymentMethodEnum.parse(row.paymentMethod);
      const rating = ratingOf.get(row.id);
      const receipt = OrderReceiptSchema.parse({
        slug,
        orderNo: row.orderNo,
        token: row.token,
        type: row.type,
        status: row.status,
        paymentStatus: row.paymentStatus,
        paymentMethod: method,
        placedAt,
        scheduledAt: iso(row.scheduledAt),
        customerName: row.customerName,
        deliveryAddress:
          row.type === 'delivery'
            ? [row.houseNo, row.floor, row.addressLine, row.landmark].filter(Boolean).join(', ')
            : null,
        events,
        messages: thread,
        lines,
        totals: {
          subtotal: row.subtotal,
          discount: row.discount,
          deliveryFee: row.deliveryFee,
          total: row.total,
        },
        rewardTitle: row.rewardTitle,
        payment: isTransfer(method)
          ? {
              method,
              accountId: account?.id ?? null,
              bank: account?.bank ?? null,
              accountName: account?.accountName ?? null,
              accountNumber: account?.accountNumber ?? null,
              qr: account ? (qrOf.get(account.id) ?? null) : null,
              amount: row.total,
            }
          : null,
        rider: row.riderName
          ? { name: row.riderName, phone: row.riderPhone, provider: row.riderProvider }
          : null,
        trackingUrl: row.trackingUrl,
        refund:
          row.refundAmount !== null && row.refundReason && row.refundedAt
            ? { amount: row.refundAmount, reason: row.refundReason, at: iso(row.refundedAt) }
            : null,
        rating: rating
          ? { stars: rating.stars, comment: rating.comment, at: iso(rating.createdAt) }
          : null,
        cancelReason: row.cancelReason,
        expiresAt:
          row.status === 'placed' && row.paymentStatus === 'unpaid' ? iso(row.payBy) : null,
        note: row.note,
        dueAt: iso(row.dueAt),
        startBy: iso(row.startBy),
        pickupCode: row.pickupCode,
      });

      const member = row.memberId ? memberOf.get(row.memberId) : undefined;
      const live = member && !member.erasedAt ? member : undefined;
      const avatar = live ? OwnerAvatarSchema.safeParse(live.avatar) : null;
      const goal = card?.needed ?? 0;
      return {
        id: row.id,
        row,
        receipt,
        proofs,
        isFirstOrder:
          row.customerPhone !== null &&
          firstOf.get(row.customerPhone) === new Date(row.placedAt).getTime(),
        isMember: live !== undefined,
        memberStamps:
          live && card?.status === 'on' && goal > 0
            ? { have: Math.max(0, Math.min(balanceOf.get(live.id) ?? 0, goal)), goal }
            : null,
        customerAvatar: live
          ? avatar?.success
            ? avatar.data
            : defaultMemberFace(live.email ?? live.id)
          : null,
        lastStepAt: iso(row.lastStepAt),
        photos,
      };
    });
  }

  board(view: OrderView): BoardOrder {
    const r = view.receipt;
    const row = view.row;
    return BoardOrderSchema.parse({
      id: view.id,
      token: r.token,
      orderNo: r.orderNo,
      type: r.type,
      status: r.status,
      paymentStatus: r.paymentStatus,
      paymentMethod: r.paymentMethod,
      paymentAccountId: row.paymentAccountId,
      scheduledAt: r.scheduledAt,
      placedAt: r.placedAt,
      customerName: r.customerName,
      isFirstOrder: view.isFirstOrder,
      isMember: view.isMember,
      hasReward: r.rewardTitle !== null,
      itemsSummary: r.lines.map((l) => `${l.qty} × ${l.name}`).join(', '),
      total: r.totals.total,
      dueAt: r.dueAt,
      startBy: r.startBy,
      pickupCode: r.pickupCode,
      seenAt: iso(row.seenAt),
      lines: r.lines.slice(0, 8).map((l) => ({
        qty: l.qty,
        name: l.name,
        variantLabel: l.variantLabel,
        optionLabels: l.optionLabels,
        note: l.note || null,
        photo: view.photos.get(l.itemId) ?? null,
      })),
      moreLines: Math.max(0, r.lines.length - 8),
      note: r.note,
      ownerNote: row.ownerNote,
      deliveryArea: r.type === 'delivery' ? (row.addressLine?.split(',')[0]?.trim() ?? null) : null,
      lastStepAt: view.lastStepAt,
      expiresAt: r.expiresAt,
      memberStamps: view.memberStamps,
      customerAvatar: view.customerAvatar,
      source: row.source === 'owner' ? 'owner' : 'storefront',
      paidAmount: row.paidAmount,
    });
  }

  owner(view: OrderView): OwnerOrder {
    const row = view.row;
    return OwnerOrderSchema.parse({
      ...view.receipt,
      id: view.id,
      customerPhone: row.customerPhone || null,
      customerEmail: row.customerEmail,
      isFirstOrder: view.isFirstOrder,
      isMember: view.isMember,
      proofs: view.proofs,
      seenAt: iso(row.seenAt),
      ownerNote: row.ownerNote,
      lastStepAt: view.lastStepAt,
      source: row.source === 'owner' ? 'owner' : 'storefront',
      paidAmount: row.paidAmount,
      version: row.version,
      editedAt: iso(row.editedAt),
      memberId: view.isMember ? row.memberId : null,
    });
  }

  payment(view: OrderView): Payment {
    return PaymentSchema.parse({
      orderId: view.id,
      method: view.receipt.paymentMethod,
      status: view.receipt.paymentStatus,
      amount: view.receipt.totals.total,
      paidAmount: view.row.paidAmount,
      proofs: view.proofs,
    });
  }

  chat(view: OrderView): ChatSummary | null {
    const messages = view.receipt.messages;
    const last = lastLine(messages);
    if (!last) return null;
    return ChatSummarySchema.parse({
      key: chatKey({
        id: view.id,
        isMember: view.isMember,
        customerPhone: view.row.customerPhone ?? '',
      }),
      orderId: view.id,
      orderNo: view.receipt.orderNo,
      status: view.receipt.status,
      customerName: view.receipt.customerName,
      customerPhone: view.row.customerPhone || null,
      isMember: view.isMember,
      isFirstOrder: view.isFirstOrder,
      memberStamps: view.memberStamps,
      customerAvatar: view.customerAvatar,
      last,
      waitingSince: waitingSince(messages),
      unseen: unseenCount(messages),
      photosUsed: orderProofs(messages).length,
      lock: chatLock(view.receipt.status),
    });
  }

  row(view: OrderView): OrderRow {
    const r = view.receipt;
    return OrderRowSchema.parse({
      slug: r.slug,
      token: r.token,
      orderNo: r.orderNo,
      type: r.type,
      status: r.status,
      paymentStatus: r.paymentStatus,
      total: r.totals.total,
      placedAt: r.placedAt,
      scheduledAt: r.scheduledAt,
      itemCount: r.lines.reduce((n, l) => n + l.qty, 0),
      summary: r.lines.map((l) => `${l.qty} × ${l.name}`).join(', '),
      photos: r.lines
        .flatMap((l) => {
          const photo = view.photos.get(l.itemId);
          return photo ? [photo] : [];
        })
        .slice(0, 3),
      paymentMethod: r.paymentMethod,
      expiresAt: r.expiresAt,
      ratingStars: r.rating?.stars ?? null,
    });
  }
}
