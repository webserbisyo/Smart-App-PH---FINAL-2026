# API contract

The one list of what screens can call. Each row is one method on a `@smartapp/data` adapter. The mock adapter and the API adapter both implement it with the same name, input and output, so switching an area from `mock` to `api` changes no screen. Change a row here first, then the code.

Trimmed from the old `api-surface.md` (2026-10-11) to fit the restart: NestJS from day 1, mock adapters first, auth direct to Supabase. `B-full.md` was checked too; its modules add rows here only when they are built.

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

## Auth (Supabase directly, both phases)

| Method                                      | Input                                       | Output / notes                                                                                                               |
| ------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `signUp`                                    | `SignUpSchema`                              | session (email confirmation off on dev)                                                                                      |
| `signIn` / `signOut`                        | `LoginSchema` / none                        | one error message for every failed login                                                                                     |
| `getSession`                                | none                                        | `{ userId, email } \| null`                                                                                                  |
| `sendPasswordCode`, `resetPasswordWithCode` | `{ email }`, `{ email, code, newPassword }` | 6-digit code, no links                                                                                                       |
| `sendCustomerCode`, `verifyCustomerCode`    | `{ email }`, `{ email, code }`              | storefront members; resend after 60 s, at most 5 codes per hour (`rate_limited`); a code older than 10 min is `code_expired` |

Codes: `invalid_login`, `email_taken`, `weak_password`, `invalid_code`, `code_expired`, `rate_limited`, `not_signed_in`.

## Shop and settings (owner, `/owner/...`)

| Method                                                                | HTTP                        | Input → Output                                                                                            |
| --------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `getMyShop`                                                           | GET `/owner/shop`           | → `Shop \| null`                                                                                          |
| `createMyShop`                                                        | POST `/owner/shop`          | `{ kind, name, slug }` → `Shop` (status `pending`)                                                        |
| `isSlugFree`                                                          | GET `/slugs/:slug`          | → `boolean`                                                                                               |
| `getSettings` / `saveSettings`                                        | GET/PATCH `/owner/settings` | `ShopSettings` (look, info, order types, stamps)                                                          |
| `getHours` / `saveHours`                                              | GET/PUT `/owner/hours`      | `BusinessHours[]` (whole week) and closures                                                               |
| `listPaymentAccounts` / `savePaymentAccount` / `removePaymentAccount` | `/owner/payment-accounts`   | `PaymentAccount`                                                                                          |
| `listZones` / `saveZone` / `removeZone`                               | `/owner/zones`              | `DeliveryZone`                                                                                            |
| `saveSortOrder`                                                       | PUT `/owner/sort`           | `{ kind, ids }`                                                                                           |
| `createUploadUrl`                                                     | POST `/owner/uploads`       | `{ kind: logo\|banner\|item\|category\|qr }` → signed upload URL + `path` (WebP, compressed on the phone) |

Codes: `slug_taken`, `slug_reserved`, `slug_invalid`, `already_has_shop`, `not_allowed`.

## Catalog (owner)

| Method                                                       | HTTP                            | Input → Output                                                    |
| ------------------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------- |
| `listCategories` / `saveCategory` / `removeCategory`         | `/owner/categories`             | `Category` (with `icon`)                                          |
| `listItems`                                                  | GET `/owner/items`              | → `CatalogItem[]` (photos, variants, add-on groups, every status) |
| `saveItem`                                                   | PUT `/owner/items/:id`          | `ItemDraft` → `CatalogItem` (one transaction)                     |
| `setItemStatus`                                              | PATCH `/owner/items/:id/status` | `active\|hidden\|archived`                                        |
| `setSoldOut` / `setStock`                                    | PATCH `/owner/variants/:id`     | `{ isSoldOut }` / `{ stockOnHand }` (logged)                      |
| `listOptionGroups` / `saveOptionGroup` / `removeOptionGroup` | `/owner/option-groups`          | `OptionGroup`                                                     |

Codes: `category_not_empty`, `item_has_orders` (archive instead).

## Storefront (public, `/s/:slug/...`)

| Method                                 | HTTP                      | Input → Output                                                                                                                        |
| -------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `getStorefront`                        | GET `/s/:slug`            | → `Storefront \| null` (pending or suspended shops are null, so the page shows Not found)                                             |
| `quoteOrder`                           | POST `/s/:slug/quote`     | `OrderPayload` (with `scheduledAt?`) → `Quote` (with `problems[]` per line, `slots[]`, `openState`); always called before Place order |
| `placeOrder`                           | POST `/s/:slug/orders`    | `OrderPayload + clientKey` → `{ orderId, orderNo, token }`; retry-safe                                                                |
| `getOrder`                             | GET `/o/:token`           | → `OrderReceipt`                                                                                                                      |
| `createProofUploadUrl` / `submitProof` | POST `/o/:token/proof`    | `{ method, referenceNo, path }` → `Payment`                                                                                           |
| `joinAsMember`                         | POST `/s/:slug/members`   | `{ name, phone, orderToken? }` → `MemberAccount` (1 welcome stamp when the card is on; joining again returns the same account)        |
| `getMyAccount`                         | GET `/s/:slug/me`         | → `MemberAccount \| null`                                                                                                             |
| `saveAddress` / `removeAddress`        | `/s/:slug/me/addresses`   | `CustomerAddress`                                                                                                                     |
| `claimReward`                          | POST `/s/:slug/me/claims` | → `RewardClaim` (custom prize)                                                                                                        |
| `rateOrder`                            | POST `/o/:token/rating`   | `{ stars, comment? }` → `OrderRating`                                                                                                 |
| `subscribePush`                        | POST `/o/:token/push`     | `PushSubscription` → `{ ok }`                                                                                                         |
| `getStorefrontPreview`                 | GET `/s/:slug/preview`    | preview token → `Storefront` built from the draft                                                                                     |
| `listMyOrders`                         | GET `/s/:slug/orders`     | `{ tokens }` (guest order tokens kept on the phone) → `OrderRow[]`                                                                    |
| `resolveMapsLink`                      | POST `/maps/resolve`      | `{ url }` → `{ lat, lng }`; the server follows short links (maps.app.goo.gl); the mock reads full links only (`parseMapsLink`)        |

The cart lives on the device (`deviceStorage`, per slug). Pickup slots and open/closed text come from core (`pickupSlots`, `openState`), but the database decides.

Codes: `shop_not_found`, `shop_closed`, `shop_busy`, `fulfillment_unavailable`, `payment_unavailable`, `cod_not_allowed`, `cod_limit`, `pickup_time_invalid`, `zone_required`, `out_of_range`, `item_unavailable`, `out_of_stock`, `invalid_options`, `reward_unavailable`, `reward_all_claimed`, `reward_paused`, `order_not_payable`, `duplicate_reference`, `too_many_proofs`, `phone_in_use`, `rate_limited`, `slot_unavailable`, `stamps_insufficient`, `preview_expired`, `thread_rate_limited`, `code_expired`, `stamp_daily_cap`.

Closed lists used by these rows (core `schemas/enums.ts`): payment status `unpaid`, `pending`, `paid`, `refunded`; payment methods `cash`, `cod`, `gcash`, `maya`, `bank`, `qr_ph`; order thread message kinds `proof`, `status`, `rider`, `tracking`.

## Orders (owner)

| Method             | HTTP                               | Input → Output                                                                                        |
| ------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `listOrders`       | GET `/owner/orders`                | `{ open } \| { date }` → `BoardOrder[]` (with `scheduledAt`, `isFirstOrder`, `isMember`, `hasReward`) |
| `getOrderDetail`   | GET `/owner/orders/:id`            | → `OrderReceipt`                                                                                      |
| `getProofUrl`      | GET `/owner/proofs/:path`          | → signed URL, 5 minutes                                                                               |
| `reviewPayment`    | POST `/owner/payments/:id/review`  | `{ approve, rejectReason? }` → `Payment`                                                              |
| `recordPayment`    | POST `/owner/orders/:id/payments`  | `{ method }` → `Payment` (cash, COD)                                                                  |
| `advanceOrder`     | POST `/owner/orders/:id/advance`   | `{ toStatus, trackingUrl? }` → `Order` (optimistic on screen)                                         |
| `cancelOrder`      | POST `/owner/orders/:id/cancel`    | `{ reason }` → `Order`                                                                                |
| `saveDeliveryInfo` | PATCH `/owner/orders/:id/delivery` | `{ provider?, trackingUrl?, riderName?, riderPhone? }` → `Order`                                      |

Core helpers that screens use instead of comparing statuses: `boardColumn`, `nextActions`, `canCancel`, `timelineSteps`, `isLate`. They share one test table with the SQL.

Codes: `not_found`, `invalid_transition`, `not_paid`, `payment_not_pending`, `already_paid`.

## Members, home, reports (owner)

| Method                           | HTTP                                        | Input → Output                                                              |
| -------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| `getStampRule` / `saveStampRule` | `/owner/stamp-rule`                         | `StampRule`                                                                 |
| `getToday`                       | GET `/owner/today`                          | → `DashboardToday` (Manila business date)                                   |
| `previewStampRuleChange`         | POST `/owner/stamp-rule/preview`            | `StampRule` → `{ readyNow, pendingClaims }`                                 |
| `listCustomers`                  | GET `/owner/customers`                      | `{ search, membersOnly, segment }` → `CustomerRow[]`                        |
| `getMember`                      | GET `/owner/customers/:id`                  | → `MemberDetail` (ledger, orders, claims)                                   |
| `findMemberByCode`               | GET `/owner/members/code/:code`             | → `{ customerId }`                                                          |
| `adjustStamps`                   | POST `/owner/customers/:id/stamps`          | `{ delta: 1 \| -1, reason, note? }` → `MemberDetail`                        |
| `listRewardClaims`               | GET `/owner/claims`                         | `{ status }` → `RewardClaim[]`                                              |
| `giveClaim` / `cancelClaim`      | POST `/owner/claims/:id/give` and `/cancel` | `{ reason? }` → `RewardClaim`                                               |
| `getInsights`                    | GET `/owner/insights`                       | `{ range: '7d' \| '30d' }` → `Insights`                                     |
| `saveCustomerNotes`              | PATCH `/owner/customers/:id`                | `{ notes, tags }`                                                           |
| `getSalesReport`                 | GET `/owner/reports/sales`                  | `{ from, to }` → `SalesReport`                                              |
| `exportOrdersCsv`                | GET `/owner/reports/orders.csv`             | `{ from, to }` → CSV (BOM; cells starting with `= + - @` get a leading `'`) |

Codes: `stamp_cap_reached`, `stamps_insufficient`, `claim_not_pending`.

## Editor (owner)

| Method                                         | HTTP                                   | Input → Output                         |
| ---------------------------------------------- | -------------------------------------- | -------------------------------------- |
| `getStorefrontDraft` / `saveStorefrontDraft`   | GET/PUT `/owner/storefront/draft`      | `StorefrontContent` with `baseVersion` |
| `publishStorefront` / `discardStorefrontDraft` | POST/DELETE `/owner/storefront/draft`  | → `{ contentVersion }`                 |
| `createPreviewToken`                           | POST `/owner/storefront/preview-token` | → `{ token, expiresAt }`               |

Codes: `draft_conflict`.

## Live updates (Supabase Realtime from `@smartapp/data`)

| Channel                                   | Who          | Payload                                  |
| ----------------------------------------- | ------------ | ---------------------------------------- |
| `order:<token>` (public)                  | receipt page | `{ status, paymentStatus }`              |
| `shop:<tenantId>` (private, shop members) | dashboard    | `{ orderId, op, status, paymentStatus }` |

A payload only triggers a refetch through the normal methods. If the channel isn't joined, the page polls every 15 s.

## Mock adapters

`packages/data/src/mocks/<area>.ts` implements every row above:

- It keeps state on the device and has `resetDemoData()`.
- It adds `MOCK_LATENCY` delay.
- It throws the same codes and enforces the same order steps.

A test fails if a mock or API adapter is missing a method in this file.
