// The owner Home adapter for NestJS (phase 4). Same rows as docs/api.md "Home (owner)"; the shop comes from
// the owner's login, never from the address (T34).
import { HomePeriodDataSchema, HomeSummarySchema, HomeTrendsSchema } from '@smartapp/core';
import type { z } from 'zod';
import { fetchApi } from '../../api-client';
import type { OwnerHomeAdapter } from '../types';

export interface ApiOwnerHomeOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export function createApiOwnerHomeAdapter({
  baseUrl,
  getToken,
}: ApiOwnerHomeOptions): OwnerHomeAdapter {
  const get = async <T>(path: string, schema: z.ZodType<T>): Promise<T> => {
    const token = await getToken();
    return fetchApi(`${baseUrl}/owner${path}`, schema, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };

  return {
    getHome: () => get('/home', HomeSummarySchema),
    getHomeTrends: (input) =>
      get(`/home/trends?range=${encodeURIComponent(input.range)}`, HomeTrendsSchema),
    getHomePeriod: (input) =>
      get(
        `/home/period?from=${encodeURIComponent(input.from)}&to=${encodeURIComponent(input.to)}`,
        HomePeriodDataSchema,
      ),
  };
}
