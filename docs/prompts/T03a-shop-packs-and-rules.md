<!-- prettier-ignore-start -->
Task T03a: Shop data shapes, storefront rules and the 5 demo shop packs (packages/core)

Read first: AGENTS.md, docs/blueprints/foundation.md section 4, docs/api.md, docs/demo-shops.md, docs/prompts/ref/demo-menus.md, docs/prompts/ref/storefront-rules.md, docs/SMART_APP_PH_BLUEPRINT.md sections 8.1 to 8.4 and 14.

FOUNDER DECISIONS USED (change before running)
 - Sample data plan: one TypeScript source. Shop packs (look, catalog, add-ons, stamp card, banners, hours, delivery) are copyable data; activity (orders, members, stamps) is generated from a pack plus a date and never copied into real shops (T03b).
 - Two test shops exist only in mock and test runs: `test-blank` (nothing set up) and `test-stress` (long text, big amounts, many items). They are never in a production build.
 - Delivery fees by straight-line km plus named zones (S27, S28); no stock counts (S19); Sold out today (S18); QR Ph (S15); one prep time (S16); COD limit (S32); limited prizes and pause switch (S23, S26). Kapé Juan prize quantity 50 is a mock value.
 - Every pack item carries `sample: true`. Customers never see sample items of a real shop; demo shops (`isDemo: true`) show them.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.
(This task has no UI.)

GOAL
One typed source of truth for what a shop sells and how ordering works, shared later by the mock adapters, tests, the NestJS API, the dev database seed and "Start with samples".

0. BEFORE YOU CODE
 - Branch ag/t03a-shop-packs from the latest main. Node 24.14.0. No new packages (Zod only). Post a short plan (every schema and rule file) and wait for my OK.

1. CONTRACT FIRST (docs/api.md)
 - Storefront rows gain: `resolveMapsLink` POST /maps/resolve { url } → { lat, lng } (server follows short links; mock handles full links only), `listMyOrders` GET /s/:slug/orders { tokens } → OrderRow[], `sendCustomerCode` resend rules (60 s, 5 per hour).
 - Error codes added: out_of_range, cod_limit, reward_all_claimed, reward_paused, code_expired, thread_rate_limited, stamp_daily_cap.
 - Payment status adds `refunded`; payment methods add `qr_ph`; order messages kinds: proof, status, rider, tracking.

2. SCHEMAS (packages/core/src/schemas, one file per shape, camelCase, money in centavos, times ISO UTC)
 - storefront.ts: Storefront (public shop) = info (name, tagline, about, kind, isDemo, logo MediaRef|null, contact: phone, messengerUsername, facebookUrl, googleReviewUrl, address + showAddress, pin {lat,lng}|null, pickupNote), look (brandColor, banners: {ref, alt}[] max 3, bannerSeconds 3..10 default 5, announcement {text, tone, endsAt}|null, sections on/off: banners, announcement, rewards, favourites, categories, bestSellers, about, hours, contact, membersCount), hours (week) + closures, orderTypes allowed, prepMinutes (default 20), takeOrdersWhileClosed, payments (accounts: cash, cod, gcash, maya, bank, qr_ph with name/number/qr MediaRef), codMaxTotal|null, delivery (distance rows {fromKm,toKm,fee,etaText,minOrder} max 5, zones {name,fee,etaText}, freeDeliveryFrom|null), stampCard (public part: status off|on|paused, rule, reward).
 - catalog.ts: Category {id, name, icon: IconKey, sort}, Item {id, categoryId, name, description, photos: MediaRef[] max 5, axes (max 2, 1..10 values, each value with an optional photo MediaRef), variants (max 30; price, availability: available|sold_out_today|sold_out, soldOutUntil), optionGroupIds, pairingIds max 4, featured, status, sample}, OptionGroup {min 0..10, max 1..10, min ≤ max, options {name, priceDelta ≥ 0, isDefault, soldOut}}.
 - basket.ts: BasketLine {itemId, variantId, optionIds sorted, note ≤ 120, qty 1..99}, Basket {slug, version, lines}.
 - order.ts: OrderPayload (strict: no prices), Quote {lines with problems[], subtotal, discount, deliveryFee, distanceM, total, slots[], openState, readyEstimate, problems[]}, OrderReceipt {orderNo, token, type, status, paymentStatus, scheduledAt, events[], messages[], lines, totals, payment instructions, rider, trackingUrl, refund, rating, expiresAt}.
 - loyalty.ts: StampRule {minOrderTotal, stampsNeeded 4..20, welcomeStamps 0|1, maxEarned + period day|week|month|null}, Reward {kind discount|free_item|custom, amount, itemId, variantId, title, description, image, quantityTotal|null, quantityLeft, onePerCustomer}, MemberAccount {name, phone, email, balance, pendingStamps, rewardReady, history: {kind welcome|pending|earned|redeemed|reversed|given|removed, delta, reasonCategory, orderNo, at}[] (never the owner's private note)}, RewardClaim {code, status, qrUrl}.
 - Every closed list = `as const` array + z.enum in enums.ts (AGENTS rule 5). Tests: a valid sample parses for every shape; OrderPayload with a price field fails.

3. RULES (packages/core/src/rules, pure functions, one test table each)
 - money.ts: formatPeso (₱1,234 with no .00 for whole pesos, ₱12,345.50), parsePeso ("₱120", "120.50").
 - time.ts: formatManila, manilaDate, minutesUntil.
 - hours.ts: openState(storefront, now) → open | closed | busy with words keys and next opening; pickupSlots(storefront, now) (from prepMinutes, 15-minute steps, today or tomorrow, inside hours, skip closures; closed shop → next-opening slots only when takeOrdersWhileClosed); nextOpening; isSoldOutToday(variant, now).
 - options.ts: lineIdentity, linePrice, validateLinePicks (required groups, min/max, sold-out options, impossible variant combos) → problems with the group name; defaultPicks(item).
 - delivery.ts: distanceM(a, b) (haversine), deliveryFee(storefront, spot|zone, subtotal) → {fee, distanceM, etaText} | out_of_range with the max km; parseMapsLink(url) for full Google Maps links (@lat,lng, ?q=lat,lng, !3d…!4d…); short links return null (the server resolves them).
 - order-rules.ts: timelineSteps(type), canCancel, statusTone (from STATUS_TONE), payCountdown(expiresAt, now).
 - stamps.ts: stampProgress(balance, needed), earnsStamp(rule, subtotal, earnedInPeriod), rewardState(card, member, now) → ready | pending | paused | all_claimed | free_item_sold_out | not_ready, quantityLabel (Only 100 pieces / 23 left at ≤ 20% / All claimed).
 - phone.ts: normalisePhPhone (0917…, 917…, +63…) → +639XXXXXXXXX or a problem.
 - Words for every visible message go in words.ts (functions for dynamic text), matching ref/storefront-rules.md wording.

4. SHOP PACKS (packages/core/src/demo/packs/<slug>.ts, typed by ShopPackSchema)
 - 5 packs from ref/demo-menus.md exactly (categories, items, choices, prices, add-on groups, rewards, stamp rules, brand colours) plus docs/demo-shops.md (address, pins, hours, phones). Photos as `demo:<slug>/items/<key>` only when DEMO_MEDIA (T02a) has the file; otherwise an empty photo list (the placeholder shows). Items with several photos (Tala Basic Tee black/white/sand, Linen Button-down natural/indigo, AquaLinis 5-Gallon Refill purified/alkaline/mineral/slim) list them all, and the matching axis value carries `photo` so choosing Sand shows the Sand photo first. Category icons from ICON_KEYS.
 - Delivery per shop: kanto-smash distance 0–3 km ₱49, 3–5 km ₱79 + its 3 zones, COD limit ₱3,000; aqualinis zones only; tala-apparel zones only (Cebu City ₱80, Mandaue ₱120, Lapu-Lapu ₱150), shipping not in A; kape-juan distance 0–2 km ₱39, 2–4 km ₱59; lola-remy distance 0–3 km ₱40 + zones. Payment accounts: every shop GCash; kanto-smash and kape-juan Maya; tala-apparel Bank and QR Ph; lola-remy QR Ph. Account numbers are clearly fake (0917 000 0000 style) and labelled "Sample".
 - Blueprint 14 states: Tala 2-axis variants with one sold-out combination (M · Sand); Kanto required and optional groups with a sold-out option; Kapé Juan sugar level default; pairings on burgers and coffee; Lola Remy opens 5 AM (closed-shop scheduling demo); Tala closed Mondays; one closure next week for kape-juan; one "Sold out today" item per food shop.
 - Messenger usernames, Facebook and Google review links: fictional, marked sample.
 - packages/core/src/demo/test-shops.ts: `test-blank` (food, name only, no logo, no banners, no categories, no items, stamp card off, walk-in + cash, normal hours) and `test-stress` (retail, 60-character name, 60 items across 8 categories, names over 40 characters, a ₱12,345.50 item, a 30-variant item, a group with 10 options, one category all sold out, announcement of 200 characters, 3 banners, stamp card paused).
 - Update docs/demo-shops.md: replace menus, rewards and stamp rules with ref/demo-menus.md; add the delivery and payment lines above. Keep the rest.

5. TESTS
 - Every pack and test shop parses; every item photo ref exists in DEMO_MEDIA; every option group referenced exists; no pack has more than 30 variants per item or 4 pairings.
 - Rules: table tests for openState (open, closed, busy, Lola Remy 4:30 AM), pickupSlots (closed shop with and without takeOrdersWhileClosed, closure skipped), validateLinePicks (missing required, over max, sold-out option, impossible combo), deliveryFee (inside rows, beyond rows → zone, nothing fits → out_of_range with max km), parseMapsLink (3 link forms + short link null), stamps (cap reached, paused, 23 left, all claimed, free item sold out), formatPeso (₱12,345.50, ₱1,234, ₱0 → "Free" in option labels).

6. DOCS
 - docs/decisions.md: N25 Delivery fees by straight-line km rows plus named zones; no map, no Maps API in A (S27, S28). N26 Availability is Available, Sold out today or Sold out; no stock counts in A (S18, S19). N27 Stamp card status Off, On or Paused; limited prizes stop at 0; max earned stamps per day/week/month, default 1 per day (S23, S24, S26). N28 Shop packs are the one source for mocks, tests, the dev seed and "Start with samples"; test-blank and test-stress exist only in mock and test runs. Also the remaining approved Storefront Blueprint v1.4 rows in one line each: S7 thread without chat, S8 Messenger copy then open, S15 QR Ph, S16 one prep time, S29 refunds, S30 offline receipt, S31 slow-data upload + countdown, S32 COD limit, S33 code problems, S34 pending stamp.
 - docs/PROGRESS.md: replace the T03 line with "T03a Shop packs and rules" and "T03b Mock store, adapters and hooks"; tick T03a. One CHANGELOG line.

DONE WHEN
 - `pnpm --filter @smartapp/core test` covers every rule above and passes; packs match ref/demo-menus.md item for item (a test counts items per shop: Kanto 18, AquaLinis 8, Tala 14, Kapé Juan 18, Lola Remy 19).
 - core still has no React, Supabase, ui or data imports (lint walls).

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint and pnpm build green. Never weaken eslint or tsconfig, never skip a test. No workarounds: stop and show me any error.
 - gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test, what I must do by hand.

OUT OF SCOPE: mock adapters and hooks (T03b), screens, NestJS routes, migrations, the dashboard "Start with samples" button.
<!-- prettier-ignore-end -->
