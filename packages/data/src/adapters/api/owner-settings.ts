// The owner Settings adapter for NestJS (phase 4). Same rows as docs/api.md "Settings (owner)"; the shop
// comes from the owner's login, never from the address (T34).
import {
  CleanupPreviewSchema,
  DataExportSchema,
  NotificationPrefsSchema,
  OwnerProfileSchema,
  OwnerSettingsSchema,
  PlanSchema,
  SendCodeResultSchema,
  StorageSummarySchema,
} from '@smartapp/core';
import { z } from 'zod';
import { fetchApi } from '../../api-client';
import type { OwnerSettingsAdapter } from '../types';

export interface ApiOwnerSettingsOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

const OkSchema = z.object({ ok: z.literal(true) });

export function createApiOwnerSettingsAdapter({
  baseUrl,
  getToken,
}: ApiOwnerSettingsOptions): OwnerSettingsAdapter {
  const call = async <T>(
    path: string,
    schema: z.ZodType<T>,
    method: 'GET' | 'POST' | 'PUT',
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
    getSettings: () => call('/owner/settings', OwnerSettingsSchema, 'GET'),
    saveShopFacts: (input) => call('/owner/settings/shop', OwnerSettingsSchema, 'PUT', input),
    saveHours: (input) => call('/owner/hours', OwnerSettingsSchema, 'PUT', input),
    saveOrdering: (input) => call('/owner/settings/ordering', OwnerSettingsSchema, 'PUT', input),
    saveDelivery: (input) => call('/owner/settings/delivery', OwnerSettingsSchema, 'PUT', input),
    savePayments: (input) => call('/owner/settings/payments', OwnerSettingsSchema, 'PUT', input),
    getProfile: () => call('/owner/profile', OwnerProfileSchema, 'GET'),
    saveProfile: (input) => call('/owner/profile', OwnerProfileSchema, 'PUT', input),
    sendPasswordCode: () => call('/auth/password-code', SendCodeResultSchema, 'POST', {}),
    resetPasswordWithCode: (input) => call('/auth/password', OkSchema, 'POST', input),
    signOutEverywhere: () => call('/auth/sign-out-all', OkSchema, 'POST', {}),
    requestAccountDelete: () => call('/owner/account/delete-request', OkSchema, 'POST', {}),
    getNotificationPrefs: () => call('/owner/notifications', NotificationPrefsSchema, 'GET'),
    saveNotificationPrefs: (input) =>
      call('/owner/notifications', NotificationPrefsSchema, 'PUT', input),
    getPlan: () => call('/owner/plan', PlanSchema, 'GET'),
    submitPlanPayment: (input) => call('/owner/plan/payments', PlanSchema, 'POST', input),
    sendPlanNote: (input) => call('/owner/plan/notes', PlanSchema, 'POST', input),
    getStorage: () => call('/owner/storage', StorageSummarySchema, 'GET'),
    previewCleanup: ({ kind }) =>
      call(`/owner/storage/cleanup?kind=${encodeURIComponent(kind)}`, CleanupPreviewSchema, 'GET'),
    runCleanup: (input) => call('/owner/storage/cleanup', StorageSummarySchema, 'POST', input),
    createExport: (input) => call('/owner/exports', DataExportSchema, 'POST', input),
    getExport: ({ id }) =>
      call(`/owner/exports/${encodeURIComponent(id)}`, DataExportSchema, 'GET'),
  };
}
