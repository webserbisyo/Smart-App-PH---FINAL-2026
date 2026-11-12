// Calendar days as "YYYY-MM-DD" keys (Manila business dates) and the local Date a day picker shows for them.
// Noon keeps a day on the same date in every time zone.

/** The Date a calendar shows for a day key. */
export function dateFromKey(key: string): Date {
  const [y = 1970, m = 1, d = 1] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** The day key of the date a calendar handed back (its own year, month and day, never shifted). */
export function keyFromDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}
