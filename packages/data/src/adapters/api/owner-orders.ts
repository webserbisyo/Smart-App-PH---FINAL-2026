import {
  BoardOrderSchema,
  BookingRulesSchema,
  ChatSummarySchema,
  DayLoadSchema,
  OpenStateSchema,
  OwnerOrderSchema,
  PaymentSchema,
  ScheduleSchema,
} from '@smartapp/core';
import { z } from 'zod';
import { fetchApi } from '../../api-client';
import type { OwnerOrdersAdapter } from '../types';

export interface ApiOwnerOrdersOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export function createApiOwnerOrdersAdapter({
  baseUrl,
  getToken,
}: ApiOwnerOrdersOptions): OwnerOrdersAdapter {
  const authHeaders = async (): Promise<HeadersInit> => {
    const token = await getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  return {
    async listOrders(input) {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      if ('open' in input && input.open) params.set('open', 'true');
      if ('date' in input && input.date) params.set('date', input.date);
      if (input.q) params.set('q', input.q);
      const query = params.toString() ? `?${params.toString()}` : '';
      return fetchApi(`${baseUrl}/owner/orders${query}`, z.array(BoardOrderSchema), {
        method: 'GET',
        headers,
      });
    },

    async listScheduled(input) {
      const headers = await authHeaders();
      const params = new URLSearchParams({ from: input.from, to: input.to });
      return fetchApi(
        `${baseUrl}/owner/orders/scheduled?${params.toString()}`,
        z.object({
          orders: z.array(BoardOrderSchema),
          days: z.array(DayLoadSchema),
        }),
        { method: 'GET', headers },
      );
    },

    async findOrder(input) {
      const headers = await authHeaders();
      const params = new URLSearchParams({ code: input.code });
      return fetchApi(
        `${baseUrl}/owner/orders/find?${params.toString()}`,
        z.array(BoardOrderSchema),
        { method: 'GET', headers },
      );
    },

    async markSeen(input) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/orders/${encodeURIComponent(input.orderId)}/seen`,
        BoardOrderSchema,
        { method: 'POST', headers },
      );
    },

    async getOrderDetail(input) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/orders/${encodeURIComponent(input.orderId)}`,
        OwnerOrderSchema,
        { method: 'GET', headers },
      );
    },

    async getProofUrl(input) {
      const headers = await authHeaders();
      const res = await fetchApi(
        `${baseUrl}/owner/orders/proof-url?path=${encodeURIComponent(input.path)}`,
        z.object({ url: z.string() }),
        { method: 'GET', headers },
      );
      return res.url;
    },

    async listChats() {
      const headers = await authHeaders();
      return fetchApi(`${baseUrl}/owner/chats`, z.array(ChatSummarySchema), {
        method: 'GET',
        headers,
      });
    },

    async markChatSeen(input) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/chats/${encodeURIComponent(input.orderId)}/seen`,
        ChatSummarySchema,
        { method: 'POST', headers },
      );
    },

    async reviewPayment(input) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/orders/${encodeURIComponent(input.orderId)}/payment`,
        PaymentSchema,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            approve: input.approve,
            rejectReason: input.rejectReason ?? null,
          }),
        },
      );
    },

    async recordPayment(input) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/orders/${encodeURIComponent(input.orderId)}/payment/record`,
        PaymentSchema,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ method: input.method }),
        },
      );
    },

    async advanceOrder(input) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/orders/${encodeURIComponent(input.orderId)}/advance`,
        OwnerOrderSchema,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            toStatus: input.toStatus,
            trackingUrl: input.trackingUrl ?? null,
          }),
        },
      );
    },

    async recallOrder(input) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/orders/${encodeURIComponent(input.orderId)}/recall`,
        OwnerOrderSchema,
        { method: 'POST', headers },
      );
    },

    async rescheduleOrder(input) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/orders/${encodeURIComponent(input.orderId)}/reschedule`,
        OwnerOrderSchema,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            scheduledAt: input.scheduledAt,
            override: input.override ?? false,
          }),
        },
      );
    },

    async getRescheduleSchedule(input) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/orders/${encodeURIComponent(input.orderId)}/schedule`,
        ScheduleSchema,
        { method: 'GET', headers },
      );
    },

    async saveOwnerNote(input) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/orders/${encodeURIComponent(input.orderId)}/note`,
        OwnerOrderSchema,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ note: input.note }),
        },
      );
    },

    async cancelOrder(input) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/orders/${encodeURIComponent(input.orderId)}/cancel`,
        OwnerOrderSchema,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason: input.reason }),
        },
      );
    },

    async saveDeliveryInfo(input) {
      const headers = await authHeaders();
      return fetchApi(
        `${baseUrl}/owner/orders/${encodeURIComponent(input.orderId)}/delivery`,
        OwnerOrderSchema,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            provider: input.provider ?? null,
            trackingUrl: input.trackingUrl ?? null,
            riderName: input.riderName ?? null,
            riderPhone: input.riderPhone ?? null,
          }),
        },
      );
    },

    async getBookingRules() {
      const headers = await authHeaders();
      return fetchApi(`${baseUrl}/owner/booking-rules`, BookingRulesSchema, {
        method: 'GET',
        headers,
      });
    },

    async saveBookingRules(input) {
      const headers = await authHeaders();
      return fetchApi(`${baseUrl}/owner/booking-rules`, BookingRulesSchema, {
        method: 'PUT',
        headers,
        body: JSON.stringify(input.rules),
      });
    },

    async setPause(input) {
      const headers = await authHeaders();
      return fetchApi(`${baseUrl}/owner/pause`, OpenStateSchema, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode: input.mode }),
      });
    },
  };
}
