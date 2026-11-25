// The storefront adapter for NestJS (launch phases 5 and 6, T117). Same rows as docs/api.md "Storefront";
// the shop comes from the slug in the address, and a member's session rides in its own cookie.
import {
  CustomerAddressSchema,
  LatLngSchema,
  MemberAccountSchema,
  OrderRatingSchema,
  OrderReceiptSchema,
  OrderRowSchema,
  PaymentSchema,
  PublicShopSchema,
  QuoteSchema,
  RewardClaimSchema,
  ScheduleSchema,
  ShopNewsItemSchema,
} from '@smartapp/core';
import { z } from 'zod';
import { ApiRequestError, fetchApi } from '../../api-client';
import type { StorefrontAdapter } from '../types';

export interface ApiStorefrontOptions {
  baseUrl: string;
}

const PlacedOrderSchema = z.object({
  orderId: z.string(),
  orderNo: z.number().int(),
  token: z.string(),
});
const ProofUploadSchema = z.object({ uploadUrl: z.string(), path: z.string() });
const OkSchema = z.object({ ok: z.literal(true) });
const NewsChoiceSchema = z.object({ news: z.boolean() });
const PushKeySchema = z.object({ key: z.string().nullable() });

const part = (value: string) => encodeURIComponent(value);

/** This phone's push subscription for the shop's worker, or null (no worker, no push, not subscribed). */
async function currentSubscription(): Promise<PushSubscriptionJSON | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  return subscription ? subscription.toJSON() : null;
}

/** The base64url key from the API as the bytes `pushManager.subscribe` takes. */
function keyBytes(key: string): Uint8Array<ArrayBuffer> {
  const base64 = (key + '='.repeat((4 - (key.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function createApiStorefrontAdapter({ baseUrl }: ApiStorefrontOptions): StorefrontAdapter {
  const call = <T>(
    path: string,
    schema: z.ZodType<T>,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: unknown,
  ): Promise<T> =>
    fetchApi(`${baseUrl}${path}`, schema, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  const shop = (slug: string) => `/s/${part(slug)}`;
  const order = (slug: string, token: string) => `${shop(slug)}/o/${part(token)}`;

  return {
    async getStorefront({ slug }) {
      try {
        return await call(shop(slug), PublicShopSchema, 'GET');
      } catch (error) {
        // A shop that is not live (or not there) is Not found: the page shows its 404.
        if (error instanceof ApiRequestError && error.apiError.status === 404) return null;
        throw error;
      }
    },
    getStorefrontPreview: ({ slug, previewToken }) =>
      call(
        `${shop(slug)}/preview?${new URLSearchParams({ token: previewToken }).toString()}`,
        PublicShopSchema,
        'GET',
      ),
    getSchedule: ({ slug, type, lines }) =>
      call(`${shop(slug)}/schedule`, ScheduleSchema, 'POST', { type, lines }),
    quoteOrder: ({ slug, payload }) => call(`${shop(slug)}/quote`, QuoteSchema, 'POST', payload),
    // One body with the clientKey: a retry gives back the first order.
    placeOrder: ({ slug, payload, clientKey }) =>
      call(`${shop(slug)}/orders`, PlacedOrderSchema, 'POST', { ...payload, clientKey }),
    getOrder: ({ slug, token }) => call(order(slug, token), OrderReceiptSchema, 'GET'),
    // Tokens in the body, so receipt links stay out of address logs.
    listMyOrders: ({ slug, tokens }) =>
      call(`${shop(slug)}/my-orders`, z.array(OrderRowSchema), 'POST', { tokens }),
    createProofUploadUrl: ({ slug, token }) =>
      call(`${order(slug, token)}/proof-upload`, ProofUploadSchema, 'POST', {}),
    submitProof: ({ slug, token, method, referenceNo, path }) =>
      call(`${order(slug, token)}/proof`, PaymentSchema, 'POST', { method, referenceNo, path }),
    rateOrder: ({ slug, token, stars, comment }) =>
      call(`${order(slug, token)}/rating`, OrderRatingSchema, 'POST', { stars, comment }),
    subscribePush: ({ slug, token, subscription }) =>
      call(`${order(slug, token)}/push`, OkSchema, 'POST', { subscription }),
    getPushKey: () => call('/push/key', PushKeySchema, 'GET'),
    resolveMapsLink: ({ url }) => call('/maps/resolve', LatLngSchema, 'POST', { url }),
    joinAsMember: ({ slug, name, phone, orderToken, avatar }) =>
      call(`${shop(slug)}/members`, MemberAccountSchema, 'POST', {
        name,
        phone,
        ...(orderToken ? { orderToken } : {}),
        ...(avatar ? { avatar } : {}),
      }),
    getMyAccount: ({ slug }) => call(`${shop(slug)}/me`, MemberAccountSchema.nullable(), 'GET'),
    saveMyAvatar: ({ slug, avatar }) =>
      call(`${shop(slug)}/me/avatar`, MemberAccountSchema, 'PUT', { avatar }),
    saveAddress: ({ slug, address }) =>
      call(`${shop(slug)}/me/addresses`, z.array(CustomerAddressSchema), 'PUT', address),
    removeAddress: ({ slug, id }) =>
      call(`${shop(slug)}/me/addresses/${part(id)}`, z.array(CustomerAddressSchema), 'DELETE'),
    claimReward: ({ slug }) => call(`${shop(slug)}/me/claims`, RewardClaimSchema, 'POST', {}),
    // News is kept per phone (its push subscription, T106): a phone that never subscribed has news off.
    async getNewsChoice({ slug }) {
      const subscription = await currentSubscription();
      if (!subscription?.endpoint) return { news: false };
      return call(`${shop(slug)}/push/news/check`, NewsChoiceSchema, 'POST', {
        endpoint: subscription.endpoint,
      });
    },
    // Ticking news on asks for notifications on that tap when the phone has not said yes yet.
    async setNewsChoice({ slug, news }) {
      let subscription = await currentSubscription();
      if (!subscription && news && typeof window !== 'undefined' && 'PushManager' in window) {
        const permission = await Notification.requestPermission();
        const registration = await navigator.serviceWorker.getRegistration();
        const { key } = await call('/push/key', PushKeySchema, 'GET');
        if (permission === 'granted' && registration && key) {
          const made = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes(key),
          });
          subscription = made.toJSON();
        }
      }
      if (!subscription) return { news: false };
      return call(`${shop(slug)}/push/news`, NewsChoiceSchema, 'PUT', { subscription, news });
    },
    listShopNews: ({ slug }) => call(`${shop(slug)}/news`, z.array(ShopNewsItemSchema), 'GET'),
    markNewsOpened: ({ slug, deliveryId }) =>
      call(`${shop(slug)}/news/opened`, OkSchema, 'POST', { deliveryId }),
  };
}
