// Super Admin for NestJS (T88 to T92). Same rows as docs/api.md "Super Admin". Every route checks the
// platform admin flag on the login; anyone else gets Not found (rule 12).
import {
  AdminLeadSchema,
  AdminPaymentListSchema,
  AdminShopDetailSchema,
  AdminShopListSchema,
  AdminTodaySchema,
  PlatformSetupSchema,
  SupportSessionSchema,
  TrackingSummarySchema,
} from '@smartapp/core';
import { z } from 'zod';
import { fetchApi } from '../../api-client';
import type { PlatformAdapter } from '../types';

export interface ApiPlatformOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

const OkSchema = z.object({ ok: z.literal(true) });

export function createApiPlatformAdapter({
  baseUrl,
  getToken,
}: ApiPlatformOptions): PlatformAdapter {
  const call = async <T>(
    path: string,
    schema: z.ZodType<T>,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: unknown,
  ): Promise<T> => {
    const token = await getToken();
    return fetchApi(`${baseUrl}/admin${path}`, schema, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };
  const shop = (id: string) => `/shops/${encodeURIComponent(id)}`;

  return {
    getAdminToday: () => call('/today', AdminTodaySchema, 'GET'),
    listAdminShops: ({ filter, q }) =>
      call(
        `/shops?filter=${encodeURIComponent(filter)}&q=${encodeURIComponent(q ?? '')}`,
        AdminShopListSchema,
        'GET',
      ),
    getAdminShop: ({ shopId }) => call(shop(shopId), AdminShopDetailSchema, 'GET'),
    listLeads: () => call('/leads', z.array(AdminLeadSchema), 'GET'),
    markLeadContacted: ({ leadId }) =>
      call(`/leads/${encodeURIComponent(leadId)}/contacted`, AdminLeadSchema, 'POST', {}),
    approveGoLive: ({ shopId }) =>
      call(`${shop(shopId)}/approve`, AdminShopDetailSchema, 'POST', {}),
    reviewPlanPayment: (input) =>
      call(
        `${shop(input.shopId)}/payments/${encodeURIComponent(input.paymentId)}/review`,
        AdminShopDetailSchema,
        'POST',
        input,
      ),
    recordPlanPayment: (input) =>
      call(`${shop(input.shopId)}/payments`, AdminShopDetailSchema, 'POST', input),
    extendPlan: (input) =>
      call(`${shop(input.shopId)}/extra-days`, AdminShopDetailSchema, 'POST', input),
    sendPlanReminder: ({ shopId }) =>
      call(`${shop(shopId)}/reminder`, AdminShopDetailSchema, 'POST', {}),
    sendBillingNote: (input) =>
      call(`${shop(input.shopId)}/notes`, AdminShopDetailSchema, 'POST', input),
    closeShop: (input) => call(`${shop(input.shopId)}/close`, AdminShopDetailSchema, 'POST', input),
    reopenShop: ({ shopId }) => call(`${shop(shopId)}/reopen`, AdminShopDetailSchema, 'POST', {}),
    deleteShop: (input) => call(shop(input.shopId), OkSchema, 'DELETE', input),
    createClientShop: (input) => call('/shops', AdminShopDetailSchema, 'POST', input),
    startSupport: (input) => call('/support', SupportSessionSchema, 'POST', input),
    endSupport: () => call('/support/end', OkSchema, 'POST', {}),
    listAdminPayments: ({ view }) =>
      call(`/payments?view=${encodeURIComponent(view)}`, AdminPaymentListSchema, 'GET'),
    getTracking: () => call('/tracking', TrackingSummarySchema, 'GET'),
    setTracking: (input) => call('/tracking', TrackingSummarySchema, 'PUT', input),
    retryTrackEvents: () => call('/tracking/retry', TrackingSummarySchema, 'POST', {}),
    sendTestEvent: () => call('/tracking/test', TrackingSummarySchema, 'POST', {}),
    getPlatformSetup: () => call('/setup', PlatformSetupSchema, 'GET'),
    savePlatformSetup: (input) => call('/setup', PlatformSetupSchema, 'PUT', input),
  };
}
