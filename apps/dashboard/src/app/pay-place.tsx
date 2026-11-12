import type { LucideIcon } from 'lucide-react';
import { BanknoteIcon, EllipsisIcon, LandmarkIcon, QrCodeIcon, SmartphoneIcon } from 'lucide-react';
import {
  homeWords,
  paymentAccountFor,
  words,
  type HomePlaceKind,
  type PaymentMethod,
  type PhBank,
} from '@smartapp/core';

// Where the money landed (T84), shared by Home's money cards and the Orders "Paid to" filter.

export const PLACE_ICON: Readonly<Record<HomePlaceKind, LucideIcon>> = {
  drawer: BanknoteIcon,
  gcash: SmartphoneIcon,
  maya: SmartphoneIcon,
  bank: LandmarkIcon,
  qr_ph: QrCodeIcon,
  other: EllipsisIcon,
};

/** "Drawer", "GCash", "BDO"... A bank account is named by its bank. */
export function placeName(kind: HomePlaceKind, bank: PhBank | null): string {
  if (kind === 'bank') return words.shop.bank[bank ?? 'other'];
  return homeWords.places[kind];
}

// One fixed colour per place slot (drawer and accounts 0 to 4 in setup order, Other 5), never by size.
// Written out in full so Tailwind finds every class.
const TONES = [
  { text: 'text-chart-1', bg: 'bg-chart-1', color: 'var(--chart-1)' },
  { text: 'text-chart-2', bg: 'bg-chart-2', color: 'var(--chart-2)' },
  { text: 'text-chart-3', bg: 'bg-chart-3', color: 'var(--chart-3)' },
  { text: 'text-chart-4', bg: 'bg-chart-4', color: 'var(--chart-4)' },
  { text: 'text-chart-5', bg: 'bg-chart-5', color: 'var(--chart-5)' },
  { text: 'text-chart-6', bg: 'bg-chart-6', color: 'var(--chart-6)' },
] as const;

export type PlaceTone = (typeof TONES)[number];

export function placeTone(slot: number): PlaceTone {
  return TONES[slot] ?? TONES[5];
}

/**
 * Whether an order's money went to a place: "drawer" is cash and COD, anything else an account id. An
 * order saved before accounts had ids counts toward the first account for its method, as on Home.
 */
export function paidTo(
  order: { paymentMethod: PaymentMethod; paymentAccountId?: string | null | undefined },
  key: string,
  accounts: readonly { id: string; method: PaymentMethod }[],
): boolean {
  if (order.paymentMethod === 'cash' || order.paymentMethod === 'cod') return key === 'drawer';
  if (order.paymentAccountId) return order.paymentAccountId === key;
  return paymentAccountFor(accounts, order.paymentMethod)?.id === key;
}

/** The place name for an account id or "drawer", for the Orders filter chip. Null when it is gone. */
export function placeNameOf(
  key: string,
  accounts: readonly { id: string; method: PaymentMethod; bank: PhBank | null }[],
): string | null {
  if (key === 'drawer') return homeWords.places.drawer;
  const account = accounts.find((a) => a.id === key);
  if (!account) return null;
  if (account.method === 'bank') return placeName('bank', account.bank);
  if (account.method === 'cash' || account.method === 'cod') return homeWords.places.drawer;
  return homeWords.places[account.method];
}
