# Progress

One line per task: `- [x] T<nn> name (PR #n)`. No logs here; details live in the PR.

From Phase 4 each area has two ticks (decision T102, copied from the Stays project):

- **UI approved**: every screen of the area works on sample data (mock adapter), checked on a phone and a computer with a food and a retail shop.
- **Done**: the same screens work on the dev database through NestJS (adapter switched to `api`, contract tests pass for both adapters, the area's e2e passes). Only Done counts as finished.

A short view of this page, with links, is the "Smart App PH: Start here" Claude Doc; this file wins if they differ.

## Phase 0: Foundation

- [x] T01 Monorepo, docs, auth migration, demo accounts, login and sign up (PR #5)
- [ ] T01b Google sign-in

## Phase 1: Kit and shell

- [x] T02 Tokens, fonts, planned components, `/kit` page
- [x] T02a Demo images and icons
- [x] T02b /kit library examples
- [x] T03a Shop packs and rules
- [x] T03b Mock store, adapters and hooks
- [x] T04 Storefront shell
- [x] T05 Dashboard shell (PR #6)

## Phase 2: Storefront screens (mock)

- [x] T06 Shop home (PR #16)
- [x] T07 Menu and item sheet (PR #16)
- [x] T08 Basket (PR #16)
- [x] T09 Checkout and location (PR #16)
- [x] T10 Receipt (PR #16)
- [x] R Storefront redesign: theme, glass shell, Home, Menu, basket, checkout, receipt (PR #17, replaces #16)
- [x] R Storefront polish: sliding pill dock, logo chip, Shop info sheet (decisions R20, R21)
- [x] T11 My orders (PR #18)
- [x] T12 Rewards and account (PR #18)
- [x] T13 Install as an app (PR #18)
- [x] T14 Privacy and system pages (PR #18; the Lighthouse table is still to fill by hand in Chrome DevTools)
- [x] R Storefront polish round 2: avatar picker and photo crop, Be a Suki, banners with words, receipt ticket, printer, proof preview, order chat, toasts, motion (decisions R22 to R42; pushed to `main`)
- [x] R Storefront round 3, batch 1: the founder's bug list (zoom, copy check, Save image, pinned Save, dock and back on the order page) and audit fixes (decisions R43 to R45)
- [x] R Storefront round 3, batch 2: vertical order steps with icons, pull to refresh (decisions R46, R48)
- [x] R Storefront round 3, batch 3: JS budget check in CI, saved copy first in the app, splash in the shop's colour, demo hours (decisions R47, R49 to R51)

## Phase 3: Dashboard screens (mock)

- [x] T15a Menu page part 1: items list, add-ons, categories, and item editor
- [x] T15b Menu page part 2: grid and table views, bulk actions, and category icons
- [x] T41 Menu page UX round: simpler list, editor, sizes and versions, add-ons (retested as a food and a retail owner)
- [x] T42 Final Menu page polish: category form, photos and crop, samples banner, bulk actions, editor errors (retested as a food and a retail owner)
- [x] T43 Dashboard feedback (toasts, Save spinner and check, Copied) and Menu Archived filter with Restore and Delete forever
- [x] T46 Reusable variants and independent choice pricing: Variants tab, templates, option deltas, and 3-choice support (decision T46, pushed to main)
- [x] T47 Menu flows stay in place: Save stays, nested create returns to the item, list memory, Back, Undo on Discard (decision T47, pushed to main)
- [x] O1 Orders: data, rules and mock data (decisions T48 to T53, pushed to main)
- [x] O2 Orders parts installed and on /kit
- [x] O3 Orders Now board, ticket and detail
- [x] O4 Orders Scheduled, History, Change time
- [x] O5 Orders Kitchen view, print and Find order
- [x] O6 Storefront scheduling, item notice and limits
- [x] Orders v2: one page with Board and List, order panel, live drag, stage colours (decisions T54 to T56)
- [x] Members page: list and groups, member panel with one-tap stamp and Undo, Stamp card and Prizes tabs, Card progress chart (decisions T57 to T60; 4 parts pushed to main 2026-11-05)
- [x] Members polish: stat cards, story line, motion moments, Member sales, week ring, Top suki, counter feed, milestones, first-day start (decisions T61 to T63; pushed to main 2026-11-05)
- [x] Settings page: Your shop, You, Plan and storage (decisions T64 to T68; 4 parts pushed to main 2026-11-05)
- [x] Home page: today desk and trends, Insights hidden for launch (decisions T69 to T71; 3 parts pushed to main 2026-11-06)
- [x] Editor: live preview of the real shop page, parts list, draft and Publish, logo colours and Color Picker, banners, announcement (decisions T72 to T75; 4 parts pushed to main 2026-11-06)
- [x] Editor style designer: Pick a style from the logo, Fine-tune any page, card and button colour, logo trim, shape and white removal (decision T76; 3 parts pushed to main 2026-11-06)
- [x] Final polish of every page: Home charts, scroll hints and touch sizes, phone editor dock, fonts, customer avatars, payment photo chat, page-by-page fixes (decisions T77 to T82; 7 parts on main)
- [x] Money cards: Paid, To check and Not paid yet bar, one ring per payment place, up to 3 banks from a bank list, checkout asks which bank (decision T84; pushed to main 2026-11-12)
- [x] Scheduled orders calendar: customer-coloured calendar cards with photos, What to make, phone List / 3 days / Month, Change time inside the order panel, shared day and time chips (decision T85; pushed to main 2026-11-12)
- [x] Orders calendar v2: week board with orders stacked by time, Week / Day / Month on every screen, Go to date, Change time with a month and time tabs, moves up to 60 days ahead (decision T86; pushed to main 2026-11-13)
- [x] Order chat for the owner: Order | Chat tabs, Approve / Not approved at the bottom, Chats list with waiting time, guest vs member, seen by the shop, message model ready for live chat (decision T87; pushed to main 2026-11-13)
- [x] Super Admin, sign-up and Meta tracking: /admin (Today, Shops, Payments, Tracking, Setup), 3-step sign-up, go-live approval, Billing chat, Open as owner, ₱399 plan (decisions T88 to T92; frontend with mock data pushed to main 2026-11-14; API and tables in Phase 4)

- [x] Final verdicts: calendar Month tiles, full-height phone panels, customise any face, Editor Opening screen, dashboard manifest, Storage Files, phone audit fixes (decision T93; pushed to main 2026-11-15)
- [x] Opening screen v2: preview holds on the splash, loader for slow pages, App name, logo size and tagline (decision T94; pushed to main 2026-11-15)
- [x] Orders final pass and member faces: List dates and table, Calendar past days and busy colours, type cards, member faces on the account and on orders, join Pick your face (decision T95; pushed to main 2026-11-15)
- [x] Stays adoption: layered neutral dashboard theme, five kit pages, Preview panel and public demo builds, UI skills, brand guard and UI scan, docs map and archive (decisions T97 to T101)
- [x] Push News on sample data: Members › News (write, schedule, results, automatic pushes) with entry points, storefront news box on Join and Notify me, Account Notifications and News, Stop news toast (decision T106; built 2026-11-21, UI waiting for review)
- [x] Prize photo, plan chat and payment QR on sample data: crop step on the shared photo row and a Custom prize photo, Messenger-style Plan › Messages (own scroll, groups, times, avatars, Seen, photos with an optional reference), sample QR for every demo shop and one QR card on checkout and the receipt (decision T107; built 2026-11-21, UI waiting for review)
- [x] Log in and sign-up redesign: sign-up tour on a phone with our sample shops that turns into the owner's own app, slimmer step 1 with the password and a colour on step 2, Log in split screen with Show password, Forgot password with a 6-digit code (decision T108; built 2026-11-21, round 2, final pass and finalize the same day, UI waiting for review)
- [x] Sample shops page: `/samples` on the storefront lists every demo shop with its cover, logo and highlights, to open as a customer or as the owner (decision T109; built 2026-11-22, UI waiting for review)
- [x] Smoothness pass: one short count-up, lists fade in, charts stop measuring labels, matching skeletons, dashboard screens load on demand, storefront hydration fix, UI scan speed check (decision T110; built 2026-11-22, waiting for review)
- [x] New order and editable orders: a simple POS for walk-ins and Messenger (items, Guest or Member, how and when, payment with Paid part), + New order in the middle of the phone dock with Menu in More, Edit order while New, Preparing or Ready with Collect more and Give back, database step 10 (decision T111; built 2026-11-22, UI waiting for review)
- [x] Final verdicts: My App in the sidebar, New order photos and laptop pane, board and List photos, Home Upcoming, phone calendar and Preview pill (decision T113; built 2026-11-24, waiting for review)
- [x] Chat Back to chats and Next waiting on Orders, Stays-style account menu with Appearance, My account, Settings and Log out, Preview pill no longer covers it (decision T112; built 2026-11-22, waiting for review)

## Phase 4: Backend, area by area

Order of areas: login first, then shops and settings, catalog, orders and payments, members and stamps, reports (`A-mvp.md` section 3). How to switch an area: the `smartapp-integration` skill, section 3. The phase-by-phase map from here to the first paying shop (proposed 2026-11-20): `blueprints/launch-phases.md`.

### 4.0 Database and ground rules

- [x] Database blueprint approved (55 tables after step 8, T106): 54 tables in 8 areas, access model, build order (`docs/blueprints/database.md`, decision T96, 2026-11-17)
- [x] Database step 1: platform core
- [x] Database step 2: shop setup
- [x] Database step 3: catalog
- [x] Database step 4: members
- [x] Database step 5: orders, payments and push
- [x] Database step 6: stamp card
- [x] Database step 7: exports, billing, tracking and audit
- [x] Database step 8: push News (`push_campaigns`, `push_deliveries`; decision T106)
- [x] Database step 9: Billing chat photos (`billing_messages.photo_media_id` and `reference`, kind `photo`, optional plan payment reference; decision T107)
- [x] Database step 10: New order and Edit order columns on `orders` (`source`, `paid_amount`, `version`, `edited_at`) and the `changed` order message (decision T111; no new tables)
- [x] CI applies migrations to the dev project (D9)
- [x] Course skills (data, analysis, HCI, web, OOP, algorithms, platform, security, integration, prompts), UI approved / Done tracking, Start here doc (decision T102)

### 4.1 API base (before the first area)

- [ ] Drizzle over `pg`, one transaction per request with `set local role app_api` and the shop setting (D1)
- [ ] Guards in order: login, shop from `tenant_members`, `@Can()`; a test fails on any route without `@Public()` or `@Can()`
- [ ] Graceful shutdown, health check that also asks the database, 100 kB body limit
- [ ] Rate limits on public routes (`@nestjs/throttler`, approved in T104)
- [ ] Timed jobs with `@nestjs/schedule` and advisory locks (D5)

### 4.2 Areas

Each area lists its screens; tick UI approved and Done separately.

- Login and sign-up (owner login, sign-up 3 steps, password codes, member join codes; Supabase leaves `packages/data`, T34)
  - [x] UI approved
  - [ ] Done
- Shops and settings (Settings: Your shop, You, hours, ordering, delivery, payments, Plan and storage; Editor draft and Publish; uploads and Storage)
  - [x] UI approved
  - [ ] Done
- Catalog (Menu or Products: items, variants and templates, add-ons, categories, photos, archive)
  - [x] UI approved
  - [ ] Done
- Storefront reads (shop home, menu, item sheet, shop info, closed and busy states)
  - [x] UI approved
  - [ ] Done
- Orders and payments (checkout and Place order, receipt and status, proofs, order chat, owner Orders Board, List and Calendar, Change time, Recall, expiry job)
  - [x] UI approved
  - [ ] Done
- Members and stamps (Join, Rewards, account and picture and saved places (R22), Members page, counter stamps with Undo, claims, limited prizes)
  - [x] UI approved
  - [ ] Done
- Reports (Home: today, Needs you, Sales card, best sellers, busy hours; exports)
  - [x] UI approved
  - [ ] Done
- Platform (Super Admin, go-live approval, plan payments, Billing chat, help mode with audit, Meta Conversions API job, emails through Resend)
  - [x] UI approved
  - [ ] Done

## Phase 5: Launch

From `A-mvp.md` sections 5 and 6 and `docs/launch.md`. The founder does the by-hand steps; `launch.md` has the clicks.

### 5.1 Set up live

- [ ] Live Supabase project on Pro with daily backups; dev becomes staging (D4)
- [ ] Live Supabase settings: custom SMTP through Resend, email confirmation on, code expiry 10 minutes, leaked-password protection on, Data API off, "automatically expose new tables" off
- [ ] Railway API on its domain, Singapore, health check set
- [ ] Vercel Pro, storefront and dashboard on their domains (`*.webserbisyo.com` per shop with `shop.webserbisyo.com/<slug>` as backup, `app.webserbisyo.com`; T105); old rsvp domains removed
- [ ] Resend domain verified; emails from `codes@mail.webserbisyo.com` (sign-up code, shop is live, reminders, payment answers, new-order email N10)
- [ ] Branch protection on `main`
- [ ] Jobs running: expire unpaid transfers, delete proof photos after 30 days, clear unconfirmed uploads, send outbox, drop old leads (D6)
- [ ] Restore from a backup tried once and written down
- [ ] Meta: Pixel and Conversions API tested in Test events (`launch.md` sections 2 to 7)
- [ ] Super Admin set up: platform admin flag, Setup values (`launch.md` sections 5 and 6)
- [ ] Terms and privacy notices checked by someone who knows RA 10173; breach plan written

### 5.2 Launch acceptance (on a real phone)

- [ ] 1. A customer orders in under a minute (pickup GCash, walk-in cash)
- [ ] 2. The owner sees the new order without refreshing and finishes it
- [ ] 3. A rejected proof can be sent again; an approved one marks the order paid
- [ ] 4. A member joins, earns stamps and redeems a reward
- [ ] 5. Shop A can never see shop B's data (tested)
- [ ] 6. The storefront installs on Android and iPhone, opens the saved copy, shows an offline page
- [ ] 7. Lighthouse mobile 90+ on home and menu; at most 300 KB JS per page; CLS under 0.1 (T14 Lighthouse table filled)
- [ ] 8. A privacy page per shop is linked from checkout, account and the footer; marketing opt-ins unticked

### 5.3 First paying shop

- [ ] A pilot shop set up, approved and taking real orders on the live database
- [ ] First plan payment approved (₱399, T92)
