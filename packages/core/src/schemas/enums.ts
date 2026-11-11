import { z } from 'zod';

// Closed lists: an `as const` array plus a Zod enum, mirrored by a database CHECK later (AGENTS rule 5).

export const ORDER_TYPES = ['walk_in', 'pickup', 'delivery'] as const;
export const OrderTypeEnum = z.enum(ORDER_TYPES);
export type OrderType = z.infer<typeof OrderTypeEnum>;

export const ORDER_STATUSES = [
  'placed',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
  'expired',
] as const;
export const OrderStatusEnum = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

// A shop's page surface: light (most shops) or dark (night brands such as a burger stand).
export const SHOP_SURFACES = ['light', 'dark'] as const;
export const ShopSurfaceEnum = z.enum(SHOP_SURFACES);
export type ShopSurface = z.infer<typeof ShopSurfaceEnum>;

// The logo's frame on the storefront (decision T76 C7).
export const LOGO_SHAPES = ['circle', 'rounded'] as const;
export const LogoShapeEnum = z.enum(LOGO_SHAPES);
export type LogoShape = z.infer<typeof LogoShapeEnum>;

// The shop's font pair, one heading and one body font for every page (decision T79).
export const FONT_PAIRS = [
  'malinaw',
  'friendly',
  'street',
  'cafe',
  'elegant',
  'bakery',
  'playful',
  'modern',
] as const;
export const FontPairEnum = z.enum(FONT_PAIRS);
export type FontPair = z.infer<typeof FontPairEnum>;

export const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid', 'refunded'] as const;
export const PaymentStatusEnum = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const PAYMENT_METHODS = ['cash', 'cod', 'gcash', 'maya', 'bank', 'qr_ph'] as const;
export const PaymentMethodEnum = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

// Methods paid by sending money first; only these expire unpaid (P3).
export const TRANSFER_METHODS = ['gcash', 'maya', 'bank', 'qr_ph'] as const;

export const PROOF_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const ProofStatusEnum = z.enum(PROOF_STATUSES);
export type ProofStatus = z.infer<typeof ProofStatusEnum>;

export const AVAILABILITY = ['available', 'sold_out_today', 'sold_out'] as const;
export const AvailabilityEnum = z.enum(AVAILABILITY);
export type Availability = z.infer<typeof AvailabilityEnum>;

export const ITEM_STATUSES = ['active', 'hidden', 'archived'] as const;
export const ItemStatusEnum = z.enum(ITEM_STATUSES);
export type ItemStatus = z.infer<typeof ItemStatusEnum>;

export const STAMP_CARD_STATUSES = ['off', 'on', 'paused'] as const;
export const StampCardStatusEnum = z.enum(STAMP_CARD_STATUSES);
export type StampCardStatus = z.infer<typeof StampCardStatusEnum>;

export const STAMP_PERIODS = ['day', 'week', 'month'] as const;
export const StampPeriodEnum = z.enum(STAMP_PERIODS);
export type StampPeriod = z.infer<typeof StampPeriodEnum>;

export const REWARD_KINDS = ['discount', 'free_item', 'custom'] as const;
export const RewardKindEnum = z.enum(REWARD_KINDS);
export type RewardKind = z.infer<typeof RewardKindEnum>;

// Stamp history kinds (decision T57, rule M4). `pending` is shown to the member only and never stored:
// it is counted from open orders. `used` = a reward on an order or at the counter, `claimed` = a prize
// claim, `returned` = stamps given back (cancelled order or claim), `reversed` = an earned stamp taken
// back, `undone` = a counter change undone within 10 seconds (T58).
export const LEDGER_KINDS = [
  'welcome',
  'pending',
  'earned',
  'used',
  'claimed',
  'returned',
  'reversed',
  'given',
  'removed',
  'undone',
] as const;
export const LedgerKindEnum = z.enum(LEDGER_KINDS);
export type LedgerKind = z.infer<typeof LedgerKindEnum>;

// What the "Latest at the counter" feed on Members shows (T63). Worked out from the stamp history and
// claims, never stored, so there is no database CHECK to mirror.
export const MEMBER_ACTIVITY_KINDS = ['joined', 'stamp', 'reward', 'prize'] as const;
export const MemberActivityKindEnum = z.enum(MEMBER_ACTIVITY_KINDS);
export type MemberActivityKind = z.infer<typeof MemberActivityKindEnum>;

// Reason categories a member may see for a manual change (never the owner's private note).
export const MANUAL_REASONS = ['counter_purchase', 'correction', 'goodwill', 'other'] as const;
export const ManualReasonEnum = z.enum(MANUAL_REASONS);
export type ManualReason = z.infer<typeof ManualReasonEnum>;

export const CLAIM_STATUSES = ['pending', 'given', 'cancelled'] as const;
export const ClaimStatusEnum = z.enum(CLAIM_STATUSES);
export type ClaimStatus = z.infer<typeof ClaimStatusEnum>;

// Owner member groups (decision T57, rule M11); one person can be in several. Guests are a separate list.
export const MEMBER_SEGMENTS = ['ready', 'almost', 'regulars', 'quiet', 'new'] as const;
export const MemberSegmentEnum = z.enum(MEMBER_SEGMENTS);
export type MemberSegment = z.infer<typeof MemberSegmentEnum>;

// The chips on the Members list: everyone who joined, one group, or guests (never merged by phone, M12).
export const CUSTOMER_FILTERS = ['all', ...MEMBER_SEGMENTS, 'guests'] as const;
export const CustomerFilterEnum = z.enum(CUSTOMER_FILTERS);
export type CustomerFilter = z.infer<typeof CustomerFilterEnum>;

export const MEMBER_SORTS = ['last_order', 'stamps', 'spent', 'name'] as const;
export const MemberSortEnum = z.enum(MEMBER_SORTS);
export type MemberSort = z.infer<typeof MemberSortEnum>;

// Why the owner cancelled a prize claim (stamps and the piece go back, rule M7).
export const CLAIM_CANCEL_REASONS = ['no_show', 'out_of_stock', 'other'] as const;
export const ClaimCancelReasonEnum = z.enum(CLAIM_CANCEL_REASONS);
export type ClaimCancelReason = z.infer<typeof ClaimCancelReasonEnum>;

export const MESSAGE_KINDS = ['proof', 'status', 'rider', 'tracking', 'schedule'] as const;
export const MessageKindEnum = z.enum(MESSAGE_KINDS);
export type MessageKind = z.infer<typeof MessageKindEnum>;

// Time slot lengths for advance orders and pickup scheduling (T48).
export const SLOT_LENGTHS = [15, 30, 60] as const;
export const SlotLengthSchema = z.union([z.literal(15), z.literal(30), z.literal(60)]);
export type SlotLength = (typeof SLOT_LENGTHS)[number];

export const SCHEDULE_SLOT_STATES = ['open', 'full'] as const;
export const ScheduleSlotStateEnum = z.enum(SCHEDULE_SLOT_STATES);
export type ScheduleSlotState = z.infer<typeof ScheduleSlotStateEnum>;

export const SCHEDULE_DAY_STATES = ['open', 'closed', 'full', 'too_soon'] as const;
export const ScheduleDayStateEnum = z.enum(SCHEDULE_DAY_STATES);
export type ScheduleDayState = z.infer<typeof ScheduleDayStateEnum>;

export const PAUSE_MODES = ['busy_15', 'busy_30', 'pause', 'resume'] as const;
export const PauseModeEnum = z.enum(PAUSE_MODES);
export type PauseMode = z.infer<typeof PauseModeEnum>;

export const ORDER_TIMING_PHASES = ['scheduled', 'upcoming', 'active', 'done'] as const;
export const OrderTimingPhaseEnum = z.enum(ORDER_TIMING_PHASES);
export type OrderTimingPhase = z.infer<typeof OrderTimingPhaseEnum>;

export const AGE_TONES = ['calm', 'amber', 'red'] as const;
export const AgeToneEnum = z.enum(AGE_TONES);
export type AgeTone = z.infer<typeof AgeToneEnum>;

export const ANNOUNCEMENT_TONES = ['info', 'warning', 'success'] as const;
export const AnnouncementToneEnum = z.enum(ANNOUNCEMENT_TONES);
export type AnnouncementTone = z.infer<typeof AnnouncementToneEnum>;

// The customer avatar picker's face sets (decisions R23, T80): DiceBear Toon Head, Big Smile, Thumbs (a blob
// on the shop's colour) and Adventurer, none of them the owner's faces.
export const AVATAR_SETS = ['toon', 'smile', 'blob', 'adventure'] as const;
export const AvatarSetEnum = z.enum(AVATAR_SETS);
export type AvatarSet = z.infer<typeof AvatarSetEnum>;

// Where a banner's button goes (decision R42): an item's sheet, a category on the menu, or Rewards.
export const BANNER_LINK_KINDS = ['item', 'category', 'rewards'] as const;
export const BannerLinkKindEnum = z.enum(BANNER_LINK_KINDS);
export type BannerLinkKind = z.infer<typeof BannerLinkKindEnum>;

export const OPEN_STATES = ['open', 'closed', 'busy'] as const;
export const OpenStateKindEnum = z.enum(OPEN_STATES);
export type OpenStateKind = z.infer<typeof OpenStateKindEnum>;

export const STOREFRONT_SECTIONS = [
  'banners',
  'announcement',
  'rewards',
  'favourites',
  'categories',
  'bestSellers',
  'about',
  'hours',
  'contact',
  'membersCount',
] as const;
export const StorefrontSectionEnum = z.enum(STOREFRONT_SECTIONS);
export type StorefrontSection = z.infer<typeof StorefrontSectionEnum>;

export const REWARD_STATES = [
  'ready',
  'pending',
  'paused',
  'all_claimed',
  'free_item_sold_out',
  'not_ready',
] as const;
export const RewardStateEnum = z.enum(REWARD_STATES);
export type RewardState = z.infer<typeof RewardStateEnum>;

// Why a basket line can't be ordered as it is.
export const LINE_PROBLEMS = [
  'item_missing',
  'variant_missing',
  'sold_out',
  'sold_out_today',
  'option_missing',
  'option_sold_out',
  'required_missing',
  'too_few',
  'too_many',
  'price_changed',
  'note_too_long',
] as const;
export const LineProblemCodeEnum = z.enum(LINE_PROBLEMS);
export type LineProblemCode = z.infer<typeof LineProblemCodeEnum>;

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const; // 0 = Sunday, Manila time
export const WeekdaySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);
export type Weekday = z.infer<typeof WeekdaySchema>;

export const SORT_KINDS = ['category', 'item', 'option'] as const;
export const SortKindEnum = z.enum(SORT_KINDS);
export type SortKind = z.infer<typeof SortKindEnum>;

// What an owner upload is for. Avatar is the owner's own photo; plan_proof is the receipt for the Pro plan,
// which never counts against the shop's storage (decision T66).
export const UPLOAD_KINDS = [
  'logo',
  'banner',
  'item',
  'category',
  'qr',
  'avatar',
  'plan_proof',
] as const;
export const UploadKindEnum = z.enum(UPLOAD_KINDS);
export type UploadKind = z.infer<typeof UploadKindEnum>;

// Owner Settings (decisions T64 to T68).

// The owner's picture (T68): six DiceBear styles made once as files, our names for them.
export const OWNER_AVATAR_STYLES = ['sketch', 'soft', 'bright', 'people', 'pixel', 'fun'] as const;
export const OwnerAvatarStyleEnum = z.enum(OWNER_AVATAR_STYLES);
export type OwnerAvatarStyle = z.infer<typeof OwnerAvatarStyleEnum>;

// The colour behind a face or initials: one token each, with a dark version (docs/design-tokens.md).
export const AVATAR_THEMES = [
  'sky',
  'mint',
  'sun',
  'blush',
  'lilac',
  'sand',
  'navy',
  'brand',
] as const;
export const AvatarThemeEnum = z.enum(AVATAR_THEMES);
export type AvatarTheme = z.infer<typeof AvatarThemeEnum>;

// Make your own: six hair styles of the Soft (Lorelei) face in three colours.
export const AVATAR_HAIRS = ['short', 'bob', 'curly', 'long', 'bun', 'wavy'] as const;
export const AvatarHairEnum = z.enum(AVATAR_HAIRS);
export type AvatarHair = z.infer<typeof AvatarHairEnum>;
export const AVATAR_HAIR_COLORS = ['black', 'brown', 'golden'] as const;
export const AvatarHairColorEnum = z.enum(AVATAR_HAIR_COLORS);
export type AvatarHairColor = z.infer<typeof AvatarHairColorEnum>;

// Where a shop's 500 MB goes (T66). Customer payment proofs are never blocked, even when full.
export const STORAGE_KINDS = ['menu', 'proofs', 'look', 'qr', 'profile'] as const;
export const StorageKindEnum = z.enum(STORAGE_KINDS);
export type StorageKind = z.infer<typeof StorageKindEnum>;

// The cleanups the owner runs by hand; unconfirmed uploads clear by themselves every night. Exported proofs
// are the proofs in a copy the owner just saved (early delete only after an export, P7).
export const CLEANUP_KINDS = ['old_proofs', 'archived_photos', 'exported_proofs'] as const;
export const CleanupKindEnum = z.enum(CLEANUP_KINDS);
export type CleanupKind = z.infer<typeof CleanupKindEnum>;

// 80 % amber, 95 % red, 100 % full: new menu and look photos wait, proofs still come in.
export const STORAGE_LEVELS = ['ok', 'high', 'almost', 'full'] as const;
export const StorageLevelEnum = z.enum(STORAGE_LEVELS);
export type StorageLevel = z.infer<typeof StorageLevelEnum>;

export const EXPORT_RANGES = ['this_month', 'last_month', 'everything'] as const;
export const ExportRangeEnum = z.enum(EXPORT_RANGES);
export type ExportRange = z.infer<typeof ExportRangeEnum>;

export const EXPORT_STATUSES = ['preparing', 'ready', 'failed', 'expired'] as const;
export const ExportStatusEnum = z.enum(EXPORT_STATUSES);
export type ExportStatus = z.infer<typeof ExportStatusEnum>;

// The Pro plan (T67): trial, paid and due soon, unpaid within the 7-day grace, then paused.
export const PLAN_STATUSES = ['trial', 'active', 'due', 'overdue', 'paused'] as const;
export const PlanStatusEnum = z.enum(PLAN_STATUSES);
export type PlanStatus = z.infer<typeof PlanStatusEnum>;

export const PLAN_PAY_METHODS = ['gcash', 'maya'] as const;
export const PlanPayMethodEnum = z.enum(PLAN_PAY_METHODS);
export type PlanPayMethod = z.infer<typeof PlanPayMethodEnum>;

export const PLAN_PAYMENT_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const PlanPaymentStatusEnum = z.enum(PLAN_PAYMENT_STATUSES);
export type PlanPaymentStatus = z.infer<typeof PlanPaymentStatusEnum>;

// How many months one plan payment covers.
export const PLAN_MONTH_CHOICES = [1, 3, 6] as const;
export const PlanMonthsSchema = z.union([z.literal(1), z.literal(3), z.literal(6)]);
export type PlanMonths = z.infer<typeof PlanMonthsSchema>;

// The dashboard's look, kept on the device (decision T64).
export const APPEARANCES = ['system', 'light', 'dark'] as const;
export const AppearanceEnum = z.enum(APPEARANCES);
export type Appearance = z.infer<typeof AppearanceEnum>;

// Owner Home (T69, T70): how today compares with a usual day of the same weekday (words, never a %).
export const PACE_VERDICTS = ['ahead', 'about', 'behind'] as const;
export const PaceVerdictEnum = z.enum(PACE_VERDICTS);
export type PaceVerdict = z.infer<typeof PaceVerdictEnum>;

// The trend window at the bottom of Home (it replaces the Insights page for launch, T69).
export const HOME_RANGES = ['7d', '30d'] as const;
export const HomeRangeEnum = z.enum(HOME_RANGES);
export type HomeRange = z.infer<typeof HomeRangeEnum>;

// The new-shop checklist on Home, in order.
export const SETUP_STEPS = [
  'items',
  'look',
  'hours',
  'payments',
  'stamp_card',
  'first_order',
] as const;
export const SetupStepEnum = z.enum(SETUP_STEPS);
export type SetupStep = z.infer<typeof SetupStepEnum>;

// "Needs you" rows, worst first (H8). Each is hidden at 0.
export const HOME_NEED_KINDS = [
  'to_check',
  'late',
  'unseen',
  'waiting',
  'prizes',
  'sold_out',
  'bookings',
  'plan',
  'storage',
] as const;
export const HomeNeedKindEnum = z.enum(HOME_NEED_KINDS);
export type HomeNeedKind = z.infer<typeof HomeNeedKindEnum>;
