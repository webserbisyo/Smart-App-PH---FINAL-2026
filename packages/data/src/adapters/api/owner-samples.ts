// "Start with samples" and "Clear samples" on NestJS (launch phase 4, X4). Part of the Menu area: the shop
// comes from the owner's login, so the slug the screen passes is not sent (T34).
import { PublicShopSchema } from '@smartapp/core';
import { fetchApi } from '../../api-client';
import type { OwnerSamplesAdapter } from '../types';

export interface ApiOwnerSamplesOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export function createApiOwnerSamplesAdapter({
  baseUrl,
  getToken,
}: ApiOwnerSamplesOptions): OwnerSamplesAdapter {
  const send = async (method: 'POST' | 'DELETE', body?: unknown) => {
    const token = await getToken();
    return fetchApi(`${baseUrl}/owner/samples`, PublicShopSchema, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };

  return {
    applySamplePack: ({ packSlug }) => send('POST', { packSlug }),
    clearSamples: () => send('DELETE'),
  };
}
