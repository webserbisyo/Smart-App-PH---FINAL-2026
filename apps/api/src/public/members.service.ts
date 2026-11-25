import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  CustomerAddressSchema,
  normalisePhPhone,
  OwnerAvatarSchema,
  words,
  type CustomerAddress,
  type MemberAccount,
  type OwnerAvatar,
  type RewardClaim,
} from '@smartapp/core';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { CallerUser } from '../auth/caller.js';
import { ApiFailure, notSignedIn } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { consents, memberAddresses, members, rewardClaims } from '../db/generated/schema.js';
import { MediaService } from '../media/media.service.js';
import { MemberAccounts, type MemberRow } from '../members/member-accounts.js';
import { StampLedger } from '../members/stamp-ledger.js';
import { uuidOrNull } from '../orders/order-book.js';
import { ShopReader } from './shop-reader.js';

// What "By joining you agree…" points at (Data Privacy Act record). Bump when the words change.
export const MEMBER_TERMS_VERSION = '2026-11';
const MAX_ADDRESSES = 10;
const CLAIM_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export interface JoinInput {
  name: string;
  phone: string;
  orderToken?: string | undefined;
  avatar?: OwnerAvatar | undefined;
}

/**
 * A member's own side of one shop (api.md "Storefront", launch phase 6): Join, their card and history, their
 * picture, saved addresses and prize claims. One sign-in works at every shop; each shop has its own `members`
 * row, made on Join. The shop comes from the link, the person from the member cookie, never from the body.
 */
@Injectable()
export class MembersService {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(ShopReader) private readonly shops: ShopReader,
    @Inject(MemberAccounts) private readonly accounts: MemberAccounts,
    @Inject(StampLedger) private readonly ledger: StampLedger,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  /**
   * Join (M3, P8): the same account joining again gets its card back; a phone already on another member is
   * `phone_in_use`; an On card gives the welcome stamp; guest orders join the card only by the receipt the
   * phone has open or the same email, never by phone alone.
   */
  async join(slug: string, user: CallerUser | null, input: JoinInput): Promise<MemberAccount> {
    if (!user?.email) throw notSignedIn();
    const shopId = await this.shops.enterShop(slug);
    // Two taps at once wait here, so the second finds the first one's card.
    await this.db.tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`member:${shopId}:${user.id}`}, 0))`,
    );
    const card = await this.shops.stampCard();
    const existing = await this.accounts.byUser(user.id);
    if (existing) return this.accounts.account(existing, card);

    const phone = normalisePhPhone(input.phone);
    if (!phone.ok) {
      throw new ApiFailure('invalid_input', 422, { phone: [words.shop.phoneInvalid] });
    }
    const name = input.name.trim().slice(0, 80);
    if (!name) throw new ApiFailure('invalid_input', 422, { name: [words.join.nameRequired] });
    const email = user.email.trim().toLowerCase();
    const [taken] = await this.db.tx
      .select({ id: members.id, email: members.email, userId: members.userId })
      .from(members)
      .where(
        and(
          eq(members.tenantId, shopId),
          sql`(${members.phone} = ${phone.e164} or ${members.email} = ${email})`,
        ),
      );
    if (taken && taken.email !== email) throw new ApiFailure('phone_in_use', 409);

    const picked = input.avatar ? await this.avatarOf(input.avatar) : null;
    let member: MemberRow | undefined;
    if (taken) {
      // A card the shop made with this email before (counter sign-up): this sign-in takes it.
      [member] = await this.db.tx
        .update(members)
        .set({ userId: user.id, name, phone: phone.e164, updatedAt: sql`now()` })
        .where(and(eq(members.tenantId, shopId), eq(members.id, taken.id)))
        .returning();
    } else {
      [member] = await this.db.tx
        .insert(members)
        .values({
          tenantId: shopId,
          userId: user.id,
          email,
          name,
          phone: phone.e164,
          memberCode: await this.accounts.newCode(slug),
          avatar: picked?.avatar ?? null,
          avatarMediaId: picked?.mediaId ?? null,
        })
        .returning();
    }
    if (!member) throw new ApiFailure('unknown', 500);

    await this.db.tx.insert(consents).values([
      { tenantId: shopId, memberId: member.id, kind: 'terms', version: MEMBER_TERMS_VERSION },
      { tenantId: shopId, memberId: member.id, kind: 'privacy', version: MEMBER_TERMS_VERSION },
    ]);
    // Only an On card gives the welcome stamp (M3); one per member (unique index).
    if (!taken && card.status === 'on' && card.rule.welcomeStamps > 0) {
      await this.ledger.add({
        memberId: member.id,
        kind: 'welcome',
        delta: card.rule.welcomeStamps,
      });
    }
    const token = input.orderToken && input.orderToken.length <= 64 ? input.orderToken : null;
    await this.db.tx.execute(sql`
      update public.orders set member_id = ${member.id}::uuid
      where tenant_id = ${shopId} and member_id is null
        and (token = ${token} or lower(customer_email) = ${email})`);
    return this.accounts.account(member, card);
  }

  /** The signed-in member's card here, or null (not signed in, or not a member of this shop). */
  async me(slug: string, user: CallerUser | null): Promise<MemberAccount | null> {
    await this.shops.enterShop(slug);
    if (!user) return null;
    const member = await this.accounts.byUser(user.id);
    return member ? this.accounts.account(member, await this.shops.stampCard()) : null;
  }

  /** The member's picture (T95); null goes back to the Fun face the shop gives. */
  async saveAvatar(
    slug: string,
    user: CallerUser | null,
    avatar: OwnerAvatar | null,
  ): Promise<MemberAccount> {
    const member = await this.member(slug, user);
    const picked = avatar ? await this.avatarOf(avatar) : null;
    const [saved] = await this.db.tx
      .update(members)
      .set({
        avatar: picked?.avatar ?? null,
        avatarMediaId: picked?.mediaId ?? null,
        updatedAt: sql`now()`,
      })
      .where(and(eq(members.tenantId, this.db.shopId), eq(members.id, member.id)))
      .returning();
    if (!saved) throw new ApiFailure('unknown', 500);
    return this.accounts.account(saved, await this.shops.stampCard());
  }

  async saveAddress(
    slug: string,
    user: CallerUser | null,
    address: CustomerAddress,
  ): Promise<CustomerAddress[]> {
    const member = await this.member(slug, user);
    const values = {
      label: address.label.trim().slice(0, 30) || address.label.slice(0, 30),
      addressLine: address.addressLine.trim().slice(0, 160),
      houseNo: emptyToNull(address.houseNo),
      floor: emptyToNull(address.floor),
      landmark: emptyToNull(address.landmark),
      lat: address.spot?.lat ?? null,
      lng: address.spot?.lng ?? null,
      zoneId: uuidOrNull(address.zoneId ?? undefined),
    };
    const id = uuidOrNull(address.id);
    const updated = id
      ? await this.db.tx
          .update(memberAddresses)
          .set(values)
          .where(
            and(
              eq(memberAddresses.tenantId, this.db.shopId),
              eq(memberAddresses.memberId, member.id),
              eq(memberAddresses.id, id),
            ),
          )
          .returning({ id: memberAddresses.id })
      : [];
    if (updated.length === 0) {
      const list = await this.addresses(member.id);
      if (list.length >= MAX_ADDRESSES) throw new ApiFailure('invalid_input', 422);
      await this.db.tx
        .insert(memberAddresses)
        .values({ tenantId: this.db.shopId, memberId: member.id, ...values });
    }
    return this.addresses(member.id);
  }

  async removeAddress(
    slug: string,
    user: CallerUser | null,
    addressId: string,
  ): Promise<CustomerAddress[]> {
    const member = await this.member(slug, user);
    const id = uuidOrNull(addressId);
    if (id) {
      await this.db.tx
        .delete(memberAddresses)
        .where(
          and(
            eq(memberAddresses.tenantId, this.db.shopId),
            eq(memberAddresses.memberId, member.id),
            eq(memberAddresses.id, id),
          ),
        );
    }
    return this.addresses(member.id);
  }

  /**
   * Claim a custom prize (M7, S26): the stamps go as one `claimed` entry and a limited prize loses one piece,
   * in one transaction, so two claims for the last piece can't both win. The counter checks the code or QR.
   */
  async claimReward(slug: string, user: CallerUser | null): Promise<RewardClaim> {
    const member = await this.member(slug, user);
    const card = await this.shops.stampCard();
    // Paused stops new stamps only; a ready prize can still be claimed (M1).
    if (card.status === 'off' || card.reward.kind !== 'custom') {
      throw new ApiFailure('reward_unavailable', 409);
    }
    const balance = await this.ledger.lock(member.id);
    if (balance < card.rule.stampsNeeded) throw new ApiFailure('stamps_insufficient', 409);
    if (card.reward.onePerCustomer) {
      const [had] = await this.db.tx
        .select({ id: rewardClaims.id })
        .from(rewardClaims)
        .where(
          and(
            eq(rewardClaims.tenantId, this.db.shopId),
            eq(rewardClaims.memberId, member.id),
            sql`${rewardClaims.status} <> 'cancelled'`,
          ),
        )
        .limit(1);
      if (had) throw new ApiFailure('reward_unavailable', 409);
    }
    const took = await this.db.tx.execute<{ ok: boolean }>(sql`select private.take_prize() as ok`);
    if (took.rows[0]?.ok !== true) throw new ApiFailure('reward_all_claimed', 409);
    const [claim] = await this.db.tx
      .insert(rewardClaims)
      .values({
        tenantId: this.db.shopId,
        memberId: member.id,
        code: await this.claimCode(slug),
        title: card.reward.title,
      })
      .returning({ id: rewardClaims.id, code: rewardClaims.code });
    if (!claim) throw new ApiFailure('unknown', 500);
    await this.ledger.add(
      {
        memberId: member.id,
        kind: 'claimed',
        delta: -card.rule.stampsNeeded,
        claimId: claim.id,
      },
      balance,
    );
    const claims = await this.accounts.claims(member.id);
    const made = claims.find((c) => c.code === claim.code);
    if (!made) throw new ApiFailure('unknown', 500);
    return made;
  }

  /** The signed-in member of this shop; anyone else is `not_signed_in`. */
  private async member(slug: string, user: CallerUser | null): Promise<MemberRow> {
    await this.shops.enterShop(slug);
    if (!user) throw notSignedIn();
    const member = await this.accounts.byUser(user.id);
    if (!member) throw notSignedIn();
    return member;
  }

  private async addresses(memberId: string): Promise<CustomerAddress[]> {
    const rows = await this.db.tx
      .select()
      .from(memberAddresses)
      .where(
        and(eq(memberAddresses.tenantId, this.db.shopId), eq(memberAddresses.memberId, memberId)),
      )
      .orderBy(asc(memberAddresses.createdAt));
    return rows.map((a) =>
      CustomerAddressSchema.parse({
        id: a.id,
        label: a.label,
        addressLine: a.addressLine,
        houseNo: a.houseNo,
        floor: a.floor,
        landmark: a.landmark,
        spot: a.lat !== null && a.lng !== null ? { lat: a.lat, lng: a.lng } : null,
        zoneId: a.zoneId,
      }),
    );
  }

  /** A face is kept as it is; a photo is stored as the member's file (or kept, when it already is one). */
  private async avatarOf(
    avatar: OwnerAvatar,
  ): Promise<{ avatar: OwnerAvatar; mediaId: string | null }> {
    const parsed = OwnerAvatarSchema.parse(avatar);
    if (parsed.kind !== 'photo') return { avatar: parsed, mediaId: null };
    const kept = await this.media.fileOf(parsed.ref, ['member_photo']);
    const file = kept ?? (await this.media.storeMemberPhoto(parsed.ref));
    return {
      avatar: { kind: 'photo', ref: this.media.refOf(file.bucket, file.path), bytes: file.bytes },
      mediaId: file.id,
    };
  }

  /** A prize code that is free in this shop ("KS-7QK2PD"). */
  private async claimCode(slug: string): Promise<string> {
    const letters = (slug.replace(/[^a-z]/g, '').slice(0, 2) || 'pr').toUpperCase().padEnd(2, 'X');
    for (let attempt = 0; attempt < 10; attempt++) {
      let tail = '';
      for (let i = 0; i < 6; i++) tail += CLAIM_LETTERS[randomInt(CLAIM_LETTERS.length)];
      const code = `${letters}-${tail}`;
      const [taken] = await this.db.tx
        .select({ id: rewardClaims.id })
        .from(rewardClaims)
        .where(and(eq(rewardClaims.tenantId, this.db.shopId), eq(rewardClaims.code, code)));
      if (!taken) return code;
    }
    throw new Error('No free claim code.');
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  const clean = value?.trim() ?? '';
  return clean === '' ? null : clean;
}
