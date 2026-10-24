<!-- prettier-ignore-start -->
Task T11: My orders (active and past) and Order again

Read first: AGENTS.md, docs/ux.md, docs/components.md, docs/api.md (listMyOrders), docs/prompts/ref/storefront-rules.md sections 5 and 7, docs/prompts/ref/storefront-components.md section 3 (My orders), docs/SMART_APP_PH_BLUEPRINT.md sections 6.5, 7.9 and 8.3.

FOUNDER DECISIONS USED (change before running)
 - Guests see the orders saved on this phone (guestOrderTokens, 90 days); members also see their account orders; the two lists merge by order id. No sign-in needed to see your own phone's orders.
 - Order again copies the lines into the basket and lets the T08 rules flag anything changed; it never places an order by itself.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

GOAL
A returning customer finds their current order in one tap from the dock and reorders a past one in two taps.

0. BEFORE YOU CODE
 - Branch ag/t11-my-orders from the latest main (after T10). Node 24.14.0. Post a short plan and wait for my OK. Never touch dashboard shell styling.

1. ROUTE /[shop]/orders (features/orders; device data, client-only parts with same-size skeletons)
 - Tabs Active / Past (c-tabs-7 pattern; Active first, counts in the labels; opens on Past when nothing is active). URL ?tab=.
 - Active card (c-item-10 pattern): "#042 · Pickup · Ready in about 10 min", status badge, total, first 3 item thumbnails (ShopImage), and the next step in words: "Pay within 18:20", "Upload your proof", "Waiting for the shop to check your payment", "Ready for pickup", "Rider on the way". Tap → receipt.
 - Past row (c-item-4 pattern): date and time (Manila), number, item count, total, status badge, "Order again".
 - Status badges: completed c-badge-22, preparing / ready c-badge-15, cancelled / expired c-badge-14, refunded c-badge-17 patterns; colour plus text, never colour only.
 - Rated orders show their stars; completed and not rated show "Rate your order".
 - Member hint for guests (stamp card On): "Join to keep your orders and stamps on any phone" → T12 join.

2. ORDER AGAIN
 - Adds the order's lines to the basket (merging with what is there), opens the basket, toast "Added 3 items". Lines that no longer exist or changed are flagged by T08 rules; a fully gone order shows "These items aren't available anymore".

3. STATES
 - Empty (c-empty-4 pattern): "No orders yet" + Browse menu. Loading: c-skeleton-7 pattern. Error: Try again (device list still shows). Offline: phone-saved orders with "Last updated" and no refresh. 50 past orders (test-stress) load 20 at a time with "Show more". Old tokens past 90 days drop out silently.

4. TESTS
 - Unit: merge of guest tokens and member orders (dedupe, sort newest first); next-step text for every status × payment state.
 - e2e (routes.ts): orders for kanto-smash with demo receipts saved on the device (test helper) → active card shows the next step; Order again fills the basket; empty state on a fresh phone; ?as=member shows account orders; offline shows saved orders.

5. DOCS
 - components.md "Used in". Tick T11 in PROGRESS.md, one CHANGELOG line.

DONE WHEN
 - Active and past orders look finished for guest and member at 360, 390, 768, 1024 and 1280 px; Order again works for a food and a retail order; empty, offline and test-stress states look finished.

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint, pnpm build and pnpm e2e green. Never weaken eslint or tsconfig, never skip a test. No workarounds: stop and show me any error.
 - Screenshots at 390 and 1280: active, past, empty, member. gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test, what I must do by hand.

OUT OF SCOPE: receipt changes (T10), join and rewards (T12), order search or filters, customer cancel.
<!-- prettier-ignore-end -->
