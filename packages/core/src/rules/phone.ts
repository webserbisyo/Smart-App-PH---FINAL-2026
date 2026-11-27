// Philippine mobile numbers: 0917…, 917…, +63 917… or 63917… → +639XXXXXXXXX.

export type PhoneResult = { ok: true; e164: string } | { ok: false; problem: 'invalid' };

export function normalisePhPhone(input: string): PhoneResult {
  const digits = input.replace(/[\s\-().]/g, '');
  const match = /^(?:\+?63|0)?(9\d{9})$/.exec(digits);
  if (!match?.[1]) return { ok: false, problem: 'invalid' };
  return { ok: true, e164: `+63${match[1]}` };
}

/** +639170001234 → "0917 000 1234" for display. */
export function formatPhPhone(e164: string): string {
  const match = /^\+63(9\d{2})(\d{3})(\d{4})$/.exec(e164);
  if (!match) return e164;
  return `0${match[1]} ${match[2]} ${match[3]}`;
}

/**
 * A search box's text as a piece of a saved +63 number, so 09171234567, 0917 123 4567, +63 917…,
 * 63917… and 9171234567 all find +639171234567. Spaces, dashes, dots and brackets are ignored and a
 * leading 0 is dropped (saved numbers have +63 there). Null unless the text is a number of at least
 * 4 digits, so a short order number or a name never matches every phone.
 */
export function phoneSearchText(query: string): string | null {
  const compact = query.trim().replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;
  const digits = compact.startsWith('0') ? compact.slice(1) : compact;
  return digits.replace(/^\+/, '').length >= 4 ? digits : null;
}
