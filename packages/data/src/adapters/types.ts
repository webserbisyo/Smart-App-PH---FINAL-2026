// One interface per area, named exactly like the rows in docs/api.md. The mock implements every row; the API
// adapter for each area comes in phase 4.
import type {
  BoardOrder,
  CustomerAddress,
  LatLng,
  MemberAccount,
  OrderPayload,
  OrderRating,
  OrderReceipt,
  OrderRow,
  OrderStatus,
  OwnerOrder,
  Payment,
  PaymentMethod,
  PublicShop,
  Quote,
  RewardClaim,
  SendCodeResult,
} from '@smartapp/core';

export interface PlacedOrder {
  orderId: string;
  orderNo: number;
  token: string;
}

export interface ProofUpload {
  uploadUrl: string;
  path: string;
}

export interface StorefrontAdapter {
  getStorefront(input: { slug: string }): Promise<PublicShop | null>;
  getStorefrontPreview(input: { slug: string; previewToken: string }): Promise<PublicShop>;
  quoteOrder(input: { slug: string; payload: OrderPayload }): Promise<Quote>;
  placeOrder(input: {
    slug: string;
    payload: OrderPayload;
    clientKey: string;
  }): Promise<PlacedOrder>;
  getOrder(input: { slug: string; token: string }): Promise<OrderReceipt>;
  listMyOrders(input: { slug: string; tokens: readonly string[] }): Promise<OrderRow[]>;
  createProofUploadUrl(input: { slug: string; token: string }): Promise<ProofUpload>;
  submitProof(input: {
    slug: string;
    token: string;
    method: PaymentMethod;
    referenceNo: string;
    path: string;
  }): Promise<Payment>;
  rateOrder(input: {
    slug: string;
    token: string;
    stars: number;
    comment: string | null;
  }): Promise<OrderRating>;
  subscribePush(input: {
    slug: string;
    token: string;
    subscription: unknown;
  }): Promise<{ ok: true }>;
  resolveMapsLink(input: { url: string }): Promise<LatLng>;
  joinAsMember(input: {
    slug: string;
    name: string;
    phone: string;
    orderToken?: string | undefined;
  }): Promise<MemberAccount>;
  getMyAccount(input: { slug: string }): Promise<MemberAccount | null>;
  saveAddress(input: { slug: string; address: CustomerAddress }): Promise<CustomerAddress[]>;
  removeAddress(input: { slug: string; id: string }): Promise<CustomerAddress[]>;
  claimReward(input: { slug: string }): Promise<RewardClaim>;
}

export interface CustomerAuthAdapter {
  sendCustomerCode(input: { email: string }): Promise<SendCodeResult>;
  verifyCustomerCode(input: { email: string; code: string }): Promise<{ email: string }>;
  signOutCustomer(): Promise<void>;
}

export interface OwnerOrdersAdapter {
  listOrders(
    input: { slug: string; open: true } | { slug: string; date: string },
  ): Promise<BoardOrder[]>;
  getOrderDetail(input: { slug: string; orderId: string }): Promise<OwnerOrder>;
  getProofUrl(input: { slug: string; path: string }): Promise<string>;
  reviewPayment(input: {
    slug: string;
    orderId: string;
    approve: boolean;
    rejectReason?: string | undefined;
  }): Promise<Payment>;
  recordPayment(input: { slug: string; orderId: string; method: PaymentMethod }): Promise<Payment>;
  advanceOrder(input: {
    slug: string;
    orderId: string;
    toStatus: OrderStatus;
    trackingUrl?: string | undefined;
  }): Promise<OwnerOrder>;
  cancelOrder(input: { slug: string; orderId: string; reason: string }): Promise<OwnerOrder>;
  saveDeliveryInfo(input: {
    slug: string;
    orderId: string;
    provider?: string | undefined;
    trackingUrl?: string | undefined;
    riderName?: string | undefined;
    riderPhone?: string | undefined;
  }): Promise<OwnerOrder>;
}

export interface OwnerSamplesAdapter {
  applySamplePack(input: { slug: string; packSlug: string }): Promise<PublicShop>;
  clearSamples(input: { slug: string }): Promise<PublicShop>;
}

export interface DataAdapters {
  storefront: StorefrontAdapter;
  customerAuth: CustomerAuthAdapter;
  ownerOrders: OwnerOrdersAdapter;
  ownerSamples: OwnerSamplesAdapter;
}
