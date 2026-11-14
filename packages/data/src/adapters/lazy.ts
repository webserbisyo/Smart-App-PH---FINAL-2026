// Adapters that load their implementation on the first call. Every adapter method is async already,
// so screens can't tell; the code (and the mock's shop packs) leaves first-load JS.
import type {
  CustomerAuthAdapter,
  DataAdapters,
  OwnerCatalogAdapter,
  OwnerEditorAdapter,
  OwnerHomeAdapter,
  OwnerMembersAdapter,
  OwnerOrdersAdapter,
  OwnerSamplesAdapter,
  OnboardingAdapter,
  OwnerSettingsAdapter,
  PlatformAdapter,
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
    getSchedule: async (input) => (await real()).storefront.getSchedule(input),
  };

  const customerAuth: CustomerAuthAdapter = {
    sendCustomerCode: async (input) => (await real()).customerAuth.sendCustomerCode(input),
    verifyCustomerCode: async (input) => (await real()).customerAuth.verifyCustomerCode(input),
    signOutCustomer: async () => (await real()).customerAuth.signOutCustomer(),
  };

  const ownerOrders: OwnerOrdersAdapter = {
    listOrders: async (input) => (await real()).ownerOrders.listOrders(input),
    listScheduled: async (input) => (await real()).ownerOrders.listScheduled(input),
    findOrder: async (input) => (await real()).ownerOrders.findOrder(input),
    markSeen: async (input) => (await real()).ownerOrders.markSeen(input),
    getOrderDetail: async (input) => (await real()).ownerOrders.getOrderDetail(input),
    getProofUrl: async (input) => (await real()).ownerOrders.getProofUrl(input),
    listChats: async (input) => (await real()).ownerOrders.listChats(input),
    markChatSeen: async (input) => (await real()).ownerOrders.markChatSeen(input),
    reviewPayment: async (input) => (await real()).ownerOrders.reviewPayment(input),
    recordPayment: async (input) => (await real()).ownerOrders.recordPayment(input),
    advanceOrder: async (input) => (await real()).ownerOrders.advanceOrder(input),
    recallOrder: async (input) => (await real()).ownerOrders.recallOrder(input),
    rescheduleOrder: async (input) => (await real()).ownerOrders.rescheduleOrder(input),
    getRescheduleSchedule: async (input) => (await real()).ownerOrders.getRescheduleSchedule(input),
    saveOwnerNote: async (input) => (await real()).ownerOrders.saveOwnerNote(input),
    cancelOrder: async (input) => (await real()).ownerOrders.cancelOrder(input),
    saveDeliveryInfo: async (input) => (await real()).ownerOrders.saveDeliveryInfo(input),
    getBookingRules: async (input) => (await real()).ownerOrders.getBookingRules(input),
    saveBookingRules: async (input) => (await real()).ownerOrders.saveBookingRules(input),
    setPause: async (input) => (await real()).ownerOrders.setPause(input),
  };

  const ownerSamples: OwnerSamplesAdapter = {
    applySamplePack: async (input) => (await real()).ownerSamples.applySamplePack(input),
    clearSamples: async (input) => (await real()).ownerSamples.clearSamples(input),
  };

  const ownerCatalog: OwnerCatalogAdapter = {
    listCategories: async () => (await real()).ownerCatalog.listCategories(),
    saveCategory: async (input) => (await real()).ownerCatalog.saveCategory(input),
    removeCategory: async (input) => (await real()).ownerCatalog.removeCategory(input),
    listItems: async () => (await real()).ownerCatalog.listItems(),
    saveItem: async (input) => (await real()).ownerCatalog.saveItem(input),
    removeItem: async (input) => (await real()).ownerCatalog.removeItem(input),
    setItemStatus: async (input) => (await real()).ownerCatalog.setItemStatus(input),
    setSoldOut: async (input) => (await real()).ownerCatalog.setSoldOut(input),
    listOptionGroups: async () => (await real()).ownerCatalog.listOptionGroups(),
    saveOptionGroup: async (input) => (await real()).ownerCatalog.saveOptionGroup(input),
    removeOptionGroup: async (input) => (await real()).ownerCatalog.removeOptionGroup(input),
    listVariantTemplates: async () => (await real()).ownerCatalog.listVariantTemplates(),
    saveVariantTemplate: async (input) => (await real()).ownerCatalog.saveVariantTemplate(input),
    removeVariantTemplate: async (input) =>
      (await real()).ownerCatalog.removeVariantTemplate(input),
    saveSortOrder: async (input) => (await real()).ownerCatalog.saveSortOrder(input),
    createUploadUrl: async (input) => (await real()).ownerCatalog.createUploadUrl(input),
  };

  const ownerMembers: OwnerMembersAdapter = {
    getStampCard: async () => (await real()).ownerMembers.getStampCard(),
    previewStampCardChange: async (input) =>
      (await real()).ownerMembers.previewStampCardChange(input),
    saveStampCard: async (input) => (await real()).ownerMembers.saveStampCard(input),
    setStampCardStatus: async (input) => (await real()).ownerMembers.setStampCardStatus(input),
    getMembersOverview: async () => (await real()).ownerMembers.getMembersOverview(),
    listCustomers: async (input) => (await real()).ownerMembers.listCustomers(input),
    getMember: async (input) => (await real()).ownerMembers.getMember(input),
    findMember: async (input) => (await real()).ownerMembers.findMember(input),
    giveStamp: async (input) => (await real()).ownerMembers.giveStamp(input),
    undoChange: async (input) => (await real()).ownerMembers.undoChange(input),
    adjustStamps: async (input) => (await real()).ownerMembers.adjustStamps(input),
    useReward: async (input) => (await real()).ownerMembers.useReward(input),
    saveMemberNote: async (input) => (await real()).ownerMembers.saveMemberNote(input),
    listRewardClaims: async () => (await real()).ownerMembers.listRewardClaims(),
    giveClaim: async (input) => (await real()).ownerMembers.giveClaim(input),
    cancelClaim: async (input) => (await real()).ownerMembers.cancelClaim(input),
  };

  const ownerSettings: OwnerSettingsAdapter = {
    getSettings: async () => (await real()).ownerSettings.getSettings(),
    saveShopFacts: async (input) => (await real()).ownerSettings.saveShopFacts(input),
    saveHours: async (input) => (await real()).ownerSettings.saveHours(input),
    saveOrdering: async (input) => (await real()).ownerSettings.saveOrdering(input),
    saveDelivery: async (input) => (await real()).ownerSettings.saveDelivery(input),
    savePayments: async (input) => (await real()).ownerSettings.savePayments(input),
    getProfile: async () => (await real()).ownerSettings.getProfile(),
    saveProfile: async (input) => (await real()).ownerSettings.saveProfile(input),
    sendPasswordCode: async () => (await real()).ownerSettings.sendPasswordCode(),
    resetPasswordWithCode: async (input) =>
      (await real()).ownerSettings.resetPasswordWithCode(input),
    signOutEverywhere: async () => (await real()).ownerSettings.signOutEverywhere(),
    requestAccountDelete: async () => (await real()).ownerSettings.requestAccountDelete(),
    getNotificationPrefs: async () => (await real()).ownerSettings.getNotificationPrefs(),
    saveNotificationPrefs: async (input) =>
      (await real()).ownerSettings.saveNotificationPrefs(input),
    getPlan: async () => (await real()).ownerSettings.getPlan(),
    submitPlanPayment: async (input) => (await real()).ownerSettings.submitPlanPayment(input),
    sendPlanNote: async (input) => (await real()).ownerSettings.sendPlanNote(input),
    getStorage: async () => (await real()).ownerSettings.getStorage(),
    previewCleanup: async (input) => (await real()).ownerSettings.previewCleanup(input),
    runCleanup: async (input) => (await real()).ownerSettings.runCleanup(input),
    createExport: async (input) => (await real()).ownerSettings.createExport(input),
    getExport: async (input) => (await real()).ownerSettings.getExport(input),
  };

  const ownerHome: OwnerHomeAdapter = {
    getHome: async () => (await real()).ownerHome.getHome(),
    getHomeTrends: async (input) => (await real()).ownerHome.getHomeTrends(input),
    getHomePeriod: async (input) => (await real()).ownerHome.getHomePeriod(input),
  };

  const ownerEditor: OwnerEditorAdapter = {
    getStorefrontDraft: async () => (await real()).ownerEditor.getStorefrontDraft(),
    saveStorefrontDraft: async (input) => (await real()).ownerEditor.saveStorefrontDraft(input),
    publishStorefront: async (input) => (await real()).ownerEditor.publishStorefront(input),
    discardStorefrontDraft: async () => (await real()).ownerEditor.discardStorefrontDraft(),
    createPreviewToken: async () => (await real()).ownerEditor.createPreviewToken(),
  };

  const onboarding: OnboardingAdapter = {
    saveSignupLead: async (input) => (await real()).onboarding.saveSignupLead(input),
    registerShop: async (input) => (await real()).onboarding.registerShop(input),
    trackEvent: async (input) => (await real()).onboarding.trackEvent(input),
    getOnboarding: async () => (await real()).onboarding.getOnboarding(),
    askToGoLive: async () => (await real()).onboarding.askToGoLive(),
  };

  const platform: PlatformAdapter = {
    getAdminToday: async () => (await real()).platform.getAdminToday(),
    listAdminShops: async (input) => (await real()).platform.listAdminShops(input),
    getAdminShop: async (input) => (await real()).platform.getAdminShop(input),
    listLeads: async () => (await real()).platform.listLeads(),
    markLeadContacted: async (input) => (await real()).platform.markLeadContacted(input),
    approveGoLive: async (input) => (await real()).platform.approveGoLive(input),
    reviewPlanPayment: async (input) => (await real()).platform.reviewPlanPayment(input),
    recordPlanPayment: async (input) => (await real()).platform.recordPlanPayment(input),
    extendPlan: async (input) => (await real()).platform.extendPlan(input),
    sendPlanReminder: async (input) => (await real()).platform.sendPlanReminder(input),
    sendBillingNote: async (input) => (await real()).platform.sendBillingNote(input),
    closeShop: async (input) => (await real()).platform.closeShop(input),
    reopenShop: async (input) => (await real()).platform.reopenShop(input),
    deleteShop: async (input) => (await real()).platform.deleteShop(input),
    createClientShop: async (input) => (await real()).platform.createClientShop(input),
    startSupport: async (input) => (await real()).platform.startSupport(input),
    endSupport: async () => (await real()).platform.endSupport(),
    listAdminPayments: async (input) => (await real()).platform.listAdminPayments(input),
    getTracking: async () => (await real()).platform.getTracking(),
    setTracking: async (input) => (await real()).platform.setTracking(input),
    retryTrackEvents: async () => (await real()).platform.retryTrackEvents(),
    sendTestEvent: async () => (await real()).platform.sendTestEvent(),
    getPlatformSetup: async () => (await real()).platform.getPlatformSetup(),
    savePlatformSetup: async (input) => (await real()).platform.savePlatformSetup(input),
  };

  return {
    storefront,
    customerAuth,
    ownerOrders,
    ownerSamples,
    ownerCatalog,
    ownerMembers,
    ownerSettings,
    ownerHome,
    ownerEditor,
    onboarding,
    platform,
  };
}
