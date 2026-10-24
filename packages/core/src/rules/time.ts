// Manila time (UTC+8, no daylight saving). Times are stored as ISO UTC strings.

export const MANILA_OFFSET_MINUTES = 8 * 60;
const MS_MINUTE = 60_000;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface ManilaParts {
  year: number;
  month: number; // 1..12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function manilaParts(value: string | Date): ManilaParts {
  const shifted = new Date(toDate(value).getTime() + MANILA_OFFSET_MINUTES * MS_MINUTE);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** The Manila calendar date, YYYY-MM-DD. */
export function manilaDate(value: string | Date): string {
  const p = manilaParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function weekdayOf(date: string): number {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** A Manila date plus a clock ("HH:MM", "24:00" allowed) → a UTC Date. */
export function manilaToDate(date: string, clock: string): Date {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  const [hh = 0, mm = 0] = clock.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - MANILA_OFFSET_MINUTES * MS_MINUTE);
}

/** "9 PM", "3:40 PM", "12 NN", "12 MN". */
export function formatClock(value: string | Date): string {
  const { hour, minute } = manilaParts(value);
  if (minute === 0 && hour === 12) return '12 NN';
  if (minute === 0 && hour === 0) return '12 MN';
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${h12} ${suffix}` : `${h12}:${pad(minute)} ${suffix}`;
}

export type ManilaFormat = 'time' | 'day' | 'date' | 'datetime' | 'long';

/** Display in Manila time: time "3:40 PM", day "Sat", date "Sat 25 Oct", datetime "Sat 25 Oct, 3:40 PM",
 *  long "25 Oct 2026, 3:40 PM". */
export function formatManila(value: string | Date, format: ManilaFormat = 'datetime'): string {
  const p = manilaParts(value);
  const day = DAY_NAMES[p.weekday] ?? '';
  const month = MONTH_NAMES[p.month - 1] ?? '';
  switch (format) {
    case 'time':
      return formatClock(value);
    case 'day':
      return day;
    case 'date':
      return `${day} ${p.day} ${month}`;
    case 'datetime':
      return `${day} ${p.day} ${month}, ${formatClock(value)}`;
    case 'long':
      return `${p.day} ${month} ${p.year}, ${formatClock(value)}`;
  }
}

/** Whole minutes from now until `value` (negative when it has passed). */
export function minutesUntil(value: string | Date, now: string | Date): number {
  return Math.ceil((toDate(value).getTime() - toDate(now).getTime()) / MS_MINUTE);
}

/** Minutes of a Manila clock, "24:00" = 1440. */
export function clockMinutes(clock: string): number {
  const [hh = 0, mm = 0] = clock.split(':').map(Number);
  return hh * 60 + mm;
}
