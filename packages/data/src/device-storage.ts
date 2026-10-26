// One place for data kept on the phone (foundation section 4): versioned keys per shop, Zod-checked on read,
// memory fallback when storage is blocked, and a subscribe API for useSyncExternalStore.
import { z } from 'zod';
import {
  BasketLineSchema,
  CheckoutDraftSchema,
  IsoDateTimeSchema,
  LastAddressSchema,
  OrderReceiptSchema,
  OrderTypeEnum,
  ShopKindEnum,
  type BasketLine,
  type CheckoutDraft,
  type LastAddress,
  type OrderType,
} from '@smartapp/core';

const DAY_MS = 86_400_000;

export type StorageNotice = 'storage_reset';

export interface ReadResult<T> {
  value: T | null;
  notice: StorageNotice | null;
}

// Keys that belong to the phone, not to one shop.
export const GLOBAL_SCOPE = '_';

interface Backend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryBackend(): Backend {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/** localStorage when it works, otherwise memory for this session (Safari private mode, blocked storage). */
function pickBackend(): Backend {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return memoryBackend();
    const probe = '__smartapp_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    const storage = window.localStorage;
    return {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => storage.setItem(key, value),
      removeItem: (key) => storage.removeItem(key),
    };
  } catch {
    return memoryBackend();
  }
}

const Envelope = z.object({ v: z.number().int(), data: z.unknown() });

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storageKey(name: string, scope: string): string {
  return `smartapp:${name}:${scope}`;
}

export interface DeviceEntry<T> {
  read(scope: string): ReadResult<T>;
  /** Same object until something changes: a stable snapshot for useSyncExternalStore. */
  snapshot(scope: string): ReadResult<T>;
  write(scope: string, value: T): void;
  remove(scope: string): void;
}

export interface DeviceStorage {
  basket: DeviceEntry<BasketLine[]>;
  favourites: DeviceEntry<string[]>;
  checkoutDraft: DeviceEntry<CheckoutDraft>;
  lastAddress: DeviceEntry<LastAddress>;
  orderType: DeviceEntry<OrderType>;
  guestOrderTokens: DeviceEntry<GuestOrderToken[]>;
  savedReceipts: DeviceEntry<SavedReceipt[]>;
  // When the customer hid the install card on the receipt.
  installDismissed: DeviceEntry<string>;
  // Rewards celebrated with confetti, by how many rewards the member had used then (once per reward).
  celebratedReward: DeviceEntry<number>;
  // The stamp count the member last saw, so the counter only moves when it changed.
  seenStamps: DeviceEntry<number>;
  lastShop: DeviceEntry<LastShop>;
  // Order tokens with status notifications on (per shop).
  pushOrders: DeviceEntry<string[]>;
  // Mock mode only: what the customer created on this phone (orders, proofs, member account).
  mockState: DeviceEntry<unknown>;
  // Small copies of the proof photos sent from this phone, so the order thread can show them.
  proofPreviews: DeviceEntry<ProofPreview[]>;
  subscribe(listener: () => void): () => void;
  /** Bumps on every change; a cheap snapshot for useSyncExternalStore. */
  version(): number;
}

export const PROOF_PREVIEWS_MAX = 6;
export const ProofPreviewSchema = z.object({
  path: z.string().min(1).max(200),
  dataUrl: z.string().startsWith('data:image/'),
  savedAt: IsoDateTimeSchema,
});
export type ProofPreview = z.infer<typeof ProofPreviewSchema>;

export const GuestOrderTokenSchema = z.object({ token: z.string(), addedAt: IsoDateTimeSchema });
export type GuestOrderToken = z.infer<typeof GuestOrderTokenSchema>;

export const SavedReceiptSchema = z.object({
  receipt: OrderReceiptSchema,
  savedAt: IsoDateTimeSchema,
  endedAt: IsoDateTimeSchema.nullable(),
});
export type SavedReceipt = z.infer<typeof SavedReceiptSchema>;

// The shop this phone opened last, for the offline page (scope: all shops).
export const LastShopSchema = z.object({
  slug: z.string().max(60),
  name: z.string().max(120),
  kind: ShopKindEnum,
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i),
});
export type LastShop = z.infer<typeof LastShopSchema>;
export const LAST_SHOP_SCOPE = 'all';

export function createDeviceStorage(backend: Backend = pickBackend()): DeviceStorage {
  let store = backend;
  let changes = 0;
  const listeners = new Set<() => void>();
  const notify = () => {
    changes += 1;
    for (const listener of listeners) listener();
  };

  const safe = <T>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch {
      // Storage started throwing (quota, blocked): keep going in memory.
      store = memoryBackend();
      return fallback;
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('smartapp:')) notify();
    });
  }

  // Bump a key's version when its shape changes: the old value is dropped and the reader gets a notice.
  function entry<T>(name: string, version: number, schema: z.ZodType<T>): DeviceEntry<T> {
    const cache = new Map<string, { at: number; result: ReadResult<T> }>();
    const self: DeviceEntry<T> = {
      snapshot(scope) {
        const hit = cache.get(scope);
        if (hit && hit.at === changes) return hit.result;
        const result = self.read(scope);
        cache.set(scope, { at: changes, result });
        return result;
      },
      read(scope) {
        const raw = safe(() => store.getItem(storageKey(name, scope)), null);
        if (raw === null) return { value: null, notice: null };
        const envelope = Envelope.safeParse(parseJson(raw));
        const parsed =
          envelope.success && envelope.data.v === version
            ? schema.safeParse(envelope.data.data)
            : null;
        if (!parsed?.success) {
          safe(() => store.removeItem(storageKey(name, scope)), undefined);
          return { value: null, notice: 'storage_reset' };
        }
        return { value: parsed.data, notice: null };
      },
      write(scope, value) {
        const raw = JSON.stringify({ v: version, data: value });
        safe(() => store.setItem(storageKey(name, scope), raw), undefined);
        notify();
      },
      remove(scope) {
        safe(() => store.removeItem(storageKey(name, scope)), undefined);
        notify();
      },
    };
    return self;
  }

  return {
    basket: entry('basket', 1, z.array(BasketLineSchema)),
    favourites: entry('favourites', 1, z.array(z.string())),
    checkoutDraft: entry('checkoutDraft', 1, CheckoutDraftSchema),
    lastAddress: entry('lastAddress', 1, LastAddressSchema),
    orderType: entry('orderType', 1, OrderTypeEnum),
    guestOrderTokens: entry('guestOrderTokens', 1, z.array(GuestOrderTokenSchema)),
    savedReceipts: entry('savedReceipts', 1, z.array(SavedReceiptSchema)),
    installDismissed: entry('installDismissed', 1, IsoDateTimeSchema),
    celebratedReward: entry('celebratedReward', 1, z.number().int().min(0)),
    seenStamps: entry('seenStamps', 1, z.number().int().min(0)),
    lastShop: entry('lastShop', 1, LastShopSchema),
    pushOrders: entry('pushOrders', 1, z.array(z.string().max(80)).max(20)),
    mockState: entry('mockState', 1, z.unknown()),
    proofPreviews: entry(
      'proofPreviews',
      1,
      z.array(ProofPreviewSchema).max(PROOF_PREVIEWS_MAX),
    ),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => changes,
  };
}

let shared: DeviceStorage | null = null;

/** The phone's storage, shared by every hook and tab. */
export function getDeviceStorage(): DeviceStorage {
  shared ??= createDeviceStorage();
  return shared;
}

/** Guest order tokens are kept 90 days. */
export function pruneOrderTokens(tokens: GuestOrderToken[], now: Date): GuestOrderToken[] {
  return tokens.filter((t) => now.getTime() - new Date(t.addedAt).getTime() <= 90 * DAY_MS);
}

/** Saved receipts are kept until 7 days after the order ends. */
export function pruneSavedReceipts(receipts: SavedReceipt[], now: Date): SavedReceipt[] {
  return receipts.filter(
    (r) => !r.endedAt || now.getTime() - new Date(r.endedAt).getTime() <= 7 * DAY_MS,
  );
}
