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

export interface SaveLocationParams {
  type: OrderType;
  scheduledAt: string | null;
  zoneId?: string | null | undefined;
  spot?: LastAddress['spot'] | undefined;
  addressLine?: string | undefined;
  houseNo?: string | undefined;
  floor?: string | undefined;
  landmark?: string | undefined;
}

/** Order type, pickup time, spot, zone and rider details, remembered per shop on the phone (storefront rules section 7). */
export function useLocationChoice(slug: string) {
  const orderType = useOrderType(slug);
  const draft = useCheckoutDraft(slug);
  const address = useLastAddress(slug);
  const choice: LocationChoice = {
    type: orderType.type,
    scheduledAt: draft.draft?.scheduledAt ?? null,
    zoneId: address.address?.zoneId ?? null,
  };
  function save(next: SaveLocationParams) {
    orderType.save(next.type);
    draft.save({ ...(draft.draft ?? EMPTY_DRAFT), scheduledAt: next.scheduledAt });
    if (next.type === 'delivery') {
      const current = address.address ?? EMPTY_ADDRESS;
      address.save({
        spot: next.spot !== undefined ? next.spot : current.spot,
        zoneId: next.zoneId !== undefined ? next.zoneId : current.zoneId,
        addressLine: next.addressLine !== undefined ? next.addressLine : current.addressLine,
        houseNo: next.houseNo !== undefined ? next.houseNo : current.houseNo,
        floor: next.floor !== undefined ? next.floor : current.floor,
        landmark: next.landmark !== undefined ? next.landmark : current.landmark,
      });
    }
  }
  return { choice, address: address.address ?? EMPTY_ADDRESS, save };
}
