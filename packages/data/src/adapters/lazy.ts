// Adapters that load their implementation on the first call. Every adapter method is async already,
// so screens can't tell; the code (and the mock's shop packs) leaves first-load JS.
import type {
  CustomerAuthAdapter,
  DataAdapters,
  OwnerOrdersAdapter,
  OwnerSamplesAdapter,
  StorefrontAdapter,
} from './types';

export function lazyAdapters(load: () => Promise<DataAdapters>): DataAdapters {
  let loading: Promise<DataAdapters> | null = null;
  const real = () => (loading ??= load());

  const storefront: StorefrontAdapter = {
    getStorefront: async (input) => (await real()).storefront.getStorefront(input),
    getStorefrontPreview: async (input) => (await real()).storefront.getStorefrontPreview(input),
    quoteOrder: async (input) => (await real()).storefront.quoteOrder(input),
    placeOrder: async (input) => (await real()).storefront.placeOrder(input),
    getOrder: async (input) => (await real()).storefront.getOrder(input),
    listMyOrders: async (input) => (await real()).storefront.listMyOrders(input),
    createProofUploadUrl: async (input) => (await real()).storefront.createProofUploadUrl(input),
    submitProof: async (input) => (await real()).storefront.submitProof(input),
    rateOrder: async (input) => (await real()).storefront.rateOrder(input),
    subscribePush: async (input) => (await real()).storefront.subscribePush(input),
    resolveMapsLink: async (input) => (await real()).storefront.resolveMapsLink(input),
    joinAsMember: async (input) => (await real()).storefront.joinAsMember(input),
    getMyAccount: async (input) => (await real()).storefront.getMyAccount(input),
    saveAddress: async (input) => (await real()).storefront.saveAddress(input),
    removeAddress: async (input) => (await real()).storefront.removeAddress(input),
    claimReward: async (input) => (await real()).storefront.claimReward(input),
  };

  const customerAuth: CustomerAuthAdapter = {
    sendCustomerCode: async (input) => (await real()).customerAuth.sendCustomerCode(input),
    verifyCustomerCode: async (input) => (await real()).customerAuth.verifyCustomerCode(input),
    signOutCustomer: async () => (await real()).customerAuth.signOutCustomer(),
  };

  const ownerOrders: OwnerOrdersAdapter = {
    listOrders: async (input) => (await real()).ownerOrders.listOrders(input),
    getOrderDetail: async (input) => (await real()).ownerOrders.getOrderDetail(input),
    getProofUrl: async (input) => (await real()).ownerOrders.getProofUrl(input),
    reviewPayment: async (input) => (await real()).ownerOrders.reviewPayment(input),
    recordPayment: async (input) => (await real()).ownerOrders.recordPayment(input),
    advanceOrder: async (input) => (await real()).ownerOrders.advanceOrder(input),
    cancelOrder: async (input) => (await real()).ownerOrders.cancelOrder(input),
    saveDeliveryInfo: async (input) => (await real()).ownerOrders.saveDeliveryInfo(input),
  };

  const ownerSamples: OwnerSamplesAdapter = {
    applySamplePack: async (input) => (await real()).ownerSamples.applySamplePack(input),
    clearSamples: async (input) => (await real()).ownerSamples.clearSamples(input),
  };

  return { storefront, customerAuth, ownerOrders, ownerSamples };
}
