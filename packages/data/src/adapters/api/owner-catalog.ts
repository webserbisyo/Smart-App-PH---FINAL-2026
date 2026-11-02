// TODO: When moving to NestJS in phase 4, wire this adapter into createAdapters('api')
// by switching VITE_DATA_SOURCE to 'api' for ownerCatalog with no screen changes.

import {
  CategorySchema,
  OwnerItemSchema,
  OwnerOptionGroupSchema,
  OwnerVariantTemplateSchema,
  SaveVariantTemplateResultSchema,
  UploadResultSchema,
} from '@smartapp/core';
import type { OwnerCatalogAdapter } from '../types';
import { fetchApi } from '../../api-client';
import { z } from 'zod';

export interface ApiOwnerCatalogOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export function createApiOwnerCatalogAdapter({
  baseUrl,
  getToken,
}: ApiOwnerCatalogOptions): OwnerCatalogAdapter {
  const authHeaders = async (): Promise<HeadersInit> => {
    const token = await getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  return {
    async listCategories() {
      const headers = await authHeaders();
      return fetchApi(`${baseUrl}/owner/categories`, z.array(CategorySchema), {
        method: 'GET',
        headers,
      });
    },

    async saveCategory(input) {
      const headers = await authHeaders();
      const url = input.id
        ? `${baseUrl}/owner/categories/${encodeURIComponent(input.id)}`
        : `${baseUrl}/owner/categories`;
      const method = input.id ? 'PUT' : 'POST';
      return fetchApi(url, CategorySchema, {
        method,
        headers,
        body: JSON.stringify(input),
      });
    },

    async removeCategory({ id }) {
      const headers = await authHeaders();
      await fetchApi(`${baseUrl}/owner/categories/${encodeURIComponent(id)}`, z.unknown(), {
        method: 'DELETE',
        headers,
      });
    },

    async listItems() {
      const headers = await authHeaders();
      return fetchApi(`${baseUrl}/owner/items`, z.array(OwnerItemSchema), {
        method: 'GET',
        headers,
      });
    },

    async saveItem({ id, draft }) {
      const headers = await authHeaders();
      const url = id
        ? `${baseUrl}/owner/items/${encodeURIComponent(id)}`
        : `${baseUrl}/owner/items`;
      const method = id ? 'PUT' : 'POST';
      return fetchApi(url, OwnerItemSchema, {
        method,
        headers,
        body: JSON.stringify(draft),
      });
    },

    async removeItem({ id }) {
      const headers = await authHeaders();
      await fetchApi(`${baseUrl}/owner/items/${encodeURIComponent(id)}`, z.unknown(), {
        method: 'DELETE',
        headers,
      });
    },

    async setItemStatus({ id, status }) {
      const headers = await authHeaders();
      return fetchApi(`${baseUrl}/owner/items/${encodeURIComponent(id)}/status`, OwnerItemSchema, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
    },

    async setSoldOut({ variantId, availability, soldOutUntil }) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/variants/${encodeURIComponent(variantId)}`,
        OwnerItemSchema,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            isSoldOut: availability !== 'available',
            availability,
            soldOutUntil,
          }),
        },
      );
    },

    async listOptionGroups() {
      const headers = await authHeaders();
      return fetchApi(`${baseUrl}/owner/option-groups`, z.array(OwnerOptionGroupSchema), {
        method: 'GET',
        headers,
      });
    },

    async saveOptionGroup(input) {
      const headers = await authHeaders();
      const url = input.id
        ? `${baseUrl}/owner/option-groups/${encodeURIComponent(input.id)}`
        : `${baseUrl}/owner/option-groups`;
      const method = input.id ? 'PUT' : 'POST';
      return fetchApi(url, OwnerOptionGroupSchema, {
        method,
        headers,
        body: JSON.stringify(input),
      });
    },

    async removeOptionGroup({ id }) {
      const headers = await authHeaders();
      await fetchApi(`${baseUrl}/owner/option-groups/${encodeURIComponent(id)}`, z.unknown(), {
        method: 'DELETE',
        headers,
      });
    },

    async listVariantTemplates() {
      const headers = await authHeaders();
      return fetchApi(`${baseUrl}/owner/variant-templates`, z.array(OwnerVariantTemplateSchema), {
        method: 'GET',
        headers,
      });
    },

    async saveVariantTemplate(input) {
      const headers = await authHeaders();
      const url = input.draft.id
        ? `${baseUrl}/owner/variant-templates/${encodeURIComponent(input.draft.id)}`
        : `${baseUrl}/owner/variant-templates`;
      const method = input.draft.id ? 'PUT' : 'POST';
      return fetchApi(url, SaveVariantTemplateResultSchema, {
        method,
        headers,
        body: JSON.stringify(input),
      });
    },

    async removeVariantTemplate({ id }) {
      const headers = await authHeaders();
      await fetchApi(`${baseUrl}/owner/variant-templates/${encodeURIComponent(id)}`, z.unknown(), {
        method: 'DELETE',
        headers,
      });
    },

    async saveSortOrder(input) {
      const headers = await authHeaders();
      await fetchApi(`${baseUrl}/owner/sort`, z.unknown(), {
        method: 'PUT',
        headers,
        body: JSON.stringify(input),
      });
    },

    async createUploadUrl(input) {
      const headers = await authHeaders();
      return fetchApi(`${baseUrl}/owner/uploads`, UploadResultSchema, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });
    },
  };
}
