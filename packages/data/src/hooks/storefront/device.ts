// Hooks for data kept on the phone. Every component and tab sees the same basket (useSyncExternalStore).
import { useSyncExternalStore } from 'react';
import {
  isFinal,
  lineIdentity,
  QTY_MAX,
  type BasketLine,
  type CheckoutDraft,
  type LastAddress,
  type OrderReceipt,
  type OrderType,
} from '@smartapp/core';
import {
  getDeviceStorage,
  pruneOrderTokens,
  pruneSavedReceipts,
  LAST_SHOP_SCOPE,
  type DeviceEntry,
  type LastShop,
  type ReadResult,
  type SavedReceipt,
} from '../../device-storage';
import { getMockScenario, subscribeMockScenario } from '../../mocks/scenario-state';

// Bundlers replace process.env.NODE_ENV at build time (Next and Vite), so dev-only code drops out of production.
declare const process: { env: { NODE_ENV?: string | undefined } };

const EMPTY = { value: null, notice: null } as const;

export function useDeviceEntry<T>(entry: DeviceEntry<T>, scope: string): ReadResult<T> {
  return useSyncExternalStore(
    getDeviceStorage().subscribe,
    () => entry.snapshot(scope),
    () => EMPTY,
  );
}

/** Adds merge by line identity (item, variant, sorted options, note); quantity stays 1 to 99. */
export function mergeLine(lines: readonly BasketLine[], line: BasketLine): BasketLine[] {
  const normal = { ...line, optionIds: [...line.optionIds].sort(), note: line.note.trim() };
  const id = lineIdentity(normal);
  const existing = lines.find((l) => lineIdentity(l) === id);
  if (!existing) return [...lines, normal];
  return lines.map((l) =>
    l === existing ? { ...l, qty: Math.min(QTY_MAX, l.qty + normal.qty) } : l,
  );
}

/** Removes a line; `restore` puts it back where it was (the Undo toast), unless it was added again meanwhile. */
export function removeLine(
  lines: readonly BasketLine[],
  identity: string,
): { lines: BasketLine[]; restore: (current: readonly BasketLine[]) => BasketLine[] } | null {
  const index = lines.findIndex((l) => lineIdentity(l) === identity);
  const removed = lines[index];
  if (!removed) return null;
  return {
    lines: lines.filter((_, i) => i !== index),
    restore: (current) => {
      if (current.some((l) => lineIdentity(l) === identity)) return [...current];
      const next = [...current];
      next.splice(Math.min(index, next.length), 0, removed);
      return next;
    },
  };
}

export interface BasketApi {
  lines: BasketLine[];
  // 'storage_reset' when an old saved basket was dropped (show one line).
  notice: 'storage_reset' | null;
  count: number;
  add(line: BasketLine): void;
  setQty(identity: string, qty: number): void;
  remove(identity: string): void;
  // Removes a line and returns Undo, or null when the line is gone already.
  removeWithUndo(identity: string): (() => void) | null;
  replace(lines: BasketLine[]): void;
  clear(): void;
}

export function useBasket(slug: string): BasketApi {
  const storage = getDeviceStorage();
  const { value, notice } = useDeviceEntry(storage.basket, slug);
  const lines = value ?? [];
  const current = () => storage.basket.read(slug).value ?? [];
  const write = (next: BasketLine[]) => storage.basket.write(slug, next);
  return {
    lines,
    notice,
    count: lines.reduce((n, l) => n + l.qty, 0),
    add: (line) => write(mergeLine(current(), line)),
    setQty: (identity, qty) =>
      write(
        current().map((l) =>
          lineIdentity(l) === identity
            ? { ...l, qty: Math.max(1, Math.min(QTY_MAX, Math.round(qty))) }
            : l,
        ),
      ),
    remove: (identity) => write(current().filter((l) => lineIdentity(l) !== identity)),
    removeWithUndo: (identity) => {
      const result = removeLine(current(), identity);
      if (!result) return null;
      write(result.lines);
      return () => write(result.restore(current()));
    },
    replace: (next) => write(next),
    clear: () => storage.basket.remove(slug),
  };
}

export function useFavourites(slug: string) {
  const storage = getDeviceStorage();
  const ids = useDeviceEntry(storage.favourites, slug).value ?? [];
  return {
    ids,
    has: (itemId: string) => ids.includes(itemId),
    toggle: (itemId: string) => {
      const saved = storage.favourites.read(slug).value ?? [];
      storage.favourites.write(
        slug,
        saved.includes(itemId) ? saved.filter((i) => i !== itemId) : [...saved, itemId],
      );
    },
  };
}

/** When the customer last hid the install card for this shop (it stays hidden 30 days). */
export function useInstallDismissed(slug: string) {
  const storage = getDeviceStorage();
  const dismissedAt = useDeviceEntry(storage.installDismissed, slug).value;
  return {
    dismissedAt,
    dismiss: (now: Date) => storage.installDismissed.write(slug, now.toISOString()),
  };
}

/** Confetti fires once per reward: remembers the last reward round celebrated on this phone. */
export function useCelebratedReward(slug: string) {
  const storage = getDeviceStorage();
  const round = useDeviceEntry(storage.celebratedReward, slug).value;
  return {
    celebrated: (next: number) => round !== null && round >= next,
    remember: (next: number) => storage.celebratedReward.write(slug, next),
  };
}

/** The stamp count shown on the last visit (null before the first). */
export function useSeenStamps(slug: string) {
  const storage = getDeviceStorage();
  const seen = useDeviceEntry(storage.seenStamps, slug).value;
  return { seen, remember: (count: number) => storage.seenStamps.write(slug, count) };
}

/** The shop this phone opened last (the offline page links back to it). */
export function useLastShop(): LastShop | null {
  return useDeviceEntry(getDeviceStorage().lastShop, LAST_SHOP_SCOPE).value;
}

/** Order status notifications switched on for these receipts (mock: kept on the phone). */
export function usePushOrders(slug: string) {
  const storage = getDeviceStorage();
  const tokens = useDeviceEntry(storage.pushOrders, slug).value ?? [];
  return {
    isOn: (token: string) => tokens.includes(token),
    set: (token: string, on: boolean) =>
      storage.pushOrders.write(
        slug,
        on
          ? [...tokens.filter((t) => t !== token), token].slice(-20)
          : tokens.filter((t) => t !== token),
      ),
  };
}

export function useCheckoutDraft(slug: string) {
  const storage = getDeviceStorage();
  const draft = useDeviceEntry(storage.checkoutDraft, slug).value;
  return {
    draft,
    save: (next: CheckoutDraft) => storage.checkoutDraft.write(slug, next),
    clear: () => storage.checkoutDraft.remove(slug),
  };
}

export function useLastAddress(slug: string) {
  const storage = getDeviceStorage();
  const address = useDeviceEntry(storage.lastAddress, slug).value;
  return { address, save: (next: LastAddress) => storage.lastAddress.write(slug, next) };
}

export function useOrderType(slug: string) {
  const storage = getDeviceStorage();
  const type = useDeviceEntry(storage.orderType, slug).value;
  return { type, save: (next: OrderType) => storage.orderType.write(slug, next) };
}

export function useGuestOrderTokens(slug: string): string[] {
  const storage = getDeviceStorage();
  return (useDeviceEntry(storage.guestOrderTokens, slug).value ?? []).map((t) => t.token);
}

/** Guest order tokens let My orders find this phone's orders (kept 90 days). */
export function rememberOrderToken(slug: string, token: string, now: Date): void {
  const storage = getDeviceStorage();
  const tokens = pruneOrderTokens(storage.guestOrderTokens.read(slug).value ?? [], now);
  if (tokens.some((t) => t.token === token)) return;
  storage.guestOrderTokens.write(slug, [...tokens, { token, addedAt: now.toISOString() }]);
}

/** The receipt kept on the phone for offline viewing (S30). */
export function useSavedReceipt(slug: string, token: string): SavedReceipt | null {
  const storage = getDeviceStorage();
  const saved = useDeviceEntry(storage.savedReceipts, slug).value ?? [];
  return saved.find((r) => r.receipt.token === token) ?? null;
}

/** Every receipt saved on this phone for the shop (My orders offline). */
export function useSavedReceipts(slug: string): SavedReceipt[] {
  const storage = getDeviceStorage();
  return useDeviceEntry(storage.savedReceipts, slug).value ?? [];
}

/** Keeps the latest receipt on the phone, until 7 days after the order ends. */
export function saveReceipt(slug: string, receipt: OrderReceipt, now: Date): void {
  const storage = getDeviceStorage();
  const list = pruneSavedReceipts(storage.savedReceipts.read(slug).value ?? [], now).filter(
    (r) => r.receipt.token !== receipt.token,
  );
  const endedAt = isFinal(receipt.status)
    ? (receipt.events[receipt.events.length - 1]?.at ?? now.toISOString())
    : null;
  storage.savedReceipts.write(slug, [...list, { receipt, savedAt: now.toISOString(), endedAt }]);
}

function subscribeOnline(listener: () => void): () => void {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  const unsubscribe = subscribeMockScenario(listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
    unsubscribe();
  };
}

function onlineNow(): boolean {
  const devOffline = process.env.NODE_ENV !== 'production' && getMockScenario().offline;
  return navigator.onLine && !devOffline;
}

/** False when the phone is offline (or the dev ?mock=offline scenario is on). */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, onlineNow, () => true);
}

// One shared minute clock for open states and slots; the dev ?now= scenario pins it.
const MINUTE_MS = 60_000;
let clock = '';
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;

const minuteNow = () => new Date(Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS).toISOString();

function subscribeClock(listener: () => void): () => void {
  clockListeners.add(listener);
  clockTimer ??= setInterval(() => {
    const next = minuteNow();
    if (next === clock) return;
    clock = next;
    for (const l of clockListeners) l();
  }, 15_000);
  const unsubscribeScenario =
    process.env.NODE_ENV !== 'production' ? subscribeMockScenario(listener) : () => {};
  return () => {
    clockListeners.delete(listener);
    unsubscribeScenario();
    if (clockListeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

function clockSnapshot(): string {
  const pinned = process.env.NODE_ENV !== 'production' ? getMockScenario().now : null;
  if (pinned) return pinned;
  clock ||= minuteNow();
  return clock;
}

/** The current minute (ISO), or null on the server and while hydrating, so open states never mismatch. */
export function useNow(): string | null {
  return useSyncExternalStore(subscribeClock, clockSnapshot, () => null);
}

/** The small copy of a proof photo sent from this phone, or null (sent elsewhere, or storage cleared). */
export function useProofPreview(slug: string, path: string): string | null {
  const { value } = useDeviceEntry(getDeviceStorage().proofPreviews, slug);
  return value?.find((p) => p.path === path)?.dataUrl ?? null;
}
