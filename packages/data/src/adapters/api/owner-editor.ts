// The owner Editor adapter for NestJS (phase 4). Same rows as docs/api.md "Editor (owner)"; the shop comes
// from the owner's login, never from the address (T34).
import {
  ContentVersionSchema,
  PreviewTokenSchema,
  PublicShopSchema,
  StorefrontDraftStateSchema,
  type PublicShop,
} from '@smartapp/core';
import type { z } from 'zod';
import { fetchApi } from '../../api-client';
import type { OwnerEditorAdapter } from '../types';

export interface ApiOwnerEditorOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export function createApiOwnerEditorAdapter({
  baseUrl,
  getToken,
}: ApiOwnerEditorOptions): OwnerEditorAdapter {
  const call = async <T>(
    path: string,
    schema: z.ZodType<T>,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: unknown,
  ): Promise<T> => {
    const token = await getToken();
    return fetchApi(`${baseUrl}/owner${path}`, schema, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };

  return {
    getStorefrontDraft: () => call('/storefront/draft', StorefrontDraftStateSchema, 'GET'),
    saveStorefrontDraft: (input) =>
      call('/storefront/draft', StorefrontDraftStateSchema, 'PUT', input),
    publishStorefront: (input) => call('/storefront/draft', ContentVersionSchema, 'POST', input),
    discardStorefrontDraft: () => call('/storefront/draft', ContentVersionSchema, 'DELETE'),
    createPreviewToken: () => call('/storefront/preview-token', PreviewTokenSchema, 'POST', {}),
  };
}

/**
 * The owner's own shop as customers see it (GET /owner/storefront), for the dashboard's `getStorefront`.
 * The public `/s/:slug` answers Not found until the shop is live and in help mode (audit F-39); the slug the
 * screens pass only keys the cache, the shop comes from the login.
 */
export function createApiOwnShopRead({
  baseUrl,
  getToken,
}: ApiOwnerEditorOptions): () => Promise<PublicShop> {
  return async () => {
    const token = await getToken();
    return fetchApi(`${baseUrl}/owner/storefront`, PublicShopSchema, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };
}
