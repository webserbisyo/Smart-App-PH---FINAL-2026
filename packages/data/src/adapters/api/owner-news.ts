// The owner News adapter for NestJS (T106). Same rows as docs/api.md "News (owner)"; the shop comes from the
// owner's login, never from the address (T34).
import { NewsOverviewSchema, OwnerNewsSchema, PushSettingsSchema } from '@smartapp/core';
import { z } from 'zod';
import { fetchApi } from '../../api-client';
import type { OwnerNewsAdapter } from '../types';

export interface ApiOwnerNewsOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

const OkSchema = z.object({ ok: z.literal(true) });

export function createApiOwnerNewsAdapter({
  baseUrl,
  getToken,
}: ApiOwnerNewsOptions): OwnerNewsAdapter {
  const call = async <T>(
    path: string,
    schema: z.ZodType<T>,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
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
  const one = (id: string) => `/news/${encodeURIComponent(id)}`;

  return {
    getNewsOverview: () => call('/news', NewsOverviewSchema, 'GET'),
    getNews: ({ newsId }) => call(one(newsId), OwnerNewsSchema, 'GET'),
    saveNews: (input) =>
      input.id
        ? call(one(input.id), OwnerNewsSchema, 'PATCH', input)
        : call('/news', OwnerNewsSchema, 'POST', input),
    cancelNews: ({ newsId }) => call(`${one(newsId)}/cancel`, OwnerNewsSchema, 'POST'),
    deleteNews: ({ newsId }) => call(one(newsId), OkSchema, 'DELETE'),
    sendNewsTest: (input) => call('/news/test', OkSchema, 'POST', input),
    savePushSettings: (input) => call('/push-settings', PushSettingsSchema, 'PUT', input),
  };
}
