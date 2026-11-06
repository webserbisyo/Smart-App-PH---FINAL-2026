// The mock back end for the owner Editor (decisions T72 to T75): same names, inputs, outputs and error codes
// as docs/api.md "Editor (owner)". The draft and the published look are kept on the device per shop, so a
// reload keeps them and a second tab saving first gives `draft_conflict`, like NestJS will.
import {
  ContentVersionSchema,
  DEMO_SHOP_SLUGS,
  PreviewTokenSchema,
  PublishStorefrontInputSchema,
  SaveStorefrontDraftInputSchema,
  StorefrontDraftStateSchema,
  applyContent,
  contentOf,
  type ErrorCode,
  type PublicShop,
  type StorefrontDraftState,
} from '@smartapp/core';
import type { OwnerEditorAdapter } from '../adapters/types';
import type { DeviceEntry, StoredEditor } from '../device-storage';
import { token as makeToken, type Rng } from './rng';
import type { ShopState } from './state';

// A preview link is good for 30 minutes (blueprint 8.5: short-lived, owner-only, one shop).
const PREVIEW_MINUTES = 30;

export interface EditorMockDeps {
  run: <T>(area: 'editor', fn: () => T) => Promise<T>;
  requireShop: (slug: string) => ShopState;
  ownerShop: () => Promise<string>;
  now: () => Date;
  fail: (code: ErrorCode, status?: number) => never;
  storage: () => DeviceEntry<StoredEditor>;
  rng: () => Rng;
}

const EMPTY: StoredEditor = {
  draft: null,
  published: null,
  baseVersion: 0,
  contentVersion: 0,
  savedAt: null,
};

export function createEditorMock(deps: EditorMockDeps) {
  // Read fresh on every call: another tab may have saved since.
  const stored = (slug: string): StoredEditor => deps.storage().read(slug).value ?? EMPTY;
  const write = (slug: string, value: StoredEditor) => deps.storage().write(slug, value);

  function stateOf(slug: string): StorefrontDraftState {
    const s = deps.requireShop(slug);
    const st = stored(slug);
    const published = st.published ?? contentOf(s.shop.storefront);
    return StorefrontDraftStateSchema.parse({
      draft: st.draft ?? published,
      published,
      baseVersion: st.baseVersion,
      contentVersion: st.contentVersion,
      savedAt: st.savedAt,
    });
  }

  function checkVersion(slug: string, baseVersion: number): StoredEditor {
    const st = stored(slug);
    if (st.baseVersion !== baseVersion) deps.fail('draft_conflict', 409);
    return st;
  }

  const adapter: OwnerEditorAdapter = {
    getStorefrontDraft: async () => {
      const slug = await deps.ownerShop();
      return deps.run('editor', () => stateOf(slug));
    },
    saveStorefrontDraft: async (input) => {
      const { content, baseVersion } = SaveStorefrontDraftInputSchema.parse(input);
      const slug = await deps.ownerShop();
      return deps.run('editor', () => {
        const st = checkVersion(slug, baseVersion);
        write(slug, {
          ...st,
          draft: content,
          baseVersion: st.baseVersion + 1,
          savedAt: deps.now().toISOString(),
        });
        return stateOf(slug);
      });
    },
    publishStorefront: async (input) => {
      const { baseVersion } = PublishStorefrontInputSchema.parse(input);
      const slug = await deps.ownerShop();
      return deps.run('editor', () => {
        const st = checkVersion(slug, baseVersion);
        const s = deps.requireShop(slug);
        const draft = st.draft ?? st.published ?? contentOf(s.shop.storefront);
        // One step, like publish_storefront(): the shop takes the draft and the version goes up.
        s.shop.storefront = applyContent(s.shop.storefront, draft);
        const contentVersion = st.contentVersion + 1;
        write(slug, {
          draft: null,
          published: draft,
          baseVersion: st.baseVersion + 1,
          contentVersion,
          savedAt: deps.now().toISOString(),
        });
        return ContentVersionSchema.parse({ contentVersion });
      });
    },
    discardStorefrontDraft: async () => {
      const slug = await deps.ownerShop();
      return deps.run('editor', () => {
        const st = stored(slug);
        write(slug, { ...st, draft: null, baseVersion: st.baseVersion + 1, savedAt: null });
        return ContentVersionSchema.parse({ contentVersion: st.contentVersion });
      });
    },
    createPreviewToken: async () => {
      await deps.ownerShop();
      return deps.run('editor', () =>
        PreviewTokenSchema.parse({
          token: makeToken(deps.rng()),
          expiresAt: new Date(deps.now().getTime() + PREVIEW_MINUTES * 60_000).toISOString(),
        }),
      );
    },
  };

  return {
    adapter,
    /** A shop read fresh into memory takes the look its owner published on this device. */
    applyPublished(slug: string, shop: PublicShop): void {
      const published = stored(slug).published;
      if (published) shop.storefront = applyContent(shop.storefront, published);
    },
    /** The kit page and dev panel Reset: every demo shop's draft and published look go back to the pack. */
    reset(): void {
      for (const slug of DEMO_SHOP_SLUGS) deps.storage().remove(slug);
    },
  };
}
