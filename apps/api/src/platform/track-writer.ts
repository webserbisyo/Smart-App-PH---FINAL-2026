import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  META_COUNTRY,
  metaCity,
  metaEmail,
  metaNameParts,
  metaPhone,
  trackingBlock,
  type TrackActionSource,
  type TrackCausedBy,
  type TrackEventName,
  type TrackVia,
} from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db } from '../db/db.service.js';

/** Meta's customer information hash: SHA-256 of the normalised value, lowercase hex. */
export function metaHash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Who the event is about, before hashing. Only the hashes and Meta's own cookies are ever kept. */
export interface TrackPerson {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  city?: string | null;
  // Our own id for the person (a lead id or an owner's user id), hashed as Meta's external_id.
  externalId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
}

/** The hashed user_data a row keeps (never an email or a mobile in the clear: the table refuses those keys). */
export function hashedUserData(person: TrackPerson): Record<string, string> {
  const out: Record<string, string> = { country: metaHash(META_COUNTRY) };
  if (person.email) out['em'] = metaHash(metaEmail(person.email));
  if (person.phone) out['ph'] = metaHash(metaPhone(person.phone));
  if (person.fullName) {
    const { fn, ln } = metaNameParts(person.fullName);
    if (fn) out['fn'] = metaHash(fn);
    if (ln) out['ln'] = metaHash(ln);
  }
  if (person.city) out['ct'] = metaHash(metaCity(person.city));
  if (person.externalId) out['external_id'] = metaHash(person.externalId);
  if (person.fbp) out['fbp'] = person.fbp;
  if (person.fbc) out['fbc'] = person.fbc;
  return out;
}

export interface NewTrackEvent {
  name: TrackEventName;
  eventId: string;
  via: TrackVia;
  // waiting: a payment's Purchase or Subscribe until the founder decides (T118 Q4).
  status: 'queued' | 'waiting';
  tenantId: string | null;
  leadId?: string | null;
  planPaymentId?: string | null;
  // Centavos; Meta gets pesos.
  value?: number | null;
  person: TrackPerson;
  pageUrl?: string | null;
  // When it really happened (server clock). Defaults to now.
  eventTime?: string | null;
  actionSource: TrackActionSource;
  causedBy: TrackCausedBy;
  // The owner's or visitor's own request (never the founder's): Meta's client_ip_address and user agent.
  client?: { ip: string | null; ua: string | null } | null;
  // The approval's 10-minute hold (T118 Q4). Defaults to now.
  sendAfter?: string | null;
  // Why it must not go (T118 section 4.3): the row is kept as skipped with the reason.
  block: Parameters<typeof trackingBlock>[0];
}

const SettingsSchema = z.object({ tracking_test_mode: z.boolean() });

/**
 * Writes one Meta event row inside the caller's transaction (T90, T118). Nothing is sent here: the sender job
 * does that. One check for who never fires; a skipped row keeps the reason and no IP address or browser. The
 * event id is unique, so the browser's copy and the server's copy of one event stay one row.
 */
@Injectable()
export class TrackWriter {
  constructor(@Inject(Db) private readonly db: Db) {}

  async write(event: NewTrackEvent): Promise<void> {
    const problem = trackingBlock(event.block);
    const settings = await this.db.tx.execute(
      sql`select tracking_test_mode from public.platform_settings limit 1`,
    );
    const test = SettingsSchema.array().parse(settings.rows)[0]?.tracking_test_mode ?? true;
    const keepClient = problem === null && event.causedBy !== 'admin' && event.causedBy !== 'job';
    const ip = keepClient ? (event.client?.ip ?? null) : null;
    const ua = keepClient ? (event.client?.ua?.slice(0, 500) ?? null) : null;
    const status = problem ? 'skipped' : event.status;
    const userData = JSON.stringify(hashedUserData(event.person));
    // No RETURNING and no conflict target: the API's role may add a row but never read one (RLS).
    await this.db.tx.execute(sql`
      insert into public.track_events (
        event_id, name, via, status, problem, tenant_id, lead_id, plan_payment_id, value, user_data,
        page_url, test, event_time, action_source, caused_by, client_ip, client_ua, send_after
      ) values (
        ${event.eventId}, ${event.name}, ${event.via}, ${status}, ${problem}, ${event.tenantId}::uuid,
        ${event.leadId ?? null}::uuid, ${event.planPaymentId ?? null}::uuid, ${event.value ?? null},
        ${userData}::jsonb, ${event.pageUrl?.slice(0, 500) ?? null}, ${test},
        coalesce(${event.eventTime ?? null}::timestamptz, now()), ${event.actionSource}, ${event.causedBy},
        ${ip}::inet, ${ua}, coalesce(${event.sendAfter ?? null}::timestamptz, now())
      )
      on conflict do nothing`);
  }
}

/** The request's browser, cut to what Meta takes. */
export function userAgentOf(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  return value ? value.slice(0, 500) : null;
}
