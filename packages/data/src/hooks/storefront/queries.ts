// TanStack Query hooks for the storefront. Queries pause offline; mutations never queue or retry in the background.
import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  errorWords,
  isFinal,
  type CustomerAddress,
  type OrderPayload,
  type OrderReceipt,
  type PaymentMethod,
} from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
import { ApiRequestError } from '../../api-client';
import { rememberOrderToken, saveReceipt, useGuestOrderTokens, useOnline } from './device';
import { qk } from './qk';

const ORDER_POLL_MS = 15_000;
const QUOTE_DEBOUNCE_MS = 400;

function offlineError(): ApiRequestError {
  return new ApiRequestError({ status: 0, code: 'unknown', message: errorWords('unknown') });
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export function useStorefront(slug: string) {
  const { storefront } = useAdapters();
  return useQuery({
    queryKey: qk.storefront(slug),
    queryFn: () => storefront.getStorefront({ slug }),
  });
}

/** Re-quoted 400 ms after the basket or checkout changes; keeps the last good answer while it refetches. */
export function useQuote(slug: string, payload: OrderPayload | null) {
  const { storefront } = useAdapters();
  const debounced = useDebounced(payload, QUOTE_DEBOUNCE_MS);
  return useQuery({
    queryKey: qk.quote(slug, debounced),
    queryFn: () => {
      if (!debounced) throw offlineError();
      return storefront.quoteOrder({ slug, payload: debounced });
    },
    enabled: debounced !== null,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

/** Place order: off while offline, never retried in the background (the clientKey makes a manual retry safe). */
export function usePlaceOrder(slug: string) {
  const { storefront } = useAdapters();
  const online = useOnline();
  const client = useQueryClient();
  const mutation = useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: (input: { payload: OrderPayload; clientKey: string }) => {
      if (!online) throw offlineError();
      return storefront.placeOrder({ slug, ...input });
    },
    onSuccess: (placed) => {
      rememberOrderToken(slug, placed.token, new Date());
      void client.invalidateQueries({ queryKey: qk.myOrdersAll(slug) });
      void client.invalidateQueries({ queryKey: qk.account(slug) });
    },
  });
  return { ...mutation, canPlace: online };
}

/** Polls every 15 s while the order is open and stops when it ends; keeps a copy on the phone for offline. */
export function useOrder(slug: string, token: string, initialOrder?: OrderReceipt | null) {
  const { storefront } = useAdapters();
  const query = useQuery({
    queryKey: qk.order(slug, token),
    queryFn: () => storefront.getOrder({ slug, token }),
    initialData: initialOrder ?? undefined,
    // The server copy paints first; the phone asks for the live order right away.
    initialDataUpdatedAt: 0,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status && isFinal(status) ? false : ORDER_POLL_MS;
    },
  });
  const data = query.data;
  useEffect(() => {
    if (data) saveReceipt(slug, data, new Date());
  }, [slug, data]);
  return query;
}

export function useMyOrders(slug: string) {
  const { storefront } = useAdapters();
  const tokens = useGuestOrderTokens(slug);
  return useQuery({
    queryKey: qk.myOrders(slug, tokens),
    queryFn: () => storefront.listMyOrders({ slug, tokens }),
  });
}

// Order again on My orders: loads the full order (its lines) when the button is tapped.
export function useLoadOrder(slug: string) {
  const { storefront } = useAdapters();
  const client = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: (token: string) =>
      client.fetchQuery({
        queryKey: qk.order(slug, token),
        queryFn: () => storefront.getOrder({ slug, token }),
        staleTime: 60_000,
      }),
  });
}

export function useSubmitProof(slug: string, token: string) {
  const { storefront } = useAdapters();
  const client = useQueryClient();
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: async (input: { method: PaymentMethod; referenceNo: string }) => {
      const upload = await storefront.createProofUploadUrl({ slug, token });
      return storefront.submitProof({ slug, token, ...input, path: upload.path });
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.order(slug, token) }),
  });
}

export function useRateOrder(slug: string, token: string) {
  const { storefront } = useAdapters();
  const client = useQueryClient();
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: (input: { stars: number; comment: string | null }) =>
      storefront.rateOrder({ slug, token, ...input }),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.order(slug, token) }),
  });
}

// Notify me on the receipt (T10). The mock stores nothing; T13 passes the service worker's subscription.
export function useSubscribePush(slug: string, token: string) {
  const { storefront } = useAdapters();
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: (subscription: PushSubscriptionJSON | null) =>
      storefront.subscribePush({ slug, token, subscription }),
  });
}

export function useMyAccount(slug: string) {
  const { storefront } = useAdapters();
  return useQuery({ queryKey: qk.account(slug), queryFn: () => storefront.getMyAccount({ slug }) });
}

export function useJoin(slug: string) {
  const { storefront } = useAdapters();
  const client = useQueryClient();
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: (input: { name: string; phone: string; orderToken?: string | undefined }) =>
      storefront.joinAsMember({ slug, ...input }),
    onSuccess: (account) => {
      client.setQueryData(qk.account(slug), account);
      void client.invalidateQueries({ queryKey: qk.myOrdersAll(slug) });
    },
  });
}

export function useSendCode() {
  const { customerAuth } = useAdapters();
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: (input: { email: string }) => customerAuth.sendCustomerCode(input),
  });
}

export function useVerifyCode() {
  const { customerAuth } = useAdapters();
  const client = useQueryClient();
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: (input: { email: string; code: string }) => customerAuth.verifyCustomerCode(input),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['storefront'] }),
  });
}

// Sign out on this phone: the member session ends; the basket and favourites stay.
export function useSignOutCustomer() {
  const { customerAuth } = useAdapters();
  const client = useQueryClient();
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: () => customerAuth.signOutCustomer(),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['storefront'] }),
  });
}

export function useClaimReward(slug: string) {
  const { storefront } = useAdapters();
  const client = useQueryClient();
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: () => storefront.claimReward({ slug }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.account(slug) });
      void client.invalidateQueries({ queryKey: qk.storefront(slug) });
    },
  });
}

export function useResolveMapsLink() {
  const { storefront } = useAdapters();
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: (input: { url: string }) => storefront.resolveMapsLink(input),
  });
}

export function useSaveAddress(slug: string) {
  const { storefront } = useAdapters();
  const client = useQueryClient();
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: (address: CustomerAddress) => storefront.saveAddress({ slug, address }),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.account(slug) }),
  });
}
