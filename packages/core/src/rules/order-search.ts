// Order search (Orders v2, decision T54): how a typed or scanned code becomes a search. "#012" is order
// 12, "k7 qp" is pickup code K7QP. Pure functions, shared by the mock adapter and tests.
import { PICKUP_CODE_ALPHABET } from './pickup-code.js';

export type FindQuery =
  // Typed: an order number, a pickup code, or both when the text could be either ("2345").
  | { kind: 'typed'; orderNo: number | null; code: string | null }
  // Scanned: the shop and token from the receipt link in the QR.
  | { kind: 'receipt'; slug: string; token: string };

/** Spaces, a leading # and lower case don't matter: " k7 qp " → "K7QP", "#012" → "012". */
export function normalizeFindCode(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/^#/, '').toUpperCase();
}

const RECEIPT_PATH = /\/([a-z0-9-]+)\/o\/([A-Za-z0-9_-]{8,})(?:[/?#]|$)/;

function isPickupCode(code: string): boolean {
  return code.length === 4 && [...code].every((c) => PICKUP_CODE_ALPHABET.includes(c));
}

/**
 * What the owner typed or scanned, as one search: an order number ("12", "#012"), a 4-character pickup
 * code, or a receipt link from the QR (its shop and token). Anything else is null.
 */
export function parseFindInput(raw: string): FindQuery | null {
  const receipt = RECEIPT_PATH.exec(raw.trim());
  if (receipt?.[1] && receipt[2]) return { kind: 'receipt', slug: receipt[1], token: receipt[2] };
  const text = normalizeFindCode(raw);
  const orderNo = /^\d{1,6}$/.test(text) && Number(text) > 0 ? Number(text) : null;
  const code = isPickupCode(text) ? text : null;
  return orderNo === null && code === null ? null : { kind: 'typed', orderNo, code };
}
