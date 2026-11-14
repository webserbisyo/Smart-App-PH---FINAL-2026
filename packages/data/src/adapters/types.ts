// One interface per area, named exactly like the rows in docs/api.md. The mock implements every row; the API
// adapter for each area comes in phase 4.
import type {
  HomeRange,
  HomeSummary,
  HomePeriodData,
  HomeTrends,
  AdjustStampsInput,
  Availability,
  ClaimCancelReason,
  CounterChange,
  CustomerPage,
  FoundMember,
  ListCustomersInput,
  MemberDetail,
  MembersOverview,
  OwnerClaim,
  StampCardImpact,
  StampCardSettings,
  StampCardStatus,
  BoardOrder,
  BookingRules,
  Category,
  CategoryDraft,
  CustomerAddress,
  DayLoad,
  ItemDraft,
  ItemStatus,
  LatLng,
  MemberAccount,
  OpenState,
  OptionGroupDraft,
  OrderPayload,
  OrderRating,
  OrderReceipt,
  OrderRow,
  OrderStatus,
  OrderType,
  OwnerItem,
  OwnerOptionGroup,
  OwnerOrder,
  ChatSummary,
  OwnerVariantTemplate,
  PauseMode,
  Payment,
  PaymentMethod,
  PublicShop,
  Quote,
  RewardClaim,
  RemoveVariantTemplateResult,
  SaveVariantTemplateInput,
  SaveVariantTemplateResult,
  Schedule,
  SendCodeResult,
  SortOrderInput,
  UploadKind,
  UploadResult,
  CleanupKind,
  CleanupPreview,
  CreateExportInput,
  DataExport,
  DeliverySettings,
  HoursSettings,
  NotificationPrefs,
  OrderingSettings,
  OwnerProfile,
  OwnerSettings,
  PaymentSettings,
  Plan,
  SaveProfileInput,
  ShopFacts,
  StorageSummary,
  SubmitPlanPaymentInput,
  ContentVersion,
  PreviewToken,
  PublishStorefrontInput,
  SaveStorefrontDraftInput,
  StorefrontDraftState,
  AdminLead,
  AdminPaymentList,
  AdminShopDetail,
  AdminShopList,
  AdminToday,
  BillingNoteInput,
  CloseShopInput,
  CreateClientInput,
  DeleteShopInput,
  ExtendDaysInput,
  LeadIdInput,
  ListAdminPaymentsInput,
  ListAdminShopsInput,
  OwnerOnboarding,
  PlatformSetup,
  RecordPlanPaymentInput,
  RegisterShopInput,
  ReviewPlanPaymentInput,
  SendBillingNoteInput,
  SetTrackingInput,
  ShopIdInput,
  SignupLeadInput,
  SignupLeadResult,
  StartSupportInput,
  SupportSession,
  TrackInput,
  TrackingSummary,
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
  getSchedule(input: {
    slug: string;
    type: OrderType;
    lines: readonly { itemId: string; qty: number }[];
  }): Promise<Schedule>;
}

export interface CustomerAuthAdapter {
  sendCustomerCode(input: { email: string }): Promise<SendCodeResult>;
  verifyCustomerCode(input: { email: string; code: string }): Promise<{ email: string }>;
  signOutCustomer(): Promise<void>;
}

export interface OwnerOrdersAdapter {
  listOrders(
    input:
      | { slug: string; open: true; q?: string | undefined }
      | { slug: string; date: string; q?: string | undefined },
  ): Promise<BoardOrder[]>;
  listScheduled(input: {
    slug: string;
    from: string;
    to: string;
  }): Promise<{ orders: BoardOrder[]; days: DayLoad[] }>;
  findOrder(input: { slug: string; code: string }): Promise<BoardOrder[]>;
  markSeen(input: { slug: string; orderId: string }): Promise<BoardOrder>;
  getOrderDetail(input: { slug: string; orderId: string }): Promise<OwnerOrder>;
  getProofUrl(input: { slug: string; path: string }): Promise<string>;
  // The Chats list (T87): open orders' chats and today's finished ones, waiting first.
  listChats(input: { slug: string }): Promise<ChatSummary[]>;
  // The owner opened an order's chat: the customer's lines count as seen.
  markChatSeen(input: { slug: string; orderId: string }): Promise<ChatSummary>;
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
  recallOrder(input: { slug: string; orderId: string }): Promise<OwnerOrder>;
  rescheduleOrder(input: {
    slug: string;
    orderId: string;
    scheduledAt: string;
    override?: boolean | undefined;
  }): Promise<OwnerOrder>;
  // The days and times this order can move to (T85): its own spot and items count as free.
  getRescheduleSchedule(input: { slug: string; orderId: string }): Promise<Schedule>;
  saveOwnerNote(input: { slug: string; orderId: string; note: string | null }): Promise<OwnerOrder>;
  cancelOrder(input: { slug: string; orderId: string; reason: string }): Promise<OwnerOrder>;
  saveDeliveryInfo(input: {
    slug: string;
    orderId: string;
    provider?: string | undefined;
    trackingUrl?: string | undefined;
    riderName?: string | undefined;
    riderPhone?: string | undefined;
  }): Promise<OwnerOrder>;
  getBookingRules(input: { slug: string }): Promise<BookingRules>;
  saveBookingRules(input: { slug: string; rules: BookingRules }): Promise<BookingRules>;
  setPause(input: { slug: string; mode: PauseMode }): Promise<OpenState>;
}

export interface OwnerSamplesAdapter {
  applySamplePack(input: { slug: string; packSlug: string }): Promise<PublicShop>;
  clearSamples(input: { slug: string }): Promise<PublicShop>;
}

export interface OwnerCatalogAdapter {
  listCategories(): Promise<Category[]>;
  saveCategory(input: CategoryDraft): Promise<Category>;
  removeCategory(input: { id: string }): Promise<void>;
  listItems(): Promise<OwnerItem[]>;
  saveItem(input: { id?: string; draft: ItemDraft }): Promise<OwnerItem>;
  removeItem(input: { id: string }): Promise<void>;
  setItemStatus(input: { id: string; status: ItemStatus }): Promise<OwnerItem>;
  setSoldOut(input: {
    variantId: string;
    availability: Availability;
    soldOutUntil?: string | null;
  }): Promise<OwnerItem>;
  listOptionGroups(): Promise<OwnerOptionGroup[]>;
  saveOptionGroup(input: OptionGroupDraft): Promise<OwnerOptionGroup>;
  removeOptionGroup(input: { id: string }): Promise<void>;
  listVariantTemplates(): Promise<OwnerVariantTemplate[]>;
  saveVariantTemplate(input: SaveVariantTemplateInput): Promise<SaveVariantTemplateResult>;
  removeVariantTemplate(input: { id: string }): Promise<RemoveVariantTemplateResult>;
  saveSortOrder(input: SortOrderInput): Promise<void>;
  // bytes: the size after shrinking, checked against the shop's storage (T66); never asked for proofs.
  createUploadUrl(input: { kind: UploadKind; bytes?: number | undefined }): Promise<UploadResult>;
}

// The shop comes from the owner's login (T34), so no method takes a slug.
export interface OwnerMembersAdapter {
  getStampCard(): Promise<StampCardSettings>;
  previewStampCardChange(input: StampCardSettings): Promise<StampCardImpact>;
  saveStampCard(input: StampCardSettings): Promise<StampCardSettings>;
  setStampCardStatus(input: { status: StampCardStatus }): Promise<StampCardSettings>;
  getMembersOverview(): Promise<MembersOverview>;
  listCustomers(input: ListCustomersInput): Promise<CustomerPage>;
  getMember(input: { customerId: string }): Promise<MemberDetail>;
  findMember(input: { code: string }): Promise<FoundMember>;
  giveStamp(input: {
    customerId: string;
    clientKey: string;
    confirmRecent: boolean;
  }): Promise<CounterChange>;
  undoChange(input: { customerId: string; entryId: string }): Promise<MemberDetail>;
  adjustStamps(input: AdjustStampsInput): Promise<MemberDetail>;
  useReward(input: { customerId: string; clientKey: string }): Promise<CounterChange>;
  saveMemberNote(input: { customerId: string; note: string | null }): Promise<MemberDetail>;
  listRewardClaims(): Promise<OwnerClaim[]>;
  giveClaim(input: { claimId: string }): Promise<OwnerClaim>;
  cancelClaim(input: { claimId: string; reason: ClaimCancelReason }): Promise<OwnerClaim>;
}

// Owner Settings (decisions T64 to T68): one read for the shop's settings, one save per section, the
// owner's profile and emails, the Pro plan, storage, cleanups and exports. No method takes a slug (T34).
export interface OwnerSettingsAdapter {
  getSettings(): Promise<OwnerSettings>;
  saveShopFacts(input: ShopFacts): Promise<OwnerSettings>;
  saveHours(input: HoursSettings): Promise<OwnerSettings>;
  saveOrdering(input: OrderingSettings): Promise<OwnerSettings>;
  saveDelivery(input: DeliverySettings): Promise<OwnerSettings>;
  savePayments(input: PaymentSettings): Promise<OwnerSettings>;
  getProfile(): Promise<OwnerProfile>;
  saveProfile(input: SaveProfileInput): Promise<OwnerProfile>;
  sendPasswordCode(): Promise<SendCodeResult>;
  resetPasswordWithCode(input: { code: string; newPassword: string }): Promise<{ ok: true }>;
  signOutEverywhere(): Promise<{ ok: true }>;
  requestAccountDelete(): Promise<{ ok: true }>;
  getNotificationPrefs(): Promise<NotificationPrefs>;
  saveNotificationPrefs(input: NotificationPrefs): Promise<NotificationPrefs>;
  getPlan(): Promise<Plan>;
  submitPlanPayment(input: SubmitPlanPaymentInput): Promise<Plan>;
  // The Billing chat (T88): a short note to Smart App PH.
  sendPlanNote(input: SendBillingNoteInput): Promise<Plan>;
  getStorage(): Promise<StorageSummary>;
  previewCleanup(input: { kind: CleanupKind }): Promise<CleanupPreview>;
  runCleanup(input: { kind: CleanupKind; token: string }): Promise<StorageSummary>;
  createExport(input: CreateExportInput): Promise<DataExport>;
  getExport(input: { id: string }): Promise<DataExport>;
}

// Owner Home (decisions T69 to T71): today's numbers and the 7 or 30 day trend. The live board comes from
// listOrders, so Home and Orders always show the same orders.
export interface OwnerHomeAdapter {
  getHome(): Promise<HomeSummary>;
  // Kept for Insights (MVP B): Home itself no longer compares periods (T83).
  getHomeTrends(input: { range: HomeRange }): Promise<HomeTrends>;
  // One period's plain facts for the Home period picker (T83); dates are Manila days.
  getHomePeriod(input: { from: string; to: string }): Promise<HomePeriodData>;
}

// Owner Editor (decisions T72 to T75): one draft per shop, saved with the version it started from.
export interface OwnerEditorAdapter {
  getStorefrontDraft(): Promise<StorefrontDraftState>;
  saveStorefrontDraft(input: SaveStorefrontDraftInput): Promise<StorefrontDraftState>;
  publishStorefront(input: PublishStorefrontInput): Promise<ContentVersion>;
  discardStorefrontDraft(): Promise<ContentVersion>;
  createPreviewToken(): Promise<PreviewToken>;
}

// Sign-up and going live (T89, T90): the public sign-up steps, the browser events the server sends on to
// Meta, and the owner's go-live checklist. registerShop needs the new owner's login.
export interface OnboardingAdapter {
  saveSignupLead(input: SignupLeadInput): Promise<SignupLeadResult>;
  registerShop(input: RegisterShopInput): Promise<OwnerOnboarding>;
  trackEvent(input: TrackInput): Promise<{ ok: true }>;
  getOnboarding(): Promise<OwnerOnboarding>;
  askToGoLive(): Promise<OwnerOnboarding>;
}

// Super Admin (decisions T88 to T92): the platform admin only; anyone else gets Not found (rule 12).
export interface PlatformAdapter {
  getAdminToday(): Promise<AdminToday>;
  listAdminShops(input: ListAdminShopsInput): Promise<AdminShopList>;
  getAdminShop(input: ShopIdInput): Promise<AdminShopDetail>;
  listLeads(): Promise<AdminLead[]>;
  markLeadContacted(input: LeadIdInput): Promise<AdminLead>;
  approveGoLive(input: ShopIdInput): Promise<AdminShopDetail>;
  reviewPlanPayment(input: ReviewPlanPaymentInput): Promise<AdminShopDetail>;
  recordPlanPayment(input: RecordPlanPaymentInput): Promise<AdminShopDetail>;
  extendPlan(input: ExtendDaysInput): Promise<AdminShopDetail>;
  sendPlanReminder(input: ShopIdInput): Promise<AdminShopDetail>;
  sendBillingNote(input: BillingNoteInput): Promise<AdminShopDetail>;
  closeShop(input: CloseShopInput): Promise<AdminShopDetail>;
  reopenShop(input: ShopIdInput): Promise<AdminShopDetail>;
  deleteShop(input: DeleteShopInput): Promise<{ ok: true }>;
  createClientShop(input: CreateClientInput): Promise<AdminShopDetail>;
  startSupport(input: StartSupportInput): Promise<SupportSession>;
  endSupport(): Promise<{ ok: true }>;
  listAdminPayments(input: ListAdminPaymentsInput): Promise<AdminPaymentList>;
  getTracking(): Promise<TrackingSummary>;
  setTracking(input: SetTrackingInput): Promise<TrackingSummary>;
  retryTrackEvents(): Promise<TrackingSummary>;
  sendTestEvent(): Promise<TrackingSummary>;
  getPlatformSetup(): Promise<PlatformSetup>;
  savePlatformSetup(input: PlatformSetup): Promise<PlatformSetup>;
}

export interface DataAdapters {
  storefront: StorefrontAdapter;
  customerAuth: CustomerAuthAdapter;
  ownerOrders: OwnerOrdersAdapter;
  ownerSamples: OwnerSamplesAdapter;
  ownerCatalog: OwnerCatalogAdapter;
  ownerMembers: OwnerMembersAdapter;
  ownerSettings: OwnerSettingsAdapter;
  ownerHome: OwnerHomeAdapter;
  ownerEditor: OwnerEditorAdapter;
  onboarding: OnboardingAdapter;
  platform: PlatformAdapter;
}
