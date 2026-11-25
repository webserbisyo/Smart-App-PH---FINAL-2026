// The owner Menu adapter for NestJS (launch phase 4, T117). Same rows as docs/api.md "Catalog (owner)"; the
// shop comes from the owner's login cookie, never from the address (T34).
import {
  BulkItemsResultSchema,
  CategorySchema,
  OwnerItemSchema,
  OwnerOptionGroupSchema,
  OwnerVariantTemplateSchema,
  RemoveVariantTemplateResultSchema,
  SaveVariantTemplateResultSchema,
} from '@smartapp/core';
import { z } from 'zod';
import { fetchApi } from '../../api-client';
import type { OwnerCatalogAdapter } from '../types';

export interface ApiOwnerCatalogOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

const OkSchema = z.object({ ok: z.literal(true) });

const part = (id: string) => encodeURIComponent(id);

export function createApiOwnerCatalogAdapter({
  baseUrl,
  getToken,
}: ApiOwnerCatalogOptions): OwnerCatalogAdapter {
  const call = async <T>(
    path: string,
    schema: z.ZodType<T>,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: unknown,
  ): Promise<T> => {
    const token = await getToken();
    return fetchApi(`${baseUrl}${path}`, schema, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };

  return {
    listCategories: () => call('/owner/categories', z.array(CategorySchema), 'GET'),
    saveCategory: (input) =>
      input.id
        ? call(`/owner/categories/${part(input.id)}`, CategorySchema, 'PUT', input)
        : call('/owner/categories', CategorySchema, 'POST', input),
    removeCategory: async ({ id }) => {
      await call(`/owner/categories/${part(id)}`, OkSchema, 'DELETE');
    },

    listItems: () => call('/owner/items', z.array(OwnerItemSchema), 'GET'),
    saveItem: ({ id, draft }) =>
      id
        ? call(`/owner/items/${part(id)}`, OwnerItemSchema, 'PUT', draft)
        : call('/owner/items', OwnerItemSchema, 'POST', draft),
    removeItem: async ({ id }) => {
      await call(`/owner/items/${part(id)}`, OkSchema, 'DELETE');
    },
    setItemStatus: ({ id, status }) =>
      call(`/owner/items/${part(id)}/status`, OwnerItemSchema, 'PATCH', { status }),
    setSoldOut: ({ variantId, availability, soldOutUntil }) =>
      call(`/owner/variants/${part(variantId)}`, OwnerItemSchema, 'PATCH', {
        availability,
        soldOutUntil: soldOutUntil ?? null,
      }),
    bulkItems: (input) => call('/owner/items/bulk', BulkItemsResultSchema, 'POST', input),

    listOptionGroups: () => call('/owner/option-groups', z.array(OwnerOptionGroupSchema), 'GET'),
    saveOptionGroup: (input) =>
      input.id
        ? call(`/owner/option-groups/${part(input.id)}`, OwnerOptionGroupSchema, 'PUT', input)
        : call('/owner/option-groups', OwnerOptionGroupSchema, 'POST', input),
    removeOptionGroup: async ({ id }) => {
      await call(`/owner/option-groups/${part(id)}`, OkSchema, 'DELETE');
    },

    listVariantTemplates: () =>
      call('/owner/variant-templates', z.array(OwnerVariantTemplateSchema), 'GET'),
    saveVariantTemplate: (input) =>
      input.draft.id
        ? call(
            `/owner/variant-templates/${part(input.draft.id)}`,
            SaveVariantTemplateResultSchema,
            'PUT',
            input,
          )
        : call('/owner/variant-templates', SaveVariantTemplateResultSchema, 'POST', input),
    removeVariantTemplate: ({ id }) =>
      call(`/owner/variant-templates/${part(id)}`, RemoveVariantTemplateResultSchema, 'DELETE'),

    saveSortOrder: async (input) => {
      await call('/owner/sort', OkSchema, 'PUT', input);
    },
  };
}
