# API contract

The one list of what screens can call. Each row is one method on a `@smartapp/data` adapter. The mock adapter and the API adapter both implement it with the same name, input and output, so switching an area from `mock` to `api` changes no screen. Change a row here first, then the code.

Trimmed from the old `api-surface.md` (2026-10-11) to fit the restart: NestJS from day 1, mock adapters first, auth through NestJS (decision T34). `B-full.md` was checked too; its modules add rows here only when they are built.

## Rules

- **Types:** input and output are Zod schemas in `packages/core/src/schemas/` (camelCase). The API validates input with the same schema, and the adapter parses every response with it. No casts.
- **Errors:** every failure is `ApiError { status, code, message, fieldErrors? }` (`ApiErrorSchema` in core). In Nest one global filter makes this shape; the adapter parses every non-2xx answer with the schema.
  - `code` comes from the closed list in `packages/core/src/errors.ts`; screens word it with `errorWords(code)`.
  - A failed input check is `invalid_input` with `fieldErrors`. Unknown failures become `unknown`.
  - Mocks throw the same codes.
- **Money** in integer centavos. **Times** are ISO strings in UTC. Formatting (`formatPeso`, `formatManila`) lives in core.
- **Hooks:** each method has a TanStack Query hook (`useX`); writes invalidate keys from one `qk` file. Screens own the loading, empty and error states.
- **Shop scope:** the API takes the shop from `tenant_members` for the logged-in owner, never from the URL or body. Public storefront routes take the `slug`.
- **Rules that must be trusted** (totals, stock, stamps, order steps) run in SQL functions. Nest validates, checks permission and calls them.

## Auth (NestJS `/auth`, Supabase Auth behind it)

| Method                                      | Input                                       | Output / notes                                                                                                               |
| ------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `signUp`                                    | `SignUpSchema`                              | session (email confirmation off on dev)                                                                                      |
| `signIn` / `signOut`                        | `LoginSchema` / none                        | one error message for every failed login                                                                                     |
| `getSession`                                | none                                        | `{ userId, email } \| null`                                                                                                  |
| `sendPasswordCode`, `resetPasswordWithCode` | `{ email }`, `{ email, code, newPassword }` | 6-digit code, no links                                                                                                       |
| `sendCustomerCode`, `verifyCustomerCode`    | `{ email }`, `{ email, code }`              | storefront members; resend after 60 s, at most 5 codes per hour (`rate_limited`); a code older than 10 min is `code_expired` |

Codes: `invalid_login`, `email_taken`, `weak_password`, `invalid_code`, `code_expired`, `rate_limited`, `not_signed_in`.

## Shop (owner, `/owner/...`)

| Method            | HTTP                  | Input → Output                                                                                                                                                                                                                         |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getMyShop`       | GET `/owner/shop`     | → `Shop \| null`                                                                                                                                                                                                                       |
| `createMyShop`    | POST `/owner/shop`    | `{ kind, name, slug }` → `Shop` (status `pending`)                                                                                                                                                                                     |
| `isSlugFree`      | GET `/slugs/:slug`    | → `boolean`                                                                                                                                                                                                                            |
| `saveSortOrder`   | PUT `/owner/sort`     | `{ kind, ids }`                                                                                                                                                                                                                        |
| `createUploadUrl` | POST `/owner/uploads` | `{ kind: logo\|banner\|item\|category\|qr\|avatar\|plan_proof, bytes? }` → signed upload URL + `path` for exactly that size (shrunk on the phone, T65). Refuses `storage_full` when the 500 MB is used, never for a plan receipt (T66) |

Codes: `slug_taken`, `slug_reserved`, `slug_invalid`, `already_has_shop`, `not_allowed`, `storage_full`.

## Settings (owner)

The whole Settings area (decisions T64 to T68). One read, one save per section; unknown keys are stripped. A saved section also refreshes the storefront and the Orders page's Order times.

| Method                                           | HTTP                                            | Input → Output                                                                                                                                                                   |
| ------------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getSettings`                                    | GET `/owner/settings`                           | → `OwnerSettings` (shop facts, hours and closures, order types and booking rules, delivery, payments, booked pickups and deliveries)                                             |
| `saveShopFacts`                                  | PUT `/owner/settings/shop`                      | `ShopFacts` (name, contact, pin, pickup note) → `OwnerSettings`; a bad phone is `invalid_input` with `fieldErrors.phone`                                                         |
| `saveHours`                                      | PUT `/owner/hours`                              | `HoursSettings` → `OwnerSettings`; overlapping or backwards times are `hours_overlap` with `fieldErrors["hours.<i>"]` (`hoursProblems` in core, shared with SQL)                 |
| `saveOrdering`                                   | PUT `/owner/settings/ordering`                  | `OrderingSettings` (order types and `BookingRules`) → `OwnerSettings`; no order type is `last_order_type`                                                                        |
| `saveDelivery`                                   | PUT `/owner/settings/delivery`                  | `DeliverySettings` → `OwnerSettings`; rows with a gap or overlap are `invalid_input` with `fieldErrors["distance.<i>"]` (N25)                                                    |
| `savePayments`                                   | PUT `/owner/settings/payments`                  | `PaymentSettings` → `OwnerSettings`; none on is `last_payment_method`; a transfer without name and number is `invalid_input`                                                     |
| `getProfile` / `saveProfile`                     | GET/PUT `/owner/profile`                        | `OwnerProfile` (name, email, avatar) / `{ name, avatar }`; the avatar is a face record (0 KB) or a photo upload (T68). `profiles.avatar` jsonb with a CHECK on kind              |
| `getNotificationPrefs` / `saveNotificationPrefs` | GET/PUT `/owner/notifications`                  | `NotificationPrefs` (4 switches and an email)                                                                                                                                    |
| `sendPasswordCode` / `resetPasswordWithCode`     | POST `/auth/password-code`, `/auth/password`    | none → `SendCodeResult` / `{ code, newPassword }` → `{ ok }`; the same 6-digit code as Auth (resend after 60 s, `rate_limited`, `invalid_code`, `code_expired`, `weak_password`) |
| `signOutEverywhere`                              | POST `/auth/sign-out-all`                       | → `{ ok }` (Supabase Auth global sign-out behind NestJS)                                                                                                                         |
| `requestAccountDelete`                           | POST `/owner/account/delete-request`            | → `{ ok }`; emails the founder, no self-delete at launch                                                                                                                         |
| `getPlan`                                        | GET `/owner/plan`                               | → `Plan` (status from `planStatus`, paid-until, grace, pay-to numbers, pending payment, history)                                                                                 |
| `submitPlanPayment`                              | POST `/owner/plan/payments`                     | `{ months: 1\|3\|6, method: gcash\|maya, reference, proofPath }` → `Plan`; one pending at a time (`payment_not_pending`), a used reference is `duplicate_reference`              |
| `getStorage`                                     | GET `/owner/storage`                            | → `StorageSummary` (used and limit, per kind, cleanups with files and bytes, unused uploads, proof days, last export)                                                            |
| `previewCleanup` / `runCleanup`                  | GET/POST `/owner/storage/cleanup`               | `{ kind }` → `CleanupPreview` (files, bytes, `savedCopy`, `token`) / `{ kind, token }` → `StorageSummary`; a list that moved since the preview is `cleanup_changed`              |
| `createExport` / `getExport`                     | POST `/owner/exports`, GET `/owner/exports/:id` | `{ range, parts }` → `DataExport` (`preparing`, `ready` with a 24-hour link, `failed`, `expired`)                                                                                |

Every stored file has a row in `media_files` (shop, kind, path, bytes, made, used by), so the meter is a sum, not a bucket scan. The limit lives on the plan (`storage_limit_bytes`). Uploads not confirmed in an hour, and proofs past 30 days, are removed by the NestJS job planned for proof deletion (no pg_cron, rule 13).

Codes: `storage_full`, `file_not_image`, `file_too_large`, `export_not_ready`, `cleanup_changed`, `last_order_type`, `last_payment_method`, `hours_overlap`.

## Catalog (owner)

| Method                                                                   | HTTP                            | Input → Output                                                    |
| ------------------------------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------- |
| `listCategories` / `saveCategory` / `removeCategory`                     | `/owner/categories`             | `Category` (with `icon`)                                          |
| `listItems`                                                              | GET `/owner/items`              | → `CatalogItem[]` (photos, variants, add-on groups, every status) |
| `saveItem`                                                               | PUT `/owner/items/:id`          | `ItemDraft` → `CatalogItem` (one transaction)                     |
| `setItemStatus`                                                          | PATCH `/owner/items/:id/status` | `active\|hidden\|archived`                                        |
| `setSoldOut` / `setStock`                                                | PATCH `/owner/variants/:id`     | `{ isSoldOut }` / `{ stockOnHand }` (logged)                      |
| `listOptionGroups` / `saveOptionGroup` / `removeOptionGroup`             | `/owner/option-groups`          | `OptionGroup`                                                     |
| `listVariantTemplates` / `saveVariantTemplate` / `removeVariantTemplate` | `/owner/variant-templates`      | `VariantTemplate` (reusable choices across items)                 |

Codes: `category_not_empty`, `item_has_orders` (archive instead), `variant_is_reward` (protects stamp card prize).

## Storefront (public, `/s/:slug/...`)

| Method                                 | HTTP                      | Input → Output                                                                                                                                                                           |
| -------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getStorefront`                        | GET `/s/:slug`            | → `Storefront \| null` (pending or suspended shops are null, so the page shows Not found)                                                                                                |
| `quoteOrder`                           | POST `/s/:slug/quote`     | `OrderPayload` (with `scheduledAt?`) → `Quote` (with `problems[]` per line, `slots[]`, `openState`); always called before Place order                                                    |
| `placeOrder`                           | POST `/s/:slug/orders`    | `OrderPayload + clientKey` → `{ orderId, orderNo, token }`; retry-safe                                                                                                                   |
| `getOrder`                             | GET `/o/:token`           | → `OrderReceipt`                                                                                                                                                                         |
| `createProofUploadUrl` / `submitProof` | POST `/o/:token/proof`    | `{ method, referenceNo, path }` → `Payment`                                                                                                                                              |
| `joinAsMember`                         | POST `/s/:slug/members`   | `{ name, phone, orderToken? }` → `MemberAccount` (1 welcome stamp when the card is on; joining again returns the same account)                                                           |
| `getMyAccount`                         | GET `/s/:slug/me`         | → `MemberAccount \| null` (with `joinedAt` and the member's prize `claims`)                                                                                                              |
| `saveAddress` / `removeAddress`        | `/s/:slug/me/addresses`   | `CustomerAddress`                                                                                                                                                                        |
| `claimReward`                          | POST `/s/:slug/me/claims` | → `RewardClaim` (custom prize)                                                                                                                                                           |
| `rateOrder`                            | POST `/o/:token/rating`   | `{ stars, comment? }` → `OrderRating`                                                                                                                                                    |
| `subscribePush`                        | POST `/o/:token/push`     | `PushSubscription` → `{ ok }`                                                                                                                                                            |
| `getStorefrontPreview`                 | GET `/s/:slug/preview`    | preview token → `Storefront` built from the draft                                                                                                                                        |
| `listMyOrders`                         | GET `/s/:slug/orders`     | `{ tokens }` (guest order tokens kept on the phone) → `OrderRow[]` (newest first; up to 3 item photos, payment method, pay-by time, stars)                                               |
| `resolveMapsLink`                      | POST `/maps/resolve`      | `{ url }` → `{ lat, lng }`; the server follows short links (maps.app.goo.gl); the mock reads full links only (`parseMapsLink`)                                                           |
| `getSchedule`                          | GET `/s/:slug/schedule`   | `{ type, lines }` → `Schedule` (available days and slots, taking into account prep time, notice items, and slot/daily capacity; each slot's `left` is the orders it can still take, T85) |

Every storefront method also takes the `slug` from the route (`getOrder` and the receipt methods too: the storefront route is `/[shop]/o/[token]`; a real token alone identifies the order). The cart lives on the device (`deviceStorage`, per slug). Pickup slots and open/closed text come from core (`pickupSlots`, `openState`), but the database decides. Slot and daily counts are locked in the SQL `place_order` function so two phones cannot take the last slot.

Codes: `shop_not_found`, `shop_closed`, `shop_busy`, `fulfillment_unavailable`, `payment_unavailable`, `cod_not_allowed`, `cod_limit`, `pickup_time_invalid`, `zone_required`, `out_of_range`, `item_unavailable`, `out_of_stock`, `invalid_options`, `reward_unavailable`, `reward_all_claimed`, `reward_paused`, `order_not_payable`, `duplicate_reference`, `too_many_proofs`, `phone_in_use`, `rate_limited`, `slot_unavailable`, `stamps_insufficient`, `preview_expired`, `thread_rate_limited`, `code_expired`, `stamp_daily_cap`, `slot_full`, `notice_too_short`, `daily_limit_reached`.

Closed lists used by these rows (core `schemas/enums.ts`): payment status `unpaid`, `pending`, `paid`, `refunded`; payment methods `cash`, `cod`, `gcash`, `maya`, `bank`, `qr_ph`; order thread message kinds `proof`, `status`, `rider`, `tracking`, `schedule`.

## Orders (owner)

| Method                                 | HTTP                                | Input → Output                                                                                                                                                                                                                                                          |
| -------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listOrders`                           | GET `/owner/orders`                 | `{ open?, date?, q? }` → `BoardOrder[]` (with `scheduledAt`, `dueAt`, `startBy`, `pickupCode`, `isFirstOrder`, `isMember`, `hasReward`, `expiresAt`, `memberStamps` `{have, goal}` or null, and each line's first `photo`; T56)                                         |
| `listScheduled`                        | GET `/owner/orders/scheduled`       | `{ from, to }` → `{ orders: BoardOrder[], days: DayLoad[] }` (Manila YYYY-MM-DD, at most 62 days)                                                                                                                                                                       |
| `findOrder`                            | GET `/owner/orders/find`            | `{ code }` → `BoardOrder[]` (pickup code, order number or scanned receipt token; spaces, `#`, case and leading zeros ignored; open orders and today's)                                                                                                                  |
| `markSeen`                             | POST `/owner/orders/:id/seen`       | → `BoardOrder`                                                                                                                                                                                                                                                          |
| `getOrderDetail`                       | GET `/owner/orders/:id`             | → `OrderReceipt`                                                                                                                                                                                                                                                        |
| `getProofUrl`                          | GET `/owner/proofs/:path`           | → signed URL, 5 minutes                                                                                                                                                                                                                                                 |
| `reviewPayment`                        | POST `/owner/payments/:id/review`   | `{ approve, rejectReason? }` → `Payment`                                                                                                                                                                                                                                |
| `recordPayment`                        | POST `/owner/orders/:id/payments`   | `{ method }` → `Payment` (cash, COD)                                                                                                                                                                                                                                    |
| `advanceOrder`                         | POST `/owner/orders/:id/advance`    | `{ toStatus, trackingUrl? }` → `Order` (optimistic on screen; any later step for the type, T55; `invalid_transition` backwards, `not_paid` for an unpaid transfer leaving New or any unpaid completion)                                                                 |
| `recallOrder`                          | POST `/owner/orders/:id/recall`     | → `OwnerOrder` (removes last status step and message within 10s grace period)                                                                                                                                                                                           |
| `rescheduleOrder`                      | POST `/owner/orders/:id/reschedule` | `{ scheduledAt, override? }` → `OwnerOrder` (override allows capacity override, not closed days/hours); any open day in the next 60 (T86); `slot_full`, or `notice_too_short` when an item needs more notice (T85)                                                      |
| `getRescheduleSchedule`                | GET `/owner/orders/:id/schedule`    | → `Schedule` for this order's type and lines, with its own time and items left out of the counts (T85); the next 60 days whatever `daysAhead` says, also while paused or busy (T86); slots carry `left` (null with no per-time limit) and `booked`, days carry `booked` |
| `saveOwnerNote`                        | PATCH `/owner/orders/:id/note`      | `{ note }` → `OwnerOrder` (up to 300 characters, internal only)                                                                                                                                                                                                         |
| `cancelOrder`                          | POST `/owner/orders/:id/cancel`     | `{ reason }` → `Order`                                                                                                                                                                                                                                                  |
| `saveDeliveryInfo`                     | PATCH `/owner/orders/:id/delivery`  | `{ provider?, trackingUrl?, riderName?, riderPhone? }` → `Order`                                                                                                                                                                                                        |
| `getBookingRules` / `saveBookingRules` | GET/PUT `/owner/booking-rules`      | `BookingRules` (`daysAhead`, `slotMinutes`, `ordersPerSlot`)                                                                                                                                                                                                            |
| `setPause`                             | POST `/owner/pause`                 | `{ mode }` (`busy_15`, `busy_30`, `pause`, `resume`) → `OpenState`                                                                                                                                                                                                      |

Core helpers that screens use instead of comparing statuses: `boardColumn`, `nextActions`, `canCancel`, `timelineSteps`, `orderTiming`. They share one test table with the SQL.

Codes: `not_found`, `invalid_transition`, `not_paid`, `payment_not_pending`, `already_paid`, `recall_expired`, `reschedule_not_allowed`, `slot_full`, `notice_too_short`, `daily_limit_reached`.

## Samples (owner)

| Method            | HTTP                    | Input → Output                                                                                      |
| ----------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `applySamplePack` | POST `/owner/samples`   | `{ packSlug }` → `PublicShop` ("Start with samples": copies a shop pack's catalog, look and card)   |
| `clearSamples`    | DELETE `/owner/samples` | → `PublicShop` (removes every `sample` item, banners and logo; the shop then looks like test-blank) |

## Members (owner)

Decisions T57 to T60. The shop comes from the owner's login, so no row takes a slug. Balances, groups and member numbers are worked out from orders and the stamp history by core functions now (`memberSegments`, `stampImpact`, `changesLeftToday`, `recentCounterStamp`, `canUndo`, `memberCodeMatches`, `usuallyBuys`) and by SQL functions later, with one test table. The stamp history is append-only: no update or delete grants, unique indexes for one stamp per order and one welcome stamp per member (D5).

| Method                   | HTTP                                 | Input → Output                                                                                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getStampCard`           | GET `/owner/stamp-card`              | → `StampCardSettings` (status, earn rule, reward with pieces)                                                                                                                                                                                                                   |
| `previewStampCardChange` | POST `/owner/stamp-card/preview`     | `StampCardSettings` → `StampCardImpact` `{ readyNow, loseReady, pendingClaims }` (both ways, M9)                                                                                                                                                                                |
| `saveStampCard`          | PUT `/owner/stamp-card`              | `StampCardSettings` → `StampCardSettings` (pieces never below what claims hold, M7; a free item must be an active item)                                                                                                                                                         |
| `setStampCardStatus`     | POST `/owner/stamp-card/status`      | `{ status }` → `StampCardSettings` (Paused stops new stamps only, M1)                                                                                                                                                                                                           |
| `getMembersOverview`     | GET `/owner/members/overview`        | → `MembersOverview` (counts per group, card progress, prizes to give, members 1 or 2 stamps away, `pulse`: joins and member vs guest sales over the last 30 days against the 30 before, stamps over 7 days against the 7 before, top 5 suki, latest 8 activity lines; T61, T63) |
| `listCustomers`          | GET `/owner/members`                 | `ListCustomersInput` `{ filter, q, stamps, sort, cursor, limit }` → `CustomerPage` (members, or guests grouped by mobile number, M12)                                                                                                                                           |
| `getMember`              | GET `/owner/members/:id`             | → `MemberDetail` (numbers from orders, usually buys, note, changes left today, stamp history with who and note, orders, claims)                                                                                                                                                 |
| `findMember`             | GET `/owner/members/find`            | `{ code }` → `FoundMember` `{ customerId, claimId }` (member code exact, or a prize code; M13, D7)                                                                                                                                                                              |
| `giveStamp`              | POST `/owner/members/:id/stamp`      | `{ clientKey, confirmRecent }` → `CounterChange` (+1 Counter purchase, Undo for 10 s; `stamp_recent` within 2 minutes unless confirmed; same key, same result)                                                                                                                  |
| `undoChange`             | POST `/owner/members/:id/undo`       | `{ entryId }` → `MemberDetail` (writes an `undone` line; accepted for 15 s)                                                                                                                                                                                                     |
| `adjustStamps`           | POST `/owner/members/:id/adjust`     | `AdjustStampsInput` `{ delta: 1 \| -1, reason, note }` → `MemberDetail` (3 changes per member per Manila day, never below 0)                                                                                                                                                    |
| `useReward`              | POST `/owner/members/:id/use-reward` | `{ clientKey }` → `CounterChange` (reward used at the counter; a custom prize is handed over at once, D3)                                                                                                                                                                       |
| `saveMemberNote`         | PUT `/owner/members/:id/note`        | `{ note }` → `MemberDetail` (up to 300 characters, owner only)                                                                                                                                                                                                                  |
| `listRewardClaims`       | GET `/owner/claims`                  | → `OwnerClaim[]` (waiting longest first)                                                                                                                                                                                                                                        |
| `giveClaim`              | POST `/owner/claims/:id/give`        | → `OwnerClaim`                                                                                                                                                                                                                                                                  |
| `cancelClaim`            | POST `/owner/claims/:id/cancel`      | `{ reason }` → `OwnerClaim` (stamps and the piece come back)                                                                                                                                                                                                                    |

Codes: `stamp_cap_reached`, `stamp_recent`, `stamp_card_off`, `undo_expired`, `stamps_insufficient`, `reward_unavailable`, `reward_all_claimed`, `claim_not_pending`, `not_found`. The prize item can't be hidden, archived or removed while it is the prize: `item_is_reward` (M10).

No CSV export, tags, bulk stamps or messaging in A (M14).

## Home (owner)

Decisions T69 to T71. No method takes a slug; the shop comes from the login (T34). Every number is worked out on
each read from orders, the stamp history and the menu (rules H1 to H14 in `packages/core/src/rules/owner-home.ts`);
nothing is stored. The live board and the order rows of "Needs you" come from `listOrders` (open), so Home and
Orders always show the same orders.

| Method          | HTTP                     | Input → Output                                                             |
| --------------- | ------------------------ | -------------------------------------------------------------------------- |
| `getHome`       | GET `/owner/home`        | → `HomeSummary` (today, pace, hours, best sellers, mix, members, bookings) |
| `getHomeTrends` | GET `/owner/home/trends` | `{ range: '7d' \| '30d' }` → `HomeTrends` (days, days before, busy hours)  |
| `getHomePeriod` | GET `/owner/home/period` | `{ from, to }` (Manila dates) → `HomePeriodData` (money, slots, mix, best) |

`getHomePeriod` (T83) answers the Home period picker: plain facts for the dates, never a comparison. Dates outside
the last 60 days (H14) or after today are pulled in; one day gives hourly slots, longer periods give daily slots.
`getHomeTrends` stays for the full Insights page in Blueprint B, where comparisons now live (T83).

The Insights page is hidden for launch (T69); `/insights` opens Home. The sales report and the orders CSV move to
Blueprint B with the full Insights page.

## Editor (owner)

| Method                   | HTTP                                   | Input → Output                                                                                                           |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `getStorefrontDraft`     | GET `/owner/storefront/draft`          | → `StorefrontDraftState` `{ draft, published, baseVersion, contentVersion, savedAt }` (`StorefrontContent` each)         |
| `saveStorefrontDraft`    | PUT `/owner/storefront/draft`          | `{ content: StorefrontContent, baseVersion }` → `StorefrontDraftState`; an older `baseVersion` is `draft_conflict` (409) |
| `publishStorefront`      | POST `/owner/storefront/draft`         | `{ baseVersion }` → `{ contentVersion }`; copies the draft onto the shop in one transaction                              |
| `discardStorefrontDraft` | DELETE `/owner/storefront/draft`       | → `{ contentVersion }`; the draft becomes what customers see                                                             |
| `createPreviewToken`     | POST `/owner/storefront/preview-token` | → `{ token, expiresAt }` (short-lived, owner-only, one shop)                                                             |

`StorefrontContent` (core `schemas/editor.ts`) is the logo, tagline, About text and the whole look (colours, banners,
announcement, section switches). The look's colours are `brandColor`, `pageColor` and `cardColor` (hex; `cardColor` null
follows the page), `surface` worked out from the page colour, and `logoShape` (`circle` or `rounded`) (T76). Name and contact stay in Settings (T64), the Best seller switch in Menu (T44), the
stamp card in Members. Codes: `draft_conflict`.

**Preview messages (T72).** The Editor frames the storefront's `/[shop]/preview` and talks to it with `postMessage`.
Both sides check the other's origin (`VITE_STOREFRONT_URL`, `NEXT_PUBLIC_DASHBOARD_URL`) and parse every message with
the shared Zod schemas (`EditorToPreviewSchema`, `PreviewToEditorSchema`, tagged `channel: 'smartapp-editor'`):

| Direction        | `type`   | Fields                                      |
| ---------------- | -------- | ------------------------------------------- |
| Editor → preview | `draft`  | `content: StorefrontContent`                |
| Editor → preview | `select` | `section: EditorSection \| null` (outline)  |
| Editor → preview | `hover`  | `section: EditorSection \| null`            |
| Editor → preview | `banner` | `index: 0..2` (show that banner)            |
| Preview → Editor | `ready`  | (send the draft now)                        |
| Preview → Editor | `select` | `section: EditorSection` (the owner tapped) |

The preview is `noindex`, `no-store`, never kept by the service worker, framed only by the dashboard
(`frame-ancestors`), and every tap only picks a part: it never takes orders.

## Live updates

Live updates: polling every 15 s now; server-sent events from NestJS in phase 4 (T34).

## Mock adapters

`packages/data/src/mocks/<area>.ts` implements every row above:

- It keeps state on the device and has `resetDemoData()`.
- It adds `MOCK_LATENCY` delay.
- It throws the same codes and enforces the same order steps.

A test fails if a mock or API adapter is missing a method in this file.
