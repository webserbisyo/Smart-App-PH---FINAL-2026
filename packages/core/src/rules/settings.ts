// Owner Settings rules (decisions T64 to T68): hours and delivery rows that make sense, the storage levels,
// the Pro plan's dates, the real type inside an upload and the owner's picture. Pure functions, shared by
// the screens, the mock and later NestJS.
import type { DistanceRow, OpeningRange } from '../schemas/storefront.js';
import type { OwnerAvatar } from '../schemas/settings.js';
import type { PlanStatus, StorageLevel } from '../schemas/enums.js';
import { avatarSvgSrc } from '../schemas/avatar-make.js';
import { addDays, clockMinutes, manilaDate } from './time.js';

// ---------- hours ----------

export type HoursProblem = 'order' | 'overlap';

/**
 * What is wrong with each opening range, by its index: closing must come after opening (a late night ends
 * at 12 MN, "24:00"), and two ranges on the same day can't overlap. Touching ranges (5 PM to 9 PM, then
 * 9 PM to 12 MN) are fine.
 */
export function hoursProblems(hours: readonly OpeningRange[]): Map<number, HoursProblem> {
  const problems = new Map<number, HoursProblem>();
  hours.forEach((range, index) => {
    if (clockMinutes(range.close) <= clockMinutes(range.open)) problems.set(index, 'order');
  });
  hours.forEach((a, i) => {
    hours.forEach((b, j) => {
      if (j <= i || a.day !== b.day || problems.has(i) || problems.has(j)) return;
      const overlap =
        clockMinutes(a.open) < clockMinutes(b.close) &&
        clockMinutes(b.open) < clockMinutes(a.close);
      if (overlap) problems.set(j, 'overlap');
    });
  });
  return problems;
}

/** Monday's ranges copied to every other open day (Copy Monday to all days); closed days stay closed. */
export function copyDayToAll(
  hours: readonly OpeningRange[],
  from: OpeningRange['day'],
  openDays: readonly OpeningRange['day'][],
): OpeningRange[] {
  const source = hours.filter((h) => h.day === from);
  const others = openDays.filter((d) => d !== from);
  return [...source, ...others.flatMap((day) => source.map((range) => ({ ...range, day })))].sort(
    (a, b) => a.day - b.day || clockMinutes(a.open) - clockMinutes(b.open),
  );
}

// ---------- delivery rows ----------

export type DistanceRowProblem = 'start' | 'order' | 'gap' | 'overlap';

/**
 * Distance rows start at 0 km and follow each other with no gap and no overlap (N25), so every distance
 * up to the last row has exactly one fee. Rows are checked in the order shown.
 */
export function distanceRowProblems(rows: readonly DistanceRow[]): Map<number, DistanceRowProblem> {
  const problems = new Map<number, DistanceRowProblem>();
  rows.forEach((row, index) => {
    if (row.toKm <= row.fromKm) {
      problems.set(index, 'order');
      return;
    }
    if (index === 0) {
      if (row.fromKm !== 0) problems.set(index, 'start');
      return;
    }
    const before = rows[index - 1];
    if (!before) return;
    if (row.fromKm > before.toKm) problems.set(index, 'gap');
    else if (row.fromKm < before.toKm) problems.set(index, 'overlap');
  });
  return problems;
}

/** The next row starts where the last one ends, 2 km long, with the last row's fee and time. */
export function nextDistanceRow(rows: readonly DistanceRow[]): DistanceRow {
  const last = rows[rows.length - 1];
  if (!last) return { fromKm: 0, toKm: 3, fee: 4900, etaText: '30 to 45 min', minOrder: 0 };
  return { ...last, fromKm: last.toKm, toKm: last.toKm + 2 };
}

/** The row for a distance (the delivery calculator), or null past the last row. */
export function distanceRowFor(rows: readonly DistanceRow[], km: number): DistanceRow | null {
  if (!Number.isFinite(km) || km < 0) return null;
  return rows.find((r) => km >= r.fromKm && km < r.toKm) ?? rows.find((r) => km === r.toKm) ?? null;
}

// ---------- storage (T66) ----------

export const MB = 1024 * 1024;
export const PRO_STORAGE_BYTES = 500 * MB;
export const PROOF_KEEP_DAYS = 30;

/** 80 % is high (amber), 95 % almost full (red), 100 % full: new menu and look photos wait. */
export function storageLevel(usedBytes: number, limitBytes: number): StorageLevel {
  const share = limitBytes > 0 ? usedBytes / limitBytes : 1;
  if (share >= 1) return 'full';
  if (share >= 0.95) return 'almost';
  if (share >= 0.8) return 'high';
  return 'ok';
}

/** Whole percent used, 0 to 100, for the meter and the gauge. */
export function storagePercent(usedBytes: number, limitBytes: number): number {
  if (limitBytes <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((usedBytes / limitBytes) * 100)));
}

/** "212 MB", "1.5 GB", "180 KB", "0 MB": whole MB, decimals under 10 MB, KB under 1 MB. */
export function formatStorage(bytes: number): string {
  const mb = Math.max(0, bytes) / MB;
  if (mb > 0 && bytes < 1000 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb > 0 && mb < 10) return `${Math.max(1, mb).toFixed(1).replace(/\.0$/, '')} MB`;
  return `${Math.round(mb)} MB`;
}

// ---------- the plan (T67) ----------

export const PRO_PRICE_MONTHLY = 39_900;
export const PLAN_GRACE_DAYS = 7;
export const PLAN_DUE_DAYS = 7;
export const PLAN_TRIAL_DAYS = 14;

/**
 * Where the plan stands on a Manila day: on the free trial, paid (active), due within 7 days, unpaid but
 * still open for the 7 days of grace (overdue), then paused (the storefront takes no orders).
 */
export function planStatus(
  plan: { trialEndsAt: string | null; paidUntil: string | null },
  now: string | Date,
): PlanStatus {
  const today = manilaDate(now);
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  if (plan.trialEndsAt && new Date(plan.trialEndsAt).getTime() > nowMs && !plan.paidUntil)
    return 'trial';
  const end = plan.paidUntil ?? (plan.trialEndsAt ? manilaDate(plan.trialEndsAt) : null);
  if (!end) return 'paused';
  if (today <= end) return addDays(today, PLAN_DUE_DAYS) > end ? 'due' : 'active';
  if (today <= addDays(end, PLAN_GRACE_DAYS)) return 'overdue';
  return 'paused';
}

/** The last day of grace for a paid-until day. */
export function planGraceUntil(paidUntil: string | null): string | null {
  return paidUntil ? addDays(paidUntil, PLAN_GRACE_DAYS) : null;
}

/** The day a payment of some months pays up to, counted on from the paid-until day (or today). */
export function planCoversUntil(
  paidUntil: string | null,
  months: number,
  now: string | Date,
): string {
  const today = manilaDate(now);
  const from = paidUntil && paidUntil >= today ? paidUntil : today;
  const [y = 0, m = 1, d = 1] = from.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, d));
  return target.toISOString().slice(0, 10);
}

// ---------- uploads ----------

export const UPLOAD_MAX_BYTES = 15 * MB;
export const UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp';
export type ImageKind = 'jpeg' | 'png' | 'webp' | 'heic';

/**
 * The real type inside a file from its first 12 bytes, whatever its name says: JPEG FF D8 FF, PNG 89 50 4E
 * 47, WebP "RIFF....WEBP", HEIC "....ftypheic" (and its cousins). Anything else is null: not a photo.
 */
export function sniffImage(head: Uint8Array): ImageKind | null {
  const at = (i: number) => head[i] ?? -1;
  const text = (from: number, to: number) =>
    String.fromCharCode(...Array.from(head.slice(from, to)));
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'jpeg';
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return 'png';
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'webp';
  if (text(4, 8) === 'ftyp' && /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(text(8, 12)))
    return 'heic';
  return null;
}

/** "JPEG", "PNG", "WebP", "HEIC" for the type badge. */
export function imageKindName(kind: ImageKind): string {
  return kind === 'webp' ? 'WebP' : kind.toUpperCase();
}

// ---------- the owner's picture (T68) ----------

/** Where the dashboard serves the owner faces (tooling/scripts/default-avatars.ts and docs/components.md). */
export const OWNER_AVATAR_DIR = '/avatars/owner';
export const OWNER_FACES_PER_STYLE = 12;

/** The image of a face or a made picture; null for initials and photos (the photo has its own ref). */
export function ownerAvatarFile(avatar: OwnerAvatar): string | null {
  if (avatar.kind === 'face')
    return `${OWNER_AVATAR_DIR}/${avatar.style}-${String(avatar.face).padStart(2, '0')}.webp`;
  if (avatar.kind === 'custom') return avatarSvgSrc(avatar.svg);
  return null;
}

/** "JD" from "Juan Dela Cruz", "K" from "Kris". */
export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/** A new owner starts with a Soft face picked from their name, on Sky. */
export function startingAvatar(name: string): OwnerAvatar {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { kind: 'face', style: 'soft', face: (hash % OWNER_FACES_PER_STYLE) + 1, theme: 'sky' };
}
