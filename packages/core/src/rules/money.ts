// Money is integer centavos everywhere. Display: ₱1,234 (no .00 for whole pesos), ₱12,345.50.

const GROUP = /\B(?=(\d{3})+(?!\d))/g;

export function formatPeso(centavos: number): string {
  const sign = centavos < 0 ? '−' : '';
  const abs = Math.abs(Math.round(centavos));
  const pesos = Math.floor(abs / 100);
  const cents = abs % 100;
  const whole = String(pesos).replace(GROUP, ',');
  return cents === 0 ? `${sign}₱${whole}` : `${sign}₱${whole}.${String(cents).padStart(2, '0')}`;
}

/** Add-on price label: "Free" for ₱0, otherwise "+₱25". */
export function optionPriceLabel(centavos: number, freeWord: string): string {
  return centavos === 0 ? freeWord : `+${formatPeso(centavos)}`;
}

/** Reads "₱120", "120.50", "1,234", " ₱ 1,234.5 " → centavos; null when it isn't an amount. */
export function parsePeso(text: string): number | null {
  const cleaned = text.replace(/[₱\s,]/g, '').replace(/^php/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
