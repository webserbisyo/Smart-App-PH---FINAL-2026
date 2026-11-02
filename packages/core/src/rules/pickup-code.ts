// 4-character pickup code from an order token, omitting ambiguous characters (0, O, 1, I, L).
export const PICKUP_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function pickupCode(token: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    h1 ^= token.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  let h2 = 0x9e3779b9;
  for (let i = token.length - 1; i >= 0; i--) {
    h2 ^= token.charCodeAt(i);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const len = PICKUP_CODE_ALPHABET.length;
  const c1 = PICKUP_CODE_ALPHABET[Math.abs(h1) % len]!;
  const c2 = PICKUP_CODE_ALPHABET[Math.abs((h1 >>> 5) ^ (h2 >>> 2)) % len]!;
  const c3 = PICKUP_CODE_ALPHABET[Math.abs(h2) % len]!;
  const c4 = PICKUP_CODE_ALPHABET[Math.abs((h2 >>> 5) ^ (h1 >>> 3)) % len]!;
  return `${c1}${c2}${c3}${c4}`;
}
