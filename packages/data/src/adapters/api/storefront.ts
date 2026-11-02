import {
  type OrderPayload,
  type OrderType,
  type PublicShop,
  type Quote,
  type Schedule,
  PublicShopSchema,
  QuoteSchema,
  ScheduleSchema,
} from '@smartapp/core';
import { z } from 'zod';
import { fetchApi } from '../../api-client';
import type { PlacedOrder, StorefrontAdapter } from '../types';

export interface ApiStorefrontOptions {
  baseUrl: string;
}

export function createApiStorefrontAdapter({
  baseUrl,
}: ApiStorefrontOptions): Pick<StorefrontAdapter, 'getStorefront' | 'getSchedule' | 'quoteOrder' | 'placeOrder'> {
  return {
    async getStorefront({ slug }) {
      return fetchApi(`${baseUrl}/s/${encodeURIComponent(slug)}`, PublicShopSchema.nullable(), {
        method: 'GET',
      });
    },

    async getSchedule({ slug, type, lines }) {
      const params = new URLSearchParams({ type });
      return fetchApi(
        `${baseUrl}/s/${encodeURIComponent(slug)}/schedule?${params.toString()}`,
        ScheduleSchema,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lines }),
        },
      );
    },

    async quoteOrder({ slug, payload }) {
      return fetchApi(`${baseUrl}/s/${encodeURIComponent(slug)}/quote`, QuoteSchema, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },

    async placeOrder({ slug, payload, clientKey }) {
      const PlacedOrderSchema = z.object({
        orderId: z.string(),
        orderNo: z.number().int(),
        token: z.string(),
      });
      return fetchApi(
        `${baseUrl}/s/${encodeURIComponent(slug)}/orders`,
        PlacedOrderSchema,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': clientKey,
          },
          body: JSON.stringify(payload),
        },
      );
    },
  };
}
