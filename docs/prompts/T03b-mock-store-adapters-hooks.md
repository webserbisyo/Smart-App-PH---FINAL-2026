<!-- prettier-ignore-start -->
Task T03b: Mock store, storefront adapters, device storage and data hooks (packages/data)

Read first: AGENTS.md, docs/blueprints/foundation.md section 4, docs/api.md, docs/prompts/ref/storefront-rules.md, docs/SMART_APP_PH_BLUEPRINT.md sections 6, 8.2, 8.3 and 14.

FOUNDER DECISIONS USED (change before running)
 - Mock state for things a customer creates (orders, proofs, member account) lives on the device, like the real phone data would; demo receipts in every state are generated from the packs so screenshots and tests can open them by a fixed token.
 - A dev-only scenario switch (`?mock=`) makes slow, error, empty, offline, closed and member states reachable on any page. It never exists in a production build.
 - In mock mode the email code is always 123456 and the dev build shows it in a toast; production never shows it.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.
(This task has no UI except one dev-only toast text in words.ts.)

GOAL
Screens get every storefront answer from @smartapp/data hooks, with the same Zod shapes, error codes and rules the NestJS API will have, so switching an area to the API later changes no screen.

0. BEFORE YOU CODE
 - Branch ag/t03b-mock-store from the latest main (after T03a). Node 24.14.0. No new packages (vitest, jsdom and Testing Library are already in the catalog; add them to packages/data devDependencies with "catalog:" only if missing). Post a short plan and wait for my OK.

1. DEVICE STORAGE (packages/data/src/device-storage.ts)
 - One `deviceStorage` with versioned keys per shop: basket, favourites, checkoutDraft, lastAddress, orderType, guestOrderTokens (90 days), savedReceipts (7 days after the order ends), mockState. Zod-parsed on read; a bad or old version resets that key and returns a one-line notice code.
 - Safe when storage throws (Safari private mode, blocked storage): falls back to memory for the session.
 - Subscribe API for useSyncExternalStore, so every tab and component sees the same basket.

2. MOCK STORE (packages/data/src/mocks/)
 - createMockStore({ seed, now }) builds state from the packs (T03a) and a seeded generator (mulberry32; no faker). Fresh store per test.
 - Activity per demo shop, dated relative to now: orders in every status for the owner side, members in every segment, ledgers with welcome, pending, earned, redeemed, reversed and manual rows (blueprint 14).
 - DEMO_RECEIPTS: fixed tokens per demo shop for the customer side: demo-placed-transfer (countdown running), demo-proof-pending, demo-proof-rejected, demo-preparing, demo-ready-pickup, demo-out-for-delivery (rider + tracking link), demo-completed (rating open), demo-completed-rated, demo-cancelled-refunded, demo-expired, demo-scheduled (closed shop, next opening). Exported so Playwright can visit /<slug>/o/<token>.
 - Demo customer "Juan dela Cruz" (juan@example.com, 0917 000 1234) with states: guest, member, member-ready (reward ready), member-pending (pending stamp), member-capped (today's stamp earned).
 - MOCK_LATENCY 400 ± 150 ms (0 in tests). Scenario from setMockScenario({ latency: 'none'|'normal'|'slow', fail: area|null, empty: boolean, offline: boolean, now: ISO|null, as: customer state }). Values persist in sessionStorage (dev only).

3. ADAPTERS (one interface per area; mock implements every storefront row in docs/api.md)
 - storefront: getStorefront (pending/suspended/unknown → null; test shops only outside production), quoteOrder (all rules from core: options, availability incl. sold out today, open state and slots, delivery fee or out_of_range, COD limit, reward use, flagged lines), placeOrder (clientKey idempotent, gap-free daily number per shop in Manila time, token, expiresAt 30 min for transfers only, at most 3 unpaid orders per phone per 30 min), getOrder, listMyOrders, createProofUploadUrl + submitProof (max 3, only while unpaid; a proof never marks paid; duplicate reference blocked), rateOrder, subscribePush (no-op), resolveMapsLink (full links via parseMapsLink; short links → invalid_input with "Paste the full link"), joinAsMember, getMyAccount, claimReward (quantity drops atomically, stops at 0 with reward_all_claimed, one per customer, paused card → reward_paused).
 - auth (customer): sendCustomerCode (60 s resend, 5 per hour → rate_limited), verifyCustomerCode (123456 ok; wrong → invalid_code; older than 10 min → code_expired).
 - owner orders (needed by the dev "Demo owner" panel in T10 and the dashboard later): advanceOrder, reviewPayment (approve, reject with reason), recordPayment, cancelOrder (reason; paid → refunded with reason), saveDeliveryInfo. Steps only move forward; completing needs paid.
 - owner samples: applySamplePack(packSlug) and clearSamples(); add both rows to docs/api.md (POST and DELETE /owner/samples). After clearSamples a demo shop's storefront looks like test-blank (tested).
 - DATA_SOURCE=mock|api per app (env, Zod-checked). Write the interface and the mock only; no api adapter stubs (each area gets its api adapter in phase 4).

4. HOOKS (packages/data/src/hooks/storefront/*.ts, TanStack Query)
 - useStorefront, useQuote (debounced 400 ms, keeps the last good answer while refetching), usePlaceOrder (mutation; disabled while offline, never retried in the background), useOrder (poll 15 s while open; stops when the order ends), useMyOrders, useSubmitProof, useRateOrder, useMyAccount, useJoin, useSendCode, useVerifyCode, useClaimReward, useResolveMapsLink.
 - Device hooks: useBasket (add with merge by lineIdentity, setQty, remove, clear, version notice), useFavourites, useCheckoutDraft, useLastAddress, useOrderType, useSavedReceipt (offline receipt), useOnline.
 - One qk.ts for keys; writes invalidate the right keys. Query network mode follows docs (queries pause offline; mutations never queue).
 - A server-safe `getStorefrontForServer(slug)` in @smartapp/data/server for Next server components (mock reads packs; no device state).

5. DEV SCENARIO SWITCH
 - `readMockScenarioFromUrl(searchParams)` for the storefront: `?mock=slow|error|empty|offline|closed|basket|none` (basket fills 3 demo lines for screens built before the menu) and `?as=guest|member|member-ready|member-pending|member-capped` and `?now=2026-10-24T04:30+08:00`. Only when NODE_ENV is not production AND DATA_SOURCE is mock; otherwise a no-op that tree-shakes away.
 - CI: add "setMockScenario" and "mock-scenario" to the build scan list (must not appear in the storefront production build).

6. TESTS (packages/data: add a vitest config and a test script like the other packages)
 - Contract: every storefront and owner-orders row in docs/api.md has a mock method with the same name; each output parses with its schema.
 - Rules: idempotent placeOrder; order numbers gap-free and reset per Manila day; proof never marks paid; 4th proof → too_many_proofs; COD over limit → cod_limit; delivery out of range → out_of_range; sold out today back after next opening (time travel with now); reward quantity race (two claims for the last piece → one wins); paused card; stamp daily cap; clearSamples → looks like test-blank; scenario switch is a no-op in production mode.
 - deviceStorage: version reset, storage throwing → memory fallback, basket merge by identity.

7. DOCS
 - docs/api.md rows added above; docs/decisions.md: N29 Mock state for customer-created data lives on the device; DEMO_RECEIPTS give fixed tokens for every receipt state. T24 Dev-only mock scenario switch (?mock, ?as, ?now) never ships in a production build.
 - Tick T03b in PROGRESS.md, one CHANGELOG line.

DONE WHEN
 - `pnpm --filter @smartapp/data test` passes with the cases above; `pnpm build` of the storefront contains no scenario code (CI scan).
 - Every hook has a typed result and no screen needs to import anything from mocks.

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint and pnpm build green. Never weaken eslint or tsconfig, never skip a test. No workarounds: stop and show me any error.
 - gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test, what I must do by hand.

OUT OF SCOPE: screens, NestJS routes, migrations, Supabase Realtime (mock polls), real email codes, push sending.
<!-- prettier-ignore-end -->
