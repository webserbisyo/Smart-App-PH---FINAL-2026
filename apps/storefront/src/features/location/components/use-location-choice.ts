'use client';

import type { CheckoutDraft, LastAddress, LocationChoice, OrderType } from '@smartapp/core';
import { useCheckoutDraft, useLastAddress, useOrderType } from '@smartapp/data';

const EMPTY_DRAFT: CheckoutDraft = {
  name: '',
  phone: '',
  email: '',
  rememberMe: true,
  paymentMethod: null,
  note: '',
  scheduledAt: null,
  useReward: false,
};

const EMPTY_ADDRESS: LastAddress = {
  spot: null,
  zoneId: null,
  addressLine: '',
  houseNo: '',
  floor: '',
  landmark: '',
};

/** Order type, pickup time and zone, remembered per shop on the phone (storefront rules section 7). */
export function useLocationChoice(slug: string) {
  const orderType = useOrderType(slug);
  const draft = useCheckoutDraft(slug);
  const address = useLastAddress(slug);
  const choice: LocationChoice = {
    type: orderType.type,
    scheduledAt: draft.draft?.scheduledAt ?? null,
    zoneId: address.address?.zoneId ?? null,
  };
  function save(next: { type: OrderType; scheduledAt: string | null; zoneId: string | null }) {
    orderType.save(next.type);
    draft.save({ ...(draft.draft ?? EMPTY_DRAFT), scheduledAt: next.scheduledAt });
    if (next.type === 'delivery')
      address.save({ ...(address.address ?? EMPTY_ADDRESS), zoneId: next.zoneId });
  }
  return { choice, save };
}
