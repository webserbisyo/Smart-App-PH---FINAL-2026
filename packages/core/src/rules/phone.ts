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
