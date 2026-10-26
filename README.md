# Smart App PH

> Your shop's own ordering app, with a stamp card that brings customers back. Built for small Philippine food and retail shops.

Smart App PH gives each small shop (café, burger stand, bakeshop, water refilling station, clothing seller) two things:

1. **A storefront app** that customers open from a link or QR code and can install on their phone. They order as walk-in, pickup or delivery, pay in cash, cash on delivery, or GCash/Maya/bank with an uploaded proof, and join as members to collect stamps.
2. **An owner dashboard** for orders, the menu or product list, members and stamps, the storefront editor, insights and shop settings.

Flat monthly fee, no commission per order, and the shop owns its customer list. "May app ka na, may website ka pa."

**Status:** building Launch MVP A, frontend first with mock data. Task progress: [`docs/PROGRESS.md`](docs/PROGRESS.md).

---

## Features

How to read this list:

- `[x]` means the feature works end to end on the dev database (not only on mock data). `[ ]` means not yet.
- **A** = Launch MVP A (the first paying shops). **B** = Launch MVP B (after launch, built one module at a time behind a per-shop switch). Full scope and the reasons: [`docs/SYSTEM.md`](docs/SYSTEM.md) section 4.
- Tick a box in the same PR that makes the feature work on the dev database. Task progress stays in `docs/PROGRESS.md`; this list is per feature.
- To add a feature: add one line in the right group with its letter, and add its row to the feature catalog in [`docs/SMART_APP_PH_BLUEPRINT.md`](docs/SMART_APP_PH_BLUEPRINT.md) section 3.4.

### Launch MVP A

#### Storefront (customer app)

- [ ] **A** Shop home: logo, name, open or closed now, banners (up to 3), announcement, reward card or "Join and get 1 free stamp", categories, best sellers, About, hours and contact
- [ ] **A** Phone app shell: top bar with the order-type and area pill, floating 4-tab dock (Home, Menu or Products, Rewards, Orders), basket bar above the dock
- [ ] **A** Desktop layout: top navigation, two columns, sticky basket column from 1280 px
- [ ] **A** Menu or Products page with search, sticky category chips, sold-out items greyed out, shareable item links
- [ ] **A** Item sheet: photos, variants (up to 2 choices such as Size and Colour), add-on groups with required or optional rules and min/max picks, quantity, note
- [ ] **A** "Goes well with" side dishes and extras suggested on the item and in the basket
- [ ] **A** Favourites: heart an item, saved on this phone, a Favourites chip on the menu
- [ ] **A** Basket saved on the phone per shop; changed or sold-out lines flagged and left out of the total
- [ ] **A** Closed or paused shop: the basket stays, and checkout offers the next opening times as a scheduled pickup or delivery (owner switch)
- [ ] **A** Offline: the basket and checkout details stay; Place order waits until the phone is back online and re-checks prices
- [ ] **A** One-page checkout: how (walk-in, pickup now or at a time, delivery), who (name, mobile, remembered), pay; prices re-checked before placing
- [ ] **A** Delivery area: pick a zone with its fee, "Use my location" suggests the nearest zone, address with landmark and an optional map pin
- [ ] **A** Receipt page: big order number, QR, live status, payment proof upload, "Track your delivery", Messenger hand-off, save or share the link
- [ ] **A** Save the receipt as an image, or print it and save as PDF
- [ ] **A** Order thread on the receipt (payment proof first, then system updates)
- [ ] **A** My orders and "Order again"
- [ ] **A** Private rating after a completed order, plus the shop's Google review link
- [ ] **A** Order status notifications by web push after the customer taps "Notify me" (iPhone only after Add to Home Screen)
- [ ] **A** Installable app (PWA): per-shop icon and name, opens the saved copy instantly, offline page, install card after joining or a first order
- [ ] **A** Privacy page per shop, consent line at checkout, separate unticked marketing opt-ins
- [ ] **A** Shop brand colours: one brand colour and a logo generate a 60/30/10 palette with a contrast check; status colours never change

#### Members and stamps (the selling point)

- [ ] **A** Guest checkout by default; join with a 6-digit email code (no passwords for customers)
- [ ] **A** 1 welcome stamp on joining (owner switch)
- [ ] **A** Stamps for completed and paid orders over the owner's minimum; taken back if the order is reversed
- [ ] **A** Three reward types: peso discount, free item (from the shop's own products), custom prize (claim code and QR, the owner marks it given)
- [ ] **A** Rewards tab with the stamp card, progress and the reward-ready moment
- [ ] **A** Member QR on the account page; the owner scans it with the phone camera to open that member in the dashboard
- [ ] **A** Past guest orders link to the member by order link or the same email, never by phone alone

#### Owner dashboard

- [ ] **A** Owner sign-up, login, password reset by code; Setup, Waiting for approval and Suspended screens
- [ ] **A** Google sign-in for owners (task T01b)
- [ ] **A** Home: setup checklist, items that need you (to verify, waiting, low stock, prizes to give), today's numbers
- [ ] **A** Orders board: live new orders with a chime and tab count, one next-step button per order, scheduled orders shown apart, order age warnings
- [ ] **A** Order detail: proof zoom, reference copy, approve or reject with a reason, record cash, cancel with a reason, tracking link, rider details, print slip
- [ ] **A** Badges on orders: First order, Member, Reward used
- [ ] **A** Menu or Products: categories, items, photos, variants, stock or sold out, add-on groups (shared library), "Goes well with" picks, archive instead of delete
- [ ] **A** Members: every customer with filters (new this month, regulars, reward ready, almost there, quiet for 30 days), member detail with stamp history, notes and tags
- [ ] **A** Stamp card settings: on or off, minimum order, stamps needed, welcome stamp, reward type and details, live preview, impact warning before changes
- [ ] **A** Give or remove stamps by hand with a required reason and a daily cap; every change is in the stamp history and the audit log
- [ ] **A** Prize claims list: give or cancel pending custom prizes
- [ ] **A** Editor: edit the real storefront on the page (logo, colours, banners, announcement, featured items, About, contact, sections on or off) with Draft and Publish
- [ ] **A** Logo colour helper: reads the logo's main colours and suggests 60/30/10 palettes that pass the contrast check
- [ ] **A** Insights: sales, orders, average order, order types, payments, best sellers, busy hours, new members, repeat customers, stamps given and redeemed, ratings; CSV export
- [ ] **A** Settings: shop info, hours and closed days, pause orders, order types, closed-shop scheduling, delivery zones, payment accounts with QR, account
- [ ] **A** New-order email to the owner (Resend), so an order is not missed when the dashboard is closed
- [ ] **A** Share my shop: link and printable QR

#### Platform, security and quality

- [ ] **A** Multi-shop from day one: every table carries the shop, row-level security on every table, the same check in the API
- [ ] **A** Totals, stock and stamps computed on the server, never trusted from the phone
- [ ] **A** Gap-free daily order numbers; a double tap never makes two orders
- [ ] **A** A screenshot never marks an order paid; a reference number works once per shop
- [ ] **A** Unpaid GCash, Maya and bank orders expire (30 minutes by default); cash and COD wait for the owner
- [ ] **A** Payment proofs private, deleted after 30 days
- [ ] **A** Abuse limits on unpaid orders per phone and orders per shop
- [ ] **A** The founder approves shops and records subscriptions by SQL (no admin screen at launch)
- [ ] **A** Separate live database with backups before the first paying shop
- [ ] **A** Lighthouse mobile 90+ on shop home and menu, first-load JavaScript within budget

### Launch MVP B (after launch)

Each module ships switched off per shop and turns on when ready, so live shops never break. Stubs to fill in: [`docs/SMART_APP_PH_BLUEPRINT.md`](docs/SMART_APP_PH_BLUEPRINT.md) section 17.

#### Selling at the counter and in the back

- [ ] **B** POS: counter sell screen, cash with change, senior and PWD discount, order slip printing
- [ ] **B** Cash shifts: open, cash in and out, blind count at close
- [ ] **B** Voids and approvals with an owner PIN
- [ ] **B** Kitchen or Packing board (prep screen)
- [ ] **B** Dine-in with table QR codes
- [ ] **B** Bluetooth receipt printers and a native dashboard app (Capacitor)

#### Stock and catalog

- [ ] **B** Inventory: stock movements with reasons, restock, low-stock list, stock value
- [ ] **B** Add-ons and combo choices linked to real products and their stock
- [ ] **B** Barcode scan for retail items

#### Team

- [ ] **B** Staff and roles: cashier and Kitchen or Packer logins, named permissions
- [ ] **B** Account security and activity log screens

#### Customers and marketing

- [ ] **B** Promotions and vouchers (percent, peso, free item, free delivery, members only)
- [ ] **B** Announcements and push to members (marketing, with opt-in)
- [ ] **B** Stamp card extras: several reward tiers, stamps per peso spent, stamp expiry, double-stamp days
- [ ] **B** Basket and favourites saved to the member account across devices
- [ ] **B** Customer sign-in with Google
- [ ] **B** Customers extended: block, export, anonymize on request

#### Ordering

- [ ] **B** Advance orders with a calendar, lead days and deposits
- [ ] **B** Shipping by region for online sellers
- [ ] **B** Delivery booking by API (Lalamove), map picker and road distance

#### Insights and platform

- [ ] **B** Full reports: breakdowns, comparisons, cohorts, Google Sheets
- [ ] **B** AI insights and an AI brand assistant (tagline, palette names, banner text)
- [ ] **B** Platform admin screen: approvals, support mode, billing states
- [ ] **B** Online payments (PayMongo), Meta Pixel and Conversions API
- [ ] **B** Custom domains per shop

---

## Tech stack

| Part            | Choice                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Monorepo        | pnpm + Turborepo, Node 24, TypeScript strict, ESLint + Prettier                                            |
| Storefront      | Next.js (App Router, Turbopack, `proxy.ts`, Cache Components), installable PWA with Serwist, on Vercel     |
| Dashboard       | Vite + React, TanStack Router and Query, React Hook Form + Zod, on Vercel                                  |
| API             | NestJS on Express, written by hand (no Nest CLI), Zod validation, Supabase JWT check; on Railway later     |
| Data            | Supabase Postgres (row-level security, SQL functions for money, stock and stamps), Auth, Storage, Realtime |
| UI              | shadcn on Base UI, ReUI, DiceUI, Magic UI; Tailwind CSS v4 tokens; lucide icons; Plus Jakarta Sans         |
| Email           | Resend (later in MVP A)                                                                                    |
| Shared packages | `@smartapp/core` (schemas, rules, words), `@smartapp/ui` (tokens, components), `@smartapp/data` (data)     |

Exact versions live in each `package.json`. Why each choice: [`docs/RESEARCH.md`](docs/RESEARCH.md) section 1.

## Demo shops

Five demo shops are used for mock data, screenshots and the seed: Kanto Smash Burgers (food, Marikina), AquaLinis Water Refilling Station (retail, Las Piñas), Tala Apparel (retail, Cebu City), Kapé Juan Coffee (food, Quezon City) and Panaderya ni Lola Remy (food, Malolos). Details and owner logins: [`docs/demo-shops.md`](docs/demo-shops.md). The demo password comes from the `DEMO_PASSWORD` env variable and is never in the repo.

## Run it

```
pnpm install
pnpm dev        # storefront http://localhost:3000, dashboard http://localhost:5173, api http://localhost:4000
# On a phone on the same Wi-Fi, use the Mac's address instead of localhost (System Settings > Wi-Fi > Details), e.g. http://192.168.1.5:3000/kanto-smash
pnpm check      # typecheck, lint, test
```

Env files: copy each `apps/*/.env.example` to `.env.local` and fill in the values. Never commit them.

## Docs

| Doc                                                                              | What it is                                                                 |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                                                         | Rules for AI agents (Antigravity, Claude); read on every task              |
| [`docs/SYSTEM.md`](docs/SYSTEM.md)                                               | System paper: problem, objectives, scope A and B, flows, data, risks       |
| [`docs/SMART_APP_PH_BLUEPRINT.md`](docs/SMART_APP_PH_BLUEPRINT.md)               | Build blueprint: sitemap, routes, page specs, flows, database, MVP B stubs |
| [`docs/RESEARCH.md`](docs/RESEARCH.md)                                           | Ecosystem findings, library research, pilot metrics and test protocol      |
| [`docs/blueprints/`](docs/blueprints/)                                           | Foundation, A-mvp and B-full blueprints (the short versions agents read)   |
| [`docs/ux.md`](docs/ux.md), [`docs/design-tokens.md`](docs/design-tokens.md)     | UX rules and design tokens                                                 |
| [`docs/api.md`](docs/api.md)                                                     | API contract for the mock and NestJS adapters                              |
| [`docs/components.md`](docs/components.md)                                       | Installed components registry and the `/kit` page                          |
| [`docs/decisions.md`](docs/decisions.md)                                         | Approved decisions                                                         |
| [`docs/PROGRESS.md`](docs/PROGRESS.md), [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Task progress and merged changes                                           |

Agents read only the docs a task prompt names; the three long docs above are for people and for planning.
