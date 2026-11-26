# Launch phases (MVP A to the first paying shop)

Nine phases take Smart App PH from "every screen works on sample data" to "shops pay ₱399 a month". Phases 1 to 7 wire the backend area by area, phase 8 sets up the live product and phase 9 is selling. Target: the first paying shop in December 2026, so every phase stays as small as launch allows. Written 2026-11-20 from the repo as it stands (main @ bdc7a80); a general map, not a build spec.

**How to use it.** Take one phase at a time into the project chat. For that phase we brainstorm, research the topics listed, settle the open logic, then write the task prompts. A phase is finished only when its "Done when" passes on the dev database. `PROGRESS.md` stays the tick list (each phase names its lines there); `A-mvp.md` wins on scope. Phases 1 to 3 have a detailed build plan in `phases-1-3.md` (approved and built, T116). Phases 4 to 6 have one in `phases-4-6.md` (approved and built, T117). Phases 7 to 9 have one in `phases-7-9.md` (approved and built, T118; the by-hand list is `launch.md` section 13).

## Where we start (checked 2026-11-20)

- Every MVP A screen is built and "UI approved" on sample data; nothing is "Done" (wired to the database).
- All 55 tables have migration files (8 database steps; step 8 is Push News, T106, 2026-11-21) and their database tests, but the dev database still has only `profiles`: the CI step "Apply migrations to the dev database" skips because the 3 GitHub secrets are missing (`launch.md` section 9).
- The API has only `/health`, `/me` and a test route. Drizzle, `pg`, `@nestjs/schedule` and `@nestjs/throttler` are approved but not installed.
- `packages/data` already has an API adapter file for every area (untested) next to the mock ones.
- The latest `main` run fails one job: the UI scan.
- The Vercel demo (`smartapp-demo-storefront.vercel.app`, `smartapp-demo-dashboard.vercel.app`) runs on sample data.

## At a glance

| #   | Phase                                   | What it delivers                                                    | Tables | `PROGRESS.md` lines                       |
| --- | --------------------------------------- | ------------------------------------------------------------------- | ------ | ----------------------------------------- |
| 1   | Ground: dev database and API base       | Tables live on dev, safe NestJS base, CI green                      | 0 new  | 4.0 CI applies, 4.1 all                   |
| 2   | Accounts: login, sign-up, shop creation | Real owner sign-up and login through NestJS; API on Railway staging | 5      | 4.2 Login and sign-up                     |
| 3   | Shop setup: Settings, files, Editor     | Owner sets up the shop on real data; new profile menu               | 9      | 4.2 Shops and settings                    |
| 4   | Menu and Products                       | Owner builds the catalog on real data                               | 13     | 4.2 Catalog                               |
| 5   | Storefront, orders and payments         | Customers order, owner runs orders, proofs, chat, push              | 12     | 4.2 Storefront reads, Orders and payments |
| 6   | Members, stamp card and Home numbers    | Join, stamps, rewards, Push News, Home, exports                     | 9      | 4.2 Members and stamps, Reports           |
| 7   | Plan, billing, Super Admin and Meta     | Go-live approval, ₱399 billing, help mode, tracking, emails         | 7      | 4.2 Platform                              |
| 8   | Go live: live setup and hardening       | Live database, domains, jobs, backups, security, acceptance 1 to 8  | 0 new  | 5.1, 5.2                                  |
| 9   | Sell: pilot and first paying shops      | A pilot shop live, first ₱399 approved, a repeatable sales routine  | 0 new  | 5.3                                       |

Order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Phase 7 depends only on phase 2, so it can move earlier if selling pressure grows. Your by-hand prep for phase 8 (accounts, Meta, GCash and Maya, terms) can start today.

## Phase 1. Ground: dev database and API base

**Goal.** The dev database holds all 55 tables and NestJS can read and write them safely, one shop at a time.

**Covers.** Apply the 7 migrations to dev through CI (D9). Regenerate types. Fix the failing UI scan so `main` is green. Install the approved packages (`drizzle-orm`, `pg`, `drizzle-kit`, `@nestjs/schedule`, `@nestjs/throttler`). One database transaction per request that starts with `set local role app_api` and the shop setting (D1). Guards in order: login, shop from `tenant_members`, `@Can()`, with a test that fails on any route lacking `@Public()` or `@Can()`. Graceful shutdown, a health check that also asks the database, 100 kB body limit, CORS allow-list. Timed-job base with advisory locks (D5). A contract test that runs the same cases against the mock and the API adapter.

**Tables.** None new; the guards read `tenant_members`.

**Logic to decide.**

- Drizzle schema: pulled from the database (`drizzle-kit pull`) or written by hand. SQL migrations stay the source of truth either way.
- How a request carries its transaction (request-scoped provider or AsyncLocalStorage).
- How Postgres errors (unique, check, foreign key) turn into our error codes.
- Module layout: one Nest module per area, mirroring `api.md`.

**Research later.** NestJS modules, providers and dependency injection, decorators, the order of middleware, guards, interceptors, pipes and filters; request scope vs AsyncLocalStorage (nestjs-cls); Drizzle with `pg`, transactions and RLS; the Supabase pooler (Supavisor transaction mode) with `set local`; Terminus database check; `@nestjs/throttler` storage; `@nestjs/schedule` with `pg_advisory_lock`; testing Nest with Vitest and supertest.

**From you.** The 3 GitHub secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DEV_PROJECT_REF`), then re-run the Check on `main`.

**Done when.** Dev shows 55 tables; every job on `main` is green; `/health` reports the database; the guard test exists; a test proves shop A cannot read shop B through the API.

## Phase 2. Accounts: login, sign-up and shop creation

**Goal.** A real owner signs up with a 6-digit email code, makes a shop and logs in, all through NestJS (T34). Supabase leaves the browser.

**Covers.** Sign in, sign out, session, password reset by code. The 3-step sign-up (You, Your shop, email code) with the lead saved at step 1 (T89). Create shop, slug check, reserved slugs (a new migration adds `stays`, `rsvp`, `docs`, `dev`, `staging`, `demo` and similar, T105), the Go live card's steps read from the shop. Customer email codes (send and verify) as plumbing for phase 6. Remove `@supabase/*` from `packages/data` and close its ESLint exception. First API deploy to Railway as **staging**, so phones and the Vercel preview can reach it.

**Tables (5).** `profiles`, `tenants`, `tenant_members`, `reserved_slugs`, `signup_leads`.

**Logic to decide.**

- Where the session lives: an httpOnly cookie set by `api.webserbisyo.com` for both apps, or a bearer token kept by the app. This drives CSRF, refresh and logout.
- Code rules: resend after 60 s, at most 5 codes an hour, 10-minute expiry; one error for every failed login (rule 12).
- Google sign-in (T01b): in or out of launch.
- What a stale lead is and when it counts as converted.

**Research later.** Supabase Auth email OTP from a server, admin API, JWT checks with `jose` and JWKS; cookie vs token sessions across subdomains (SameSite, CORS credentials, CSRF); rate limits per IP and per email behind Railway's proxy (`trust proxy`); Supabase custom SMTP through Resend; Railway services, environments, region, health checks, env variables.

**From you.** A Resend account and the `mail.webserbisyo.com` DNS records (DNS changes need your yes); custom SMTP turned on in the dev Supabase project (the built-in mail sends only 2 an hour); a Railway account (Hobby, about $5 a month, check the price then).

**Done when.** On dev, a new owner signs up with a real code, logs in, resets the password and logs out; no `@supabase` import outside `apps/api`; a wrong shop answers Not found.

## Phase 3. Shop setup: Settings, files and Editor

**Goal.** An owner sets up a whole shop on real data: facts, hours, ordering rules, delivery, payment places, look and photos.

**Covers.** Settings: Your shop (Shop and contact facts, Hours and closures, Ordering, Delivery zones and per-km rows, Payments with up to 3 banks; the payment QR upload uses the shared photo row with an optional crop step, T107 in PR #35; QR Ph also needs an account or mobile number, as the `payment_accounts` check already says, T107 follow-up in PR #43), You (Account, avatar, Appearance, Notifications) and Plan and storage (read-only plan state, Storage files manager, cleanups). Uploads: signed upload URL for the exact size, confirm, count against 500 MB (T66). Editor: draft, autosave, Undo with Zustand and zundo (T103, replacing the hand-written reducer), Publish. "Start with samples". **Profile menu redesign** (below).

**Tables (9).** `shop_settings`, `storefront_content`, `storefront_media`, `opening_hours`, `closures`, `payment_accounts`, `delivery_zones`, `delivery_distance_rows`, `media_files`.

**Logic to decide.**

- Publish: copy draft to live in one transaction; what the storefront shows mid-publish.
- Storage: what counts toward 500 MB, when `storage_full` starts, cleanup previews (`cleanup_changed`).
- Hours and closures in Manila time; a closed shop taking orders for its next opening (N1).
- Delivery fee: zones vs straight-line per km, rounding.
- How the 6 Storage buckets get created (see Conflicts).

**Research later.** Supabase Storage signed upload URLs and private vs public buckets; CDN caching of shop images and cache-busting on change; Zustand and zundo patterns; TanStack Query optimistic updates and invalidation; image size rules on the phone.

**From you.** Nothing new.

**Done when.** A food shop and a retail shop are set up end to end on dev from a phone and a computer; Settings and Editor areas are "Done"; Storage shows real file sizes.

### Profile menu redesign (bottom-left sidebar, also the rail and the phone top bar)

Built early on sample data (decision T112, PR #44, 2026-11-22). Phase 3 only checks it still works once real accounts are in.

Copy the reference's structure inside our installed `DropdownMenu` (it already has `DropdownMenuRadioGroup` and `DropdownMenuRadioItem`, so no new component):

1. Header: avatar with the status dot, full name, and a role line ("Shop owner · Kanto Smash", "Super Admin", or "Helping Kanto Smash" in help mode) instead of the email.
2. Status line: wifi icon + "Online" or "Offline" (short; today's "Online, new orders arrive live" wraps).
3. **Appearance** label, then Light, Dark, System as radio items with a check, wired to the existing `appearance.ts` store (the same choice as Settings › Appearance).
4. Divider. **My account** (`/settings/account`), **Settings** (`/settings`), and **Super Admin** for the platform admin only.
5. Divider. **Sign out**.

Fixes found in the current screenshot: the menu opens at `w-fit`, so it squeezes; give it one fixed width. The Preview pill draws over the menu; the menu must sit above it. Words go in `words.ts` (`smartapp-ui-writing`), checked with `smartapp-ui-check` at 390 and 1280 px, light and dark. It is UI only, so it can also run as a small task before phase 3.

## Phase 4. Menu and Products

**Goal.** The owner builds and maintains the catalog on real data.

**Covers.** Items list and grid, item editor, photos and crop, categories with icons, add-ons (option groups), variants with templates and option price deltas (T46), pairings, Sold out today, daily limit, notice days (T48), archive, Restore and Delete forever (T43), bulk actions, sort order.

**Tables (13).** `categories`, `items`, `item_photos`, `variant_templates`, `variant_template_values`, `item_axes`, `item_axis_values`, `item_variants`, `item_variant_values`, `option_groups`, `options`, `item_option_groups`, `item_pairings`.

**Logic to decide.**

- Delete vs archive: an item with orders is only archived; what blocks deleting a reward item (`item_is_reward`).
- Price of a variant = base + deltas; how a template change reaches items already using it.
- Bulk actions in one transaction or item by item.

**Research later.** Saving nested forms (item + variants + add-ons) in one request; Drizzle relational queries; Postgres ordering columns; list speed for 200+ items.

**From you.** Nothing new.

**Done when.** Both demo shop types build their full menu on dev; the contract tests pass for mock and API; the Catalog area is "Done".

## Phase 5. Storefront, orders and payments

**Goal.** A customer orders in under a minute and the owner runs that order to the end, with payment proof checked by hand.

**Covers.**

- Storefront reads by slug, reached at `<slug>.webserbisyo.com` with `shop.webserbisyo.com/<slug>` as a backup (T105): home, menu, item sheet, shop info, closed and busy states; cached pages plus a fresh price, stock and open check before Place order.
- Place order in one transaction: gap-free order number, client key (no double orders), daily limit, slot lock, delivery fee, abuse limits (3 unpaid per phone per 30 min, 30 per shop per minute).
- Receipt with live status, my orders, Change time, Recall, ratings.
- Payments: cash, COD, GCash, Maya, bank, QR Ph; up to 3 proof photos in the order chat; owner Approve or Not approved; duplicate reference block; 5-minute signed links.
- Owner Orders: Board, List, Calendar, order panel with chat.
- Order status push to the customer's phone (Serwist worker already listens; `web-push` approved in T106) and the new-order email to the owner.
- One PayQr card on checkout and the receipt with Save QR and phone steps; QR Ph hidden when the shop has no QR (T107, PR #35).
- Jobs: expire unpaid transfers every minute, delete proofs after 30 days, send the outbox with retry.
- **Order chat panel fix** (below).

**Tables (12).** `order_counters`, `orders`, `order_lines`, `order_line_options`, `order_events`, `order_messages`, `payment_proofs`, `order_ratings`, `push_subscriptions`, `order_push`, `item_daily_counts`, `notification_outbox`.

**Logic to decide.**

- The order and payment state machines (`A-mvp.md` section 4) as SQL guards; cancel reasons; what Recall undoes.
- Pay-by window (30 min default), which methods expire, what happens to slots, counts and prizes on expiry.
- Live updates: keep 15-second polling for launch (T53) or add server-sent events now.
- Which status changes send a push, and the words.
- Two items still open from the Orders work: can the owner's "Allow anyway" override an item's notice days, and the receipt date wording.

**Research later.** Postgres locks and idempotency keys; Next.js caching for public reads (revalidate by tag) with Serwist stale-while-revalidate; Web Push (VAPID keys, the `web-push` package, which needs your yes); iPhone push rules (iOS 16.4+, only from the home-screen app, only after a tap); server-sent events through Railway's proxy; signed URLs; Resend sending and bounces; outbox pattern with retry and back-off.

**From you.** A yes on the push package and VAPID keys in Railway; Resend domain verified (from phase 2).

**Done when.** Launch acceptance 1, 2 and 3 pass on dev on a real phone, for a food and a retail shop.

### Order chat panel fix

Built early on sample data (decision T112, PR #44, 2026-11-22). Phase 5 only checks it on real orders.

When a chat is opened from the Chats list (chat bubble):

1. The panel shows "← Back to chats" at the top; the X closes everything.
2. After Approve or Not approved, it jumps to the next waiting chat; when none is left it goes back to the list, which says "All caught up".
3. The phone's back gesture does the same as "Back to chats".

Opened from a card on the Board, the panel stays as it is today. UI only (`chats-sheet.tsx`, `order-panel.tsx`), so it can also run as a small task before phase 5.

## Phase 6. Members, stamp card, Push News and Home numbers

**Goal.** Members and the stamp card, the main selling point, work on real data, and Home shows real numbers.

**Covers.** Join with a 6-digit code and 1 welcome stamp; account, face, saved places; Rewards with stamp history; stamps on completed paid orders and given back on reversal; counter stamp with reason and Undo, at most 3 per member per day (N5); reward use at the counter; limited prizes with pause and claims; custom prize photo through `stamp_cards.reward_media_id` (T107, PR #35); guest orders linked by order token or email only; Members page numbers computed from orders; remove a member (anonymise). Push News (T106): Members › News with audiences, schedule within limits (2 a week, 1 a day, never 9 PM to 8 AM), results, the two automatic pushes (Stamp added, Reward ready), and the customer's unticked news yes on Join, Notify me and Account; sending through `web-push` from a NestJS job. Home: today vs a usual day, Needs you, Sales card with Paid, To check, Not paid yet and the money rings, best sellers, busy hours, any period. Export ZIP (24 hours) and its expiry job.

**Tables (9).** `members`, `member_addresses`, `consents`, `stamp_cards`, `stamp_entries`, `reward_claims`, `data_exports`, `push_campaigns`, `push_deliveries`.

**Logic to decide.**

- Stamp rules: per order or per amount, what counts as "completed paid", what happens to the card after a reward.
- One member per shop or one person across shops (privacy and login impact).
- Consent records and marketing opt-in.
- The "usual day" formula, business-day cut-off in Manila time, which statuses count in sales.
- What the export holds and how proofs leave after export.

**Research later.** Append-only ledgers and balance locks; Data Privacy Act consent and erasure (RA 10173); Postgres aggregates with `Asia/Manila` dates and `EXPLAIN` on 30-day reads; streaming a ZIP from NestJS.

**From you.** Nothing new.

**Done when.** Launch acceptance 4 passes; Home numbers match a hand count of seeded orders for both shop types; Members, stamps and Reports areas are "Done".

## Phase 7. Plan, billing, Super Admin and Meta

**Build plan:** `phases-7-9.md` sections 4 and 5 (approved and built, T118). It answers the "Still to settle" list below as questions Q9 to Q12.

**Goal.** You can approve shops, take ₱399 payments, help owners and see which ad brought each paying shop, without touching SQL.

**Covers.** Ask to go live and your approval (stages `setting_up`, `asked`, `live`, `closed`); the trial starts on approval. Plan payments by GCash or Maya with a receipt in the Billing chat, which takes up to 3 photos sent as they are, with no crop step, and an optional reference (T107, PR #35 and follow-up PR #43: database step 9 `20261121120000_billing_chat_photos.sql`, no new table, `POST /owner/plan/photos` and `/owner/plan/seen`, `plan_payments.reference` optional); Approve ₱X or Not approved with reasons; Record a payment; extra days; reminders. Super Admin: Today, Shops with side panel and Leads, Create a shop, Payments with CSV, Tracking, Setup. Help mode (Open as owner, 60 minutes, logged, locked actions). Meta Conversions API from NestJS with the outbox and retry; Pixel on `/signup`. Emails through Resend: shop is live, reminders, payment answers. Job that drops leads after 180 days (D6).

**Tables (7).** `platform_settings`, `plan_payments`, `billing_messages`, `shop_activity`, `support_sessions`, `track_events`, `audit_log`.

**Logic to decide (most is already decided).**

- Decided: ₱399 a month, 14-day trial from approval, 1, 3 or 6 months, 6 months for ₱1,995 (T67, T92); states trial, active, due (7 days before the end), overdue (7-day grace, shop open with a notice), paused (no new orders, nothing deleted) (T67); shops keep the price they signed up at (T88).
- Still to settle: when each reminder email goes out; how an early payment extends the end date; what a paused owner can still do in the dashboard; whether a paused storefront shows a message; refunds; the official receipt you issue for each payment.

**Research later.** Meta Conversions API (dedup with event id, hashing, `event_time` limits, test events); a billing state machine run by a daily job; audit logging for admin actions; help-mode sessions without sharing passwords; Resend templates.

**From you.** The Meta values in `launch.md` sections 1 to 4 (Pixel ID, token only in Railway, test code, domain verify); GCash and Maya receiving accounts; `ADMIN_EMAIL` and `seed:demo` to make yourself Super Admin; Setup values.

**Done when.** On dev you sign up a test shop, approve it, it pays ₱399, you approve the payment, and Meta Test events shows each event once; the Platform area is "Done".

## Phase 8. Go live: live setup and hardening

**Build plan:** `phases-7-9.md` section 6 (approved, T118: live migrations workflow, second step, headers, restore drill and k6 built). It recommends answers to conflicts 3 and 4 below (Q14, Q15).

**Goal.** A separate live product that is safe, backed up and passes launch acceptance on real phones.

**Covers.** Live Supabase project on Pro with daily backups; dev becomes staging (D4). Live settings: custom SMTP, email confirmation on, 10-minute codes, leaked-password protection, Data API off, auto-expose off (D7). Railway production API at `api.webserbisyo.com`. Vercel Pro with the domain plan below (T105). Resend live. All jobs running. One restore from a backup tried and written down. Security pass (OWASP API Top 10, cross-shop tests, rate limits, no customer data in logs). Lighthouse 90+, 300 KB JS per page. Terms, privacy notice per shop and breach plan. Launch acceptance 1 to 8 on an Android and an iPhone.

**Tables.** None new: the 55 tables are applied to the live project.

**Logic to decide.**

- How migrations reach live (see Conflicts).
- Branch protection on `main` vs pushing straight to `main` (see Conflicts).
- Error tracking and logs (each new tool needs your yes).
- What we watch daily and what wakes you up.

**Research later.** Supabase Pro backups and restore; Railway production settings (replicas, restarts, logs); Vercel domains and DNS; CSP and security headers; Lighthouse on mid-range Android; Data Privacy Act duties (privacy notice, NPC registration if needed, 72-hour breach notice).

**From you.** Supabase Pro (about $25 a month), Vercel Pro (about $20 a month), Railway production plan, DNS yes for the domain plan below, removing the old rsvp domains (`rsvp.webserbisyo.com`, `*.rsvp.webserbisyo.com`) from Vercel yourself, Terms and Privacy pages checked by someone who knows RA 10173, and running the live migrations yourself.

**Done when.** Every line of `PROGRESS.md` 5.1 and 5.2 is ticked.

### Domain plan (decision T105)

`webserbisyo.com` is the umbrella for two businesses: Smart App and the staycation and rentals product. It already uses Vercel's nameservers, so wildcard certificates are automatic.

| Address                                                 | What it is                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| `<slug>.webserbisyo.com` (wildcard `*.webserbisyo.com`) | Each shop's main link, on the storefront project                      |
| `shop.webserbisyo.com/<slug>`                           | Backup link, opens the same shop                                      |
| `app.webserbisyo.com`                                   | Owner dashboard and Super Admin                                       |
| `api.webserbisyo.com`                                   | NestJS on Railway                                                     |
| `mail.webserbisyo.com`                                  | Resend, emails from `codes@`                                          |
| `stays.webserbisyo.com`, `*.stays.webserbisyo.com`      | Staycation and rentals (its own repo), never collides with shop slugs |
| `webserbisyo.com`, `www`                                | A simple page linking both products, later                            |

The subdomain is the one link we print and send (QR, share, emails, install, push). The API's CORS list allows `https://*.webserbisyo.com`. Risk: a login, a saved basket and an installed app belong to one address, so a customer who uses both the subdomain and the backup has two copies; printing only the subdomain avoids it.

## Phase 9. Sell: pilot and first paying shops

**Build plan:** `phases-7-9.md` section 7 (approved, T118: QR poster, sample links and `sales-kit.md` built).

**Goal.** Real shops pay ₱399 and keep using it.

**Covers.** One pilot shop set up with you (Create a shop or self sign-up), approved and taking real orders. First plan payment approved. A sales kit: the live demo shop link, a short walkthrough, a printable shop QR poster, the Messenger reply script. Ads to `/signup` with the campaign in the link (`launch.md` section 3). A weekly look at Super Admin's funnel. A feedback list that feeds MVP B.

**Tables.** None new; Super Admin reads them all.

**Logic to decide.**

- Pilot terms (free month or straight to the trial).
- Who helps a shop set up, and how long help mode stays a free service.
- When MVP B starts (POS, staff, inventory) and which feedback moves it.

**Research later.** Meta ads setup for Leads and Sales goals; onboarding scripts for small Filipino shops; BIR registration and official receipts for a subscription business; a data processing agreement between you and each shop (they own their customers' data).

**From you.** The pilot shop, the ads budget, BIR and business registration, and your time for onboarding calls.

**Done when.** `PROGRESS.md` 5.3 is ticked: a pilot shop takes real orders on the live database and its first ₱399 payment is approved.

## Coverage check

### Every table has one home phase (55)

| Phase | Tables                                                                                                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2     | `profiles`, `tenants`, `tenant_members`, `reserved_slugs`, `signup_leads` (5)                                                                                                                                                         |
| 3     | `shop_settings`, `storefront_content`, `storefront_media`, `opening_hours`, `closures`, `payment_accounts`, `delivery_zones`, `delivery_distance_rows`, `media_files` (9)                                                             |
| 4     | `categories`, `items`, `item_photos`, `variant_templates`, `variant_template_values`, `item_axes`, `item_axis_values`, `item_variants`, `item_variant_values`, `option_groups`, `options`, `item_option_groups`, `item_pairings` (13) |
| 5     | `order_counters`, `orders`, `order_lines`, `order_line_options`, `order_events`, `order_messages`, `payment_proofs`, `order_ratings`, `push_subscriptions`, `order_push`, `item_daily_counts`, `notification_outbox` (12)             |
| 6     | `members`, `member_addresses`, `consents`, `stamp_cards`, `stamp_entries`, `reward_claims`, `data_exports`, `push_campaigns`, `push_deliveries` (9)                                                                                   |
| 7     | `platform_settings`, `plan_payments`, `billing_messages`, `shop_activity`, `support_sessions`, `track_events`, `audit_log` (7)                                                                                                        |

5 + 9 + 13 + 12 + 9 + 7 = 55, the same list as `database.md` section 4.

### Every MVP A area has a phase

| MVP A area (`A-mvp.md` section 1, `features.md`)                        | Phase      |
| ----------------------------------------------------------------------- | ---------- |
| Login, sign-up, password codes                                          | 2          |
| Settings, Editor, uploads and Storage, profile menu                     | 3          |
| Menu or Products                                                        | 4          |
| Storefront pages, install and offline, checkout, receipt, order push    | 5          |
| Order types, payments and proofs, Orders Board, List and Calendar, chat | 5          |
| Members, Join, Rewards, stamp card, claims, prizes, Push News (T106)    | 6          |
| Home, Sales card, exports                                               | 6          |
| Go live, plan and Billing chat, Super Admin, help mode, Meta, emails    | 7          |
| Jobs (expire, proofs 30 days, uploads 1 hour, outbox, leads 180 days)   | 5, 3, 6, 7 |
| Live setup, privacy, acceptance                                         | 8          |
| First paying shop                                                       | 9          |

## Conflicts and gaps for you to decide

1. **Storage buckets.** `database.md` section 8 lists 6 buckets, but no migration creates them, and rule 8 forbids making them in the Supabase dashboard. Recommendation: a new migration that creates them (phase 3).
2. **Order status push.** Settled by T106: push is in MVP A and `web-push` is approved, installed with the push plumbing in phase 5.
3. **How migrations reach live.** `foundation.md` section 6 says "a manual GitHub Action after review"; AGENTS rule 8 and T9 say you run `pnpm db:push`. Recommendation: a manual GitHub Action you press (no laptop step), decided in phase 8.
4. **Branch protection vs push-to-main.** `A-mvp.md` section 6, `foundation.md` section 6 and `PROGRESS.md` 5.1 want branch protection on `main`; T40 and T104 push straight to `main`. Still open from T104; decide before phase 8.
5. **Live updates.** T53 says server-sent events "in phase 4"; acceptance 2 passes with polling. Recommendation: polling at launch, events later.
6. **Google sign-in (T01b).** Still an open line in `PROGRESS.md` phase 0. Recommendation: move it to MVP B.
7. **Stale phase text.** `A-mvp.md` section 3 says each area starts with "migration", but all migrations exist, and its area order starts with shops while `PROGRESS.md` starts with login. Recommendation: align `A-mvp.md` to `PROGRESS.md` when phase 1 starts.
8. **CI looks green when it is not.** The "Apply migrations" job shows success while it skips, and the UI scan fails on `main`. Fixed in phase 1.
