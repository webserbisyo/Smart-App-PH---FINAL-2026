// The time columns of the shared slot picker (T129, after time.rdsx.dev): Hour, Minute and AM or PM, built
// only from the shop's real times. An hour with no time is left out, a full time is crossed out, the
// Minute column shows only when some time is not on the hour, and AM or PM only when the day has both.
// Pure, so the storefront's When picker and the owner's Change time and New order share one rule.
import { manilaParts } from './time.js';

export const CLOCK_PERIODS = ['AM', 'PM'] as const;
export type ClockPeriod = (typeof CLOCK_PERIODS)[number];

export interface ColumnSlot {
  at: string;
  /** Can't be picked (full, or not allowed here). */
  disabled?: boolean | undefined;
}

export interface SlotHour<S extends ColumnSlot> {
  /** "06", "14": the hour of the day in Manila, so 12 NN and 12 MN never mix. */
  value: string;
  /** "6", "12" */
  label: string;
  period: ClockPeriod;
  slots: S[];
  /** The first time in this hour that can be picked, or null when all are full. */
  firstOpen: string | null;
}

export interface SlotMinute<S extends ColumnSlot> {
  value: string;
  /** "00", "30" */
  label: string;
  slot: S;
}

export interface SlotColumns<S extends ColumnSlot> {
  /** Shown only when the day has times in both. */
  periods: { value: ClockPeriod; firstOpen: string | null }[];
  period: ClockPeriod | null;
  hours: SlotHour<S>[];
  hour: string | null;
  minutes: SlotMinute<S>[];
  showMinutes: boolean;
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function clockPeriodOf(at: string): ClockPeriod {
  return manilaParts(at).hour < 12 ? 'AM' : 'PM';
}

function hourKey(at: string): string {
  return pad(manilaParts(at).hour);
}

/**
 * The columns for one day's times. `picked` is what the person tapped last (a part of the day, an hour)
 * while no time in it is picked yet; the picked time itself always wins.
 */
export function slotColumns<S extends ColumnSlot>(
  slots: readonly S[],
  value: string | null,
  picked: { period: ClockPeriod | null; hour: string | null } = { period: null, hour: null },
): SlotColumns<S> {
  const sorted = [...slots].sort((a, b) => a.at.localeCompare(b.at));
  const open = (list: readonly S[]) => list.find((s) => !s.disabled)?.at ?? null;
  const showMinutes = sorted.some((s) => manilaParts(s.at).minute !== 0);

  const present = CLOCK_PERIODS.filter((p) => sorted.some((s) => clockPeriodOf(s.at) === p));
  const periods = present.map((p) => ({
    value: p,
    firstOpen: open(sorted.filter((s) => clockPeriodOf(s.at) === p)),
  }));

  const selected = value ? sorted.find((s) => s.at === value) : undefined;
  const period: ClockPeriod | null = selected
    ? clockPeriodOf(selected.at)
    : picked.period && present.includes(picked.period)
      ? picked.period
      : (periods.find((p) => p.firstOpen)?.value ?? present[0] ?? null);

  const hours: SlotHour<S>[] = [];
  for (const s of sorted) {
    if (clockPeriodOf(s.at) !== period) continue;
    const key = hourKey(s.at);
    const last = hours.at(-1);
    if (last && last.value === key) {
      last.slots.push(s);
      continue;
    }
    const h24 = manilaParts(s.at).hour;
    hours.push({
      value: key,
      label: String(h24 % 12 === 0 ? 12 : h24 % 12),
      period: clockPeriodOf(s.at),
      slots: [s],
      firstOpen: null,
    });
  }
  for (const h of hours) h.firstOpen = open(h.slots);

  const hour = selected
    ? hourKey(selected.at)
    : picked.hour && hours.some((h) => h.value === picked.hour)
      ? picked.hour
      : null;
  const inHour = hours.find((h) => h.value === hour)?.slots ?? [];
  const minutes = inHour.map((slot) => ({
    value: slot.at,
    label: pad(manilaParts(slot.at).minute),
    slot,
  }));

  return { periods, period, hours, hour, minutes, showMinutes };
}
