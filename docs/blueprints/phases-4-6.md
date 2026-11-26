# Phases 4 to 6: build plan (APPROVED)

The detailed plan for launch phases 4 (Menu and Products), 5 (Storefront, orders and payments) and 6 (Members, stamp card, Push News and Home) from `launch-phases.md`. Written 2026-11-25 from `main` @ d86dd6a (phases 1 to 3 merged) after a scan of the code and research in the official docs. Status: **approved** (decision T117, founder 2026-11-25: yes to Q1 to Q14, plus the dashboard's pull to refresh and "New version ready" bar). `launch-phases.md` stays the map; this file is the build spec for these three phases. Where they differ, this file wins once approved.

The founder does every by-hand step (Railway, Resend, DNS, keys) at the very end, after all the code is in (founder, 2026-11-25). So every phase here is built and tested on the laptop database in CI first, and the checks that need real phones and real email wait for the staging setup in `docs/launch.md` section 11 and 12.

## 0. Brief

**Goal.** A customer orders from a real shop's storefront in under a minute, the owner runs that order to the end with the payment checked by hand, and members earn and use stamps, all on the dev database through NestJS. The sample-data demo keeps working for previews and the video shoot.

**Done when.** Each phase's "Done when" in section 7 passes. CI is green on `main`. Launch acceptance 1 to 4 (`A-mvp.md` section 5) pass on the laptop database in CI, then on staging with a real iPhone and Android phone once the founder's setup is done. The Vercel demo links still show the 5 sample shops.

**Not in scope.** Plan, billing, Super Admin and Meta (phase 7). The live database and domains going live (phase 8). New screens: phases 4 to 6 wire screens that already exist, with three small additions the founder decides on (section 9: owner new-order push, bulk menu actions in one request, the storefront's shop address helper).

## 1. Where we start (checked 2026-11-25)

- **Database:** all 14 migrations are on dev (checked read-only with the Supabase connector). Every phase 4 to 6 table exists with row security, plus guard functions: `next_order_no` (gap-free numbers), `take_daily_count` and `give_back_daily_count`, `lock_slot`, `lock_stamp_balance`, `take_prize` and `give_back_prize`. There is no `place_order` function: NestJS runs the steps in one transaction and calls the guards (section 3).
- **API:** NestJS modules for auth, shop, settings, media (uploads, storage), editor, jobs and health. Every request runs in one transaction as `app_api` with the shop set. Two timed jobs run (unconfirmed uploads hourly, unused files nightly).
- **Data layer:** `packages/data` has an API adapter file for every area (`owner-catalog.ts`, `storefront.ts`, `owner-orders.ts`, `owner-members.ts`, `owner-news.ts`, `owner-home.ts`), written early and never tested. The per-area switch (`VITE_API_AREAS`) has 5 areas today.
- **Storefront:** reads its pages on the server with `getStorefrontForServer(slug)` from sample data (44 call sites), with `'use cache'` and Cache Components. The Serwist worker already shows order pushes and opens the receipt on a tap. `push.ts` asks for permission but never subscribes (no server key yet).
- **Rules already in core** (tested, shared by the mocks): order steps (`canAdvance`, `nextActions`, `payWindowOver`, `balanceOf`), schedule and slots (`scheduleDays`), variant prices, stamps (`earnsStamp`, `rewardState`), news limits (`newsSendBlock`, `outOfQuiet`), Home numbers (`buildHomeSummary`, `buildHomePeriod`). The price quote (`quote()`) lives in `packages/data/src/mocks/quote.ts`, where the API can't use it.
- **Live updates:** Orders and Home poll every 15 s and on focus, never in the background (`refetchIntervalInBackground: false`). Owner alerts are email only (`NotificationPrefs`).
- **JS budget:** storefront `/join` is at 300.0 of 300 KB. Any new client code there must come with a cut elsewhere.

## 2. Research findings that change the plan

V = verified in current official docs, package files or our own code. A = assumed or community source; we test it before relying on it.

| #   | Finding                                                                                                                                                                                                                                                                              | V/A                                                      | What we do                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `order_lines.variant_id` and `order_line_options.option_id` are `on delete restrict`. Removing a size or an add-on that was ever ordered would fail, so the Menu's "save item" breaks on any real shop with orders.                                                                  | V (our migrations)                                       | New migration: both become nullable `on delete set null`. Order lines already copy the name, label and price, so history stays right (X1).                                                                                                                                   |
| R2  | Railway blocks outgoing email ports (25, 465, 587) on the Hobby plan; staff advise an HTTPS email API. Supabase sends its own login codes, so that part is safe.                                                                                                                     | A (Railway staff answers; docs page lists a port test)   | NestJS sends its emails (new order, payment to check) through **Resend's HTTPS API**, never SMTP (Q4).                                                                                                                                                                       |
| R3  | Resend's free plan allows 100 emails a day and 3,000 a month, counting sign-up codes, member join codes and new-order emails together.                                                                                                                                               | V (Resend docs)                                          | New-order alerts go by push first (Q2), email only when the owner turns it on. Plan the $20 Resend plan before the 3rd busy shop (section 10).                                                                                                                               |
| R4  | iPhone: push works only from the home-screen app (iOS 16.4+), the permission must follow a tap, and every push **must** show a notification or Safari revokes the subscription (a missing `event.waitUntil` counts).                                                                 | V (WebKit, Apple docs)                                   | Our worker returns early on a bad payload: it will always show a fallback notice instead (X9). Keep the tap-to-ask flow.                                                                                                                                                     |
| R5  | Declarative Web Push (iOS 18.4+): a JSON payload with `"web_push": 8030` and a `notification` member shows without running the worker, and other browsers fall back to the normal push event.                                                                                        | V (W3C Push API draft, WebKit)                           | Send every push in the declarative shape; the worker reads both shapes. iPhones then show pushes even if the worker is slow (X9).                                                                                                                                            |
| R6  | VAPID keys are not tied to a website: one key pair can sign pushes for every shop's address. Apple rejects tokens with a bad `sub`; use a real `mailto:` or `https:` subject. Each subscription belongs to the address it was made on, so each `<slug>.webserbisyo.com` has its own. | V (RFC 8292, Apple docs); A for Apple's `sub` strictness | **One platform key pair** in Railway (Q5), subject `mailto:codes@mail.webserbisyo.com`. foundation.md's "the shop's VAPID keys" is reworded. The storefront asks the API for the public key, so it lives in one place.                                                       |
| R7  | `web-push` 4.0.0 (2026-11-06) is now an ES module with 4 dependencies; it ships no types, and `@types/web-push` is written for 3.x.                                                                                                                                                  | V (npm registry)                                         | Install `web-push` 4.0.0 (19 days old, passes the 7-day rule) and `@types/web-push` 3.6.4. A test checks the 3 functions we use (`setVapidDetails`, `sendNotification`, `generateVAPIDKeys`) exist; if the types disagree, a 20-line typed wrapper replaces them (no casts). |
| R8  | Next.js 16: `revalidateTag(tag, 'max')` marks cached data stale and serves the old copy while it refreshes; the one-argument form is deprecated. Route handlers may call it.                                                                                                         | V (next@16.4.6 docs)                                     | Storefront reads use `'use cache'` + `cacheTag('shop:<id>')`. NestJS calls a secret storefront route after Publish, a menu save or a settings save, which calls `revalidateTag(…, 'max')`. Prices, stock and open/closed are still checked fresh at checkout (T6).           |
| R9  | Next.js 16 Proxy (was Middleware) runs on Node by default and can rewrite by host.                                                                                                                                                                                                   | V (next@16.4.6 docs)                                     | `proxy.ts` turns `<slug>.webserbisyo.com/menu` into `/<slug>/menu` inside the app. Links need one helper so they never print `/<slug>` twice (X7).                                                                                                                           |
| R10 | The official Next.js PWA guide sends pushes from Server Actions. Our rule 13 says the browser talks to NestJS only.                                                                                                                                                                  | V (Next docs), our rule                                  | We keep the guide's client steps (subscribe with the server key, worker shows it) and send from NestJS. No Server Actions.                                                                                                                                                   |
| R11 | Railway's proxy: community reports of server-sent events being held back until the stream ends and cut at 5 minutes, even with heartbeats.                                                                                                                                           | A (Railway forum, docs say up to 15 min)                 | Keep polling every 15 s for launch (T53), plus owner push for when the screen is off (Q2). Server-sent events move to MVP B. api.md's "SSE in phase 4" line is updated.                                                                                                      |
| R12 | Mobile networks in the Philippines put many phones behind one shared address (carrier-grade NAT). A per-address limit can block real customers in a busy area.                                                                                                                       | A (common carrier practice)                              | Storefront writes are limited per phone number and per shop (the A-mvp rules), with a generous per-address ceiling (300 a minute) only as a flood guard.                                                                                                                     |
| R13 | Storefront pages are rendered by Vercel's servers, so every server-side read reaches NestJS from a few Vercel addresses.                                                                                                                                                             | V (how our storefront renders)                           | Server reads carry a secret header that skips the per-address limit; the browser's own calls stay limited.                                                                                                                                                                   |
| R14 | Drizzle 0.45 supports `for('update', { skipLocked: true })`. With the transaction pooler, row locks work inside one transaction.                                                                                                                                                     | V (drizzle-orm types in our install)                     | Job queues (emails, pushes, news) take rows with `for update skip locked` inside `runLocked`, so no queue package is needed.                                                                                                                                                 |
| R15 | Bulk menu actions today send one request per item at once (`Promise.all`). On the API that means partial failures and hitting the rate limit.                                                                                                                                        | V (our hooks)                                            | One bulk route per action, one transaction, all or nothing, at most 100 items (Q7).                                                                                                                                                                                          |
| R16 | Home rules already compute every number from a list of sales in core (H1 to H14).                                                                                                                                                                                                    | V (our code)                                             | NestJS loads the shop's last 60 days of sales in one indexed query and runs the same core functions, so mock and API agree by construction. SQL totals only if a 10,000-order test is slow (`EXPLAIN` check).                                                                |
| R17 | `fflate` (0.8.3): zero dependencies, own types, makes ZIP files piece by piece. `archiver` (8.0.0): 9 dependencies, separate types.                                                                                                                                                  | V (npm registry, package READMEs)                        | Use **fflate** for the Export ZIP (Q8). This replaces my earlier `archiver` suggestion: same job, fewer packages to trust.                                                                                                                                                   |
| R18 | `maps.app.goo.gl` short links need a server to follow them. Following any link a customer pastes is a known attack (the server can be tricked into calling inside addresses).                                                                                                        | V (OWASP SSRF)                                           | `resolveMapsLink` follows at most 3 redirects, only to Google Maps hosts over https, with a 3 s timeout, and returns only the coordinates.                                                                                                                                   |

## 3. How the pieces work (patterns for phases 4 to 6)

**Where the rules live.** Rules that decide money, counts or stamps run in NestJS inside the request's one transaction, using the shared core functions, and the database guards the edges: CHECKs, unique keys and the lock functions in section 1. The browser never writes money, counts or stamps (`app_api` is the only role with write grants). This is how phases 1 to 3 work, and it keeps one copy of each rule (core) for the mock and the API. `A-mvp.md` section 4 says "computed in SQL functions"; it is reworded to "computed on the server inside one transaction, with SQL guards" (D1 in section 11).

**Shared quote.** `quote()` moves from `packages/data/src/mocks/quote.ts` to `packages/core/src/rules/quote.ts`, so `quoteOrder`, `placeOrder`, `quoteOwnerOrder` and `createOwnerOrder` use the exact rules the mock uses. One test table runs against both.

**Placing an order (one transaction):**

1. Read the shop, its settings and the lines' items, variants and options `for share`.
2. `quote()` again on the server; a changed price or a sold-out line answers with `problems[]`, never a silent change.
3. Limits: 3 unpaid orders per phone per 30 minutes, 30 per shop per minute (`rate_limited`).
4. `lock_slot` for a booked time, then count the slot (`slot_full`); `take_daily_count` per line (`daily_limit_reached`); `take_prize` for a limited prize.
5. `next_order_no`, a random token and pickup code, insert the order, lines and options, the first event, `order_push` for the phone, and the outbox rows (new-order alert).
6. The same `clientKey` returns the first order (unique `(tenant_id, client_key)`), so a double tap never makes two.

**Order and payment steps.** `advanceOrder`, `recallOrder`, `cancelOrder`, `reviewPayment`, `recordPayment` and the expiry job all go through one `OrderSteps` service that calls core's `canAdvance` and writes `order_events`. Give-backs (daily count, prize, stamps used) happen once, in the same transaction as the cancel or expiry.

**Outbox, then send.** Anything that leaves the system (email, push) is first written as a row in the same transaction as the change that caused it, so a rolled-back order never sends a push. After the commit, NestJS starts sending right away; a job every 30 seconds picks up anything left (`for update skip locked`, R14), retries with back-off (1, 5, 15 minutes, then failed) and marks dead phones (410 or 404 from the push service) as gone.

**Storefront reads (phase 5).**

- Pages read on the server from NestJS with `'use cache'` and `cacheTag('shop:<id>')` (R8). NestJS calls the storefront's secret revalidate route after anything a customer sees changes.
- The page then fetches the fresh bits from the phone (open/closed, sold out, prices) as it does today, and checkout always calls `quoteOrder`.
- Demo builds keep reading sample data; a per-area switch for the storefront mirrors the dashboard's (`NEXT_PUBLIC_API_AREAS`).

**Shop address (phase 5).** `proxy.ts` maps `<slug>.webserbisyo.com` to the `[shop]` route (R9). One helper, `shopHref(slug, path)`, writes links for both the main address and the backup `shop.webserbisyo.com/<slug>`. Manifest scope and id follow the address. CORS and the Origin check accept `https://<slug>.webserbisyo.com` by pattern (today they take an exact list only).

**Customer login (phase 6).** Members sign in with a 6-digit email code through NestJS (Supabase Auth behind it, D2). The member cookie is set by `api.` with its own name (`sa_member_*`), separate from the owner's. One Supabase account can be a member of many shops; each shop has its own `members` row and sees only its own.

**Push pipeline (phases 5 and 6).** See section 5.

**Live updates.** Polling every 15 s and on focus stays (T53); the owner new-order push covers the screen-off case (Q2). Server-sent events wait for MVP B (R11).

**Testing pattern (every area).** Contract tests run the same cases against the mock and the API adapter. API integration tests run against local Supabase in CI. A race test fires 20 orders at once at the last slot and the last daily item and expects exactly one to win. Cross-shop tests for every new route.

## 4. Database cross-check (phases 4 to 6 tables against Zod, api.md and screens)

| #   | Mismatch                                                                                                                                                                          | Fix (phase)                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X1  | Ordered sizes and add-ons can never be removed (`restrict`, R1).                                                                                                                  | Migration: `order_lines.variant_id` and `order_line_options.option_id` nullable, `on delete set null`. Item deletes stay blocked by `item_has_orders` (4).                            |
| X2  | `VariantTemplate` has `sample` in Zod; `variant_templates` has no `is_sample`, so "Clear samples" can't find sample templates.                                                    | Same migration adds `variant_templates.is_sample` (4).                                                                                                                                |
| X3  | Item, variant and option ids are any string in Zod (`IdSchema`); the database uses uuid. A bad id would reach Postgres and come back as `unknown`.                                | API routes check ids as uuid and answer `not_found` for anything else; mocks keep their readable ids (4).                                                                             |
| X4  | "Start with samples" copies a pack's items, but item photos must be `media_files` rows in the shop's own storage; the sample photos are files in the storefront's `/demo` folder. | NestJS copies the pack's photos into the shop's `menu` bucket when it applies the pack (about 1 to 3 MB; counted in storage) and marks them sample; "Clear samples" deletes them (4). |
| X5  | `notification_outbox` needs an email address, so it can't hold pushes (order status, stamp added, reward ready, owner new order).                                                 | Migration: a small `push_outbox` table (kind, subscription or member, payload, dedupe key, attempts, send after), RLS and grants in the same file (5).                                |
| X6  | Owner push (if Q2 is yes): `push_subscriptions` belong to a shop and optionally a member; there is no link to an owner.                                                           | Same migration adds `push_subscriptions.user_id` (the owner) with a check that a row is either a member's/guest's or an owner's (5).                                                  |
| X7  | Storefront links are written as `/<slug>/…` everywhere; on `<slug>.webserbisyo.com` that path would repeat the slug.                                                              | `shopHref` helper and a lint check for hand-written `/${slug}` links (5).                                                                                                             |
| X8  | CORS and the CSRF Origin check take an exact list; shop addresses are a pattern.                                                                                                  | `CORS_ORIGINS` gains one pattern entry, `https://*.webserbisyo.com`, matched by a strict regex (letters, digits, dashes; no dots) (5).                                                |
| X9  | The worker skips a push it can't read without showing anything; on iPhone that revokes the subscription (R4). It also only reads the classic shape.                               | Always show a notice (the shop name, "Open the app for details"); read the declarative shape too (5).                                                                                 |
| X10 | Exports: `data_exports.path` needs a private bucket; the 6 buckets don't include one.                                                                                             | Migration adds a private `exports` bucket with a 200 MB file limit (6).                                                                                                               |
| X11 | `members` needs an email (`check`), and `joinAsMember` sends name and phone only.                                                                                                 | Fine: the email comes from the member's verified code login, never from the form. A contract test covers it (6).                                                                      |
| X12 | `api.md` says "server-sent events from NestJS in phase 4"; T53 and `launch-phases.md` say decide.                                                                                 | api.md and launch-phases.md: polling for launch, owner push for screen-off, SSE in MVP B (R11).                                                                                       |

New migrations in these phases: X1 + X2 (phase 4), X5 + X6 (phase 5), X10 (phase 6). No table is missing; 55 stay 55, plus `push_outbox` = 56.

## 5. Push notifications (phases 5 and 6)

**What gets a push.**

| Push              | To                                                          | When                                                                                       | Phase |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----- |
| Order status      | The customer's phone that tapped "Notify me" on the receipt | Accepted (preparing), Ready, On the way, Not approved (proof rejected), Cancelled, Expired | 5     |
| Done + stamp      | The customer                                                | Completed and a stamp was added: one push, not two (T106)                                  | 6     |
| Reward ready      | The member                                                  | The card is full                                                                           | 6     |
| News              | Phones with news on, by audience                            | Sent or scheduled by the owner, within 2 a week, 1 a day, never 9 PM to 8 AM               | 6     |
| New order (if Q2) | The owner's phone or laptop                                 | A new storefront order, and a payment photo to check                                       | 5     |

**How it works.**

1. **Keys:** one VAPID key pair (R6). Public key served by `GET /push/key`; private key only in Railway.
2. **Subscribe:** after a tap, the storefront calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` and sends the subscription to NestJS (`subscribePush` with the order token, or `/s/:slug/push` from Account). NestJS saves it per shop (`unique (tenant_id, endpoint)`), with the platform (android, ios, desktop).
3. **Queue:** the change that causes a push writes a `push_outbox` row (news uses `push_deliveries`) in the same transaction.
4. **Send:** `web-push` with `TTL` (order status 1 hour, news 12 hours), `urgency: 'high'` for order status and owner alerts, `topic` = the order id so a newer status replaces an older one still waiting on the phone. Payload in the declarative shape (R5), under 4 KB, with no customer details beyond the first name.
5. **Clean up:** 404 or 410 deletes the subscription; other failures retry 3 times; `last_ok_at` and `fail_count` keep the news counts honest.
6. **Owner alerts (Q2):** the dashboard gets its own small worker (`@serwist/vite`) only for pushes: no offline caching, so the dashboard behaves exactly as today. "Turn on new-order alerts" lives in Settings › Notifications, next to the email switches. On iPhone it needs the dashboard on the home screen, which Settings explains.

**What we test.** Unit: payload shape, TTL and topic per kind, 410 cleanup. Integration: a fake push service records what was sent. By hand on staging: one Android phone and one iPhone on the home screen, order status and news, screen locked.

## 6. Packages

Exact versions, each at least 7 days old on the day it's installed (rule 10). Every one needs the founder's yes (section 9), except what the shadcn CLI adds.

| Package                 | Where           | For                                        | Status                                                                                          |
| ----------------------- | --------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `web-push` 4.0.0        | api             | Sending every push (R7)                    | Approved in T106; version picked here                                                           |
| `@types/web-push` 3.6.4 | api (dev)       | Types for it                               | New, tiny                                                                                       |
| `@serwist/vite` 9.5.15  | dashboard (dev) | Owner new-order push worker                | New, only if Q2 is yes; the storefront's Serwist moves to 9.5.15 at the same time so both match |
| `fflate` 0.8.3          | api             | Export ZIP (R17)                           | New, phase 6                                                                                    |
| none for email          | api             | Resend's HTTPS API is one `fetch` call     | No `resend` package (Q4)                                                                        |
| none for queues         | api             | Our outbox tables plus `skip locked` (R14) | No `pg-boss`, no `@nestjs/event-emitter`                                                        |
| none for CSV            | api             | A 15-line CSV writer in core with tests    | No package                                                                                      |

Considered and left out: `archiver` (R17), `resend` SDK (one call doesn't need it), `pg-boss` (its own schema and session locks clash with the transaction pooler), server-sent events helpers (R11), `sharp` (photos are already shrunk on the phone).

## 6a. Environment values added in these phases

| Name                                                     | Where                                                  | Phase |
| -------------------------------------------------------- | ------------------------------------------------------ | ----- |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Railway (api)                                          | 5     |
| `RESEND_API_KEY`, `EMAIL_FROM`                           | Railway (api)                                          | 5     |
| `STOREFRONT_URL`, `STOREFRONT_REVALIDATE_SECRET`         | Railway (api) and Vercel (storefront, the secret only) | 5     |
| `SERVER_READ_SECRET`                                     | Railway and Vercel (storefront)                        | 5     |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_AREAS`           | Vercel (storefront)                                    | 5     |

Each app checks its new values with Zod at start (rule 9); staging and production refuse to start without them.

## 7. Tasks

Each task: one commit on the phase's PR. After each one: `pnpm check`, build, the JS budget, the changed pages opened at 390 and 1280 px with a food and a retail shop, one line in `PROGRESS.md` and `CHANGELOG.md`.

### Phase 4. Menu and Products (target: 4 to 6 days)

1. **Migration** X1 and X2, with database tests (an ordered size can be removed and the order keeps its label; sample templates are found).
2. **Catalog module** (`/owner/categories`, `/owner/items`, `/owner/option-groups`, `/owner/variant-templates`, sort order):
   - `listItems` reads all catalog tables for the shop in about 8 queries (no query per item) and builds `OwnerItem[]` with `hasOrders`.
   - `saveItem` takes the whole `ItemDraft` and compares it with what's stored by id: keeps ids, updates what changed, adds what's new, removes what's gone (X1 makes that safe). One transaction. Prices: the variant's `price` is base plus deltas unless overridden, checked by the same core rule as Zod.
   - Delete forever: only archived items with no orders (`item_has_orders`); the prize item answers `item_is_reward` from the key name. Their photos become "unused" for cleanup.
   - Templates: `saveVariantTemplate` with `applyToItems` follows the mock's rules (renamed values keep their ids; removed values retire their sizes).
   - Sort: whole list rewritten in one transaction (lists stay under a few hundred rows).
3. **Bulk routes** (Q7): `POST /owner/items/bulk` `{ ids, action: status | soldOut | move }`, at most 100, one transaction; the hooks switch from `Promise.all` to one call. api.md gains the row.
4. **Sold out today** comes back by itself: read time compares `sold_out_until` with now (no job needed).
5. **Samples** (`applySamplePack`, `clearSamples`) with photo copies (X4).
6. **Cleanups:** `previewCleanup` and `runCleanup` for archived items' photos (proofs come in phase 5).
7. **Storefront revalidate** after menu changes (R8), wired here so phase 5 only adds the reads.
8. **Tests:** contract tests for every catalog method; `saveItem` round trip for a food item with sizes and add-ons and a retail item with 2 choices (colour × size); bulk all-or-nothing; 200-item list under 300 ms on local Postgres.

**Done when:** a food shop and a retail shop build their full menu on the laptop database through the dashboard, including photos, sizes, add-ons, templates, archive, Restore and Delete forever; the Catalog area is "Done" in `PROGRESS.md`; the demo links still show sample shops.

### Phase 5. Storefront, orders and payments (target: 8 to 12 days)

1. **Core quote** moved to `packages/core` with its test table (section 3).
2. **Storefront public module** (`/s/:slug/...`): `getStorefront` (pending or suspended shops are Not found), `getSchedule`, `quoteOrder`, `placeOrder` (section 3), `getOrder`, `listMyOrders`, `rateOrder`, `resolveMapsLink` (R18), `getStorefrontPreview`. Throttling per phone and shop (R12, R13).
3. **Storefront wiring:** `getStorefrontForServer` becomes an async read from NestJS behind the area switch; `'use cache'` + `cacheTag`; the revalidate route; `proxy.ts` and `shopHref` (X7); CORS pattern (X8). JS budget checked after each page; owner-only code stays out (the `/join` page has no room).
4. **Payments:** `createProofUploadUrl` and `submitProof` (private `proofs` bucket, at most 3, only while unpaid and within 7 days, duplicate reference blocked), `getProofUrl` (5-minute link), `reviewPayment`, `recordPayment`, `recordGiveBack`.
5. **Owner Orders module:** `listOrders`, `listScheduled`, `findOrder`, `markSeen`, `getOrderDetail`, chats (`listChats`, `markChatSeen`), `advanceOrder`, `recallOrder` (10 s), `rescheduleOrder` and its schedule, notes, `cancelOrder`, delivery info, booking rules, `setPause`, and New order and Edit order (`quoteOwnerOrder`, `createOwnerOrder`, `editOrder` with `version`, `getOwnerSchedule`).
6. **Jobs:** expire unpaid transfers every minute (GCash, Maya, bank and QR Ph past `pay_by` with no photo waiting; gives back counts and prizes once); delete proof photos after 30 days (the payment row stays); send the outbox every 30 s.
7. **Push plumbing** (section 5): `push_outbox` migration (X5, X6), keys, `GET /push/key`, `subscribePush`, the sender, the worker fixes (X9), order status pushes. Owner new-order push if Q2 is yes.
8. **Email:** the `EmailSender` interface with a Resend provider (Q4) and a fake for tests; new-order and payment-to-check emails from the outbox, when the owner has them on.
9. **Open items decided** (Q9, Q10): "Allow anyway" and notice days; the receipt date words.
10. **Order chat panel** re-checked on real orders (T112).
11. **Tests:** contract tests for every storefront and orders method; the race test (20 orders, 1 slot); a double tap makes one order; expiry gives back once; a rejected proof can be sent again; cross-shop tests; the UI scan with a food and a retail shop.

**Done when:** launch acceptance 1, 2 and 3 pass on the laptop database in CI (Playwright drives a phone-size customer and a laptop owner), and again on staging with a real iPhone and Android phone once the founder's setup is done; the Storefront reads and Orders and payments areas are "Done".

### Phase 6. Members, stamp card, Push News and Home (target: 6 to 9 days)

1. **Customer login:** `sendCustomerCode`, `verifyCustomerCode`, `signOutCustomer` through NestJS, member cookie (section 3).
2. **Members (storefront):** `joinAsMember` (1 welcome stamp when the card is on, the same account when joining again, guest orders linked by order token or the same email only), `getMyAccount`, `saveMyAvatar`, addresses, `claimReward`, news choice, `listShopNews`, consents with version (terms, privacy, marketing unticked).
3. **Stamps:** earned when an order is completed and paid (`earnsStamp`), once per order (unique index), given back on refund or a cancel after completion; counter stamps at most 3 per member per Manila day; `undoChange` within 15 s; `useReward` and claims with `take_prize`; every change through `lock_stamp_balance`.
4. **Members (owner):** stamp card settings and preview, overview, customer list (members, and guests grouped by phone), member detail, find by code, note, claims; remove a member = anonymise (`erased_at`; name becomes "Removed member"; orders keep their totals).
5. **Push News:** `getNewsOverview`, `getNews`, `saveNews`, `cancelNews`, `deleteNews`, `sendNewsTest`, `savePushSettings`; the send job (limits and quiet hours checked again when it runs; waits with a reason instead of sending silently); opened tracking; Stamp added and Reward ready pushes.
6. **Home:** `getHome`, `getHomeTrends`, `getHomePeriod` from the core rules (R16), with a 10,000-order seed to check speed.
7. **Exports and account:** `createExport` and `getExport` (ZIP with orders and payments as CSV, proof photos when asked; `exports` bucket X10; 24-hour link; expiry job), `downloadStoredFiles`, `requestAccountDelete`.
8. **Tests:** contract tests; stamp ledger never below zero under 10 changes at once; one welcome stamp; news limits and quiet hours (Manila time); Home numbers equal a hand count of seeded orders for both shop types; export opens on a phone.

**Done when:** launch acceptance 4 passes (in CI, then on staging); Home numbers match a hand count for a food and a retail shop; the Members and stamps and Reports areas are "Done".

## 8. Order and timing

About 18 to 27 working days for the three phases. The founder's first paying shop is planned for December, so:

- Phase 4 first (everything else needs the menu).
- In phase 5, the customer path (tasks 1 to 4) and the owner board (task 5) come before New order and Edit order, so a pilot shop could take real orders as early as possible.
- Phase 6's stamp card is the selling point, so it goes before Push News and Exports inside the phase.
- The founder's setup (Railway, Resend, keys, DNS) can happen at any point after phase 5's first half; the earlier it happens, the sooner real phones test push and email (section 10).

## 9. Decisions for the founder (recommendation first)

| #   | Question                                                     | Recommendation                                                                              | Why                                                                                                      |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Q1  | Where order, stamp and money rules run                       | NestJS in one transaction with core rules, SQL guards at the edges (section 3)              | One copy of each rule for mock and API; the database still blocks bad data. A-mvp wording updated        |
| Q2  | Push to the **owner** for a new order and a payment to check | Yes, in phase 5 (adds `@serwist/vite` and one column)                                       | Polling stops when the phone screen is off; email is slow and limited to 100 a day on Resend's free plan |
| Q3  | Live updates                                                 | Polling every 15 s for launch, owner push for screen-off, server-sent events in MVP B       | Railway's proxy has reported trouble with long streams (R11)                                             |
| Q4  | How NestJS sends email                                       | Resend's HTTPS API with plain `fetch`, behind an `EmailSender` interface                    | Railway Hobby blocks email ports (R2); no extra package                                                  |
| Q5  | Push keys                                                    | One platform VAPID key pair in Railway                                                      | Works for every shop address; one secret to guard (R6)                                                   |
| Q6  | Packages                                                     | `web-push` 4.0.0, `@types/web-push` 3.6.4, `fflate` 0.8.3, and `@serwist/vite` 9.5.15 if Q2 | Section 6                                                                                                |
| Q7  | Bulk menu actions                                            | One request, one transaction, all or nothing, at most 100 items                             | No half-done bulk changes, no rate-limit hits (R15)                                                      |
| Q8  | Export ZIP package                                           | `fflate` instead of `archiver`                                                              | Zero dependencies and its own types (R17)                                                                |
| Q9  | Can the owner's "Allow anyway" skip an item's notice days?   | Yes, with the warning line, for owner moves and owner orders only                           | The owner knows their own kitchen; customers still can't                                                 |
| Q10 | Receipt date words                                           | "Today, 3:30 PM", "Tomorrow, 3:30 PM", then "Sat, Nov 29, 3:30 PM" (Manila)                 | Matches the board and calendar                                                                           |
| Q11 | Removing an ordered size or add-on                           | Allowed: the order keeps its copied name and price (X1)                                     | Real menus change; history stays right                                                                   |
| Q12 | A member across shops                                        | One login, one member record per shop; shops never see each other's members                 | Already the database design; privacy by default                                                          |
| Q13 | Removing a member                                            | Anonymise (name "Removed member", no email, phone or photo), keep order totals              | RA 10173 erasure without breaking sales numbers                                                          |
| Q14 | Sample photos for "Start with samples"                       | Copied into the shop's storage, marked sample, removed by "Clear samples"                   | Every photo stays inside the shop's own folder and storage count (X4)                                    |

## 10. What the founder does by hand

> Since 2026-11-26 the one list to follow is `docs/launch.md` (Parts A to H). This section is the plan it came from.

Everything here waits until the code is in (founder, 2026-11-25), and is added to `docs/launch.md` as section 12 when these phases are built.

1. **Push keys:** on the laptop, `npx web-push generate-vapid-keys` once; paste both into Railway (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`), never in chat.
2. **Resend API key** for NestJS (`RESEND_API_KEY`), from the same Resend account as section 11.
3. **Two secrets** shared by Railway and Vercel (`STOREFRONT_REVALIDATE_SECRET`, `SERVER_READ_SECRET`): any long random text; Claude can give a one-line command to make them.
4. **Vercel storefront values:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_AREAS`.
5. **Real-phone checks** with Claude: an Android phone and an iPhone with the shop on the home screen.
6. **Money:** Resend's $20 plan once daily emails pass about 80 (the free plan stops at 100 a day).

## 11. Docs to align (done in the phase 4 PR)

- D1 `A-mvp.md` section 4: "computed in SQL functions" becomes "computed on the server in one transaction, with SQL guards" (Q1).
- D2 `api.md`: "Live updates" line (X12); bulk items row (Q7); `GET /push/key`; owner push rows (if Q2); storefront revalidate route noted as internal.
- D3 `foundation.md`: "the shop's VAPID keys" becomes one platform key pair (Q5); packages from Q6.
- D4 `launch-phases.md`: points to this file; phase 5's "Logic to decide" marked decided.
- D5 `decisions.md`: the founder's answers as T117.

## 12. Risks

- **JS budget.** `/join` is at 300.0 KB. Wiring member login and push into the storefront adds code. Plan: server-side reads, owner-only code in its own modules (the phase 3 lesson), and if a page still goes over, `zod/mini` for that page's schemas (no new package) before any budget change.
- **Late real-phone testing.** Push and email can only be proven on staging. If the founder's setup comes last, plan about 2 days after it for fixes.
- **iPhone push rules** change between iOS versions. The declarative payload (R5) and the always-show rule (R4) cover today's rules; we re-test on the newest iOS before launch.
- **Email limits.** Resend's free plan stops at 100 a day (R3). Owner push (Q2) keeps most alerts off email.
- **Timing.** 18 to 27 working days for phases 4 to 6, plus phase 7 (billing) and 8 (go live). December is tight; section 8 orders the work so a pilot shop can take real orders as early as possible.

## Sources

- Next.js 16.4.6 (package docs): [revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag), [Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [Progressive Web Apps guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [Multi-tenant guide](https://nextjs.org/docs/app/guides/multi-tenant)
- Push: [W3C Push API (Declarative Web Push)](https://www.w3.org/TR/push-api/), [WebKit: Meet Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/), [Apple: Sending web push notifications](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [RFC 8292 VAPID](https://www.rfc-editor.org/rfc/rfc8292), [web-push README](https://github.com/web-push-libs/web-push)
- Railway: [Outbound networking](https://docs.railway.com/networking/outbound-networking), [SSE vs WebSockets](https://docs.railway.com/guides/sse-vs-websockets), forum threads on SMTP and SSE (community)
- Resend: [Account quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits), [Pricing](https://resend.com/pricing)
- Drizzle: row locking options in drizzle-orm 0.45.4 (`select.d.ts`)
- npm registry: release dates and dependencies for `web-push`, `@types/web-push`, `fflate`, `archiver`, `@serwist/vite`, `resend`, `pg-boss`
- OWASP: [Server-Side Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
