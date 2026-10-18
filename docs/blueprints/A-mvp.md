# Blueprint A: MVP launch

Goal: the first paying shops, as fast as possible. Base rules: `foundation.md`.

## 1. What ships

| Area        | In the MVP                                                                                                                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storefront  | Shop home, menu with search, item sheet, cart, checkout, receipt with live status and payment proof, my orders, member account with stamp card, install as an app                                                                        |
| Order types | Walk-in, pickup (now, or a time today or tomorrow), delivery (zones with a fee); each one an owner switch. A closed shop can take pickup and delivery orders for its next opening (N1)                                                   |
| Payments    | Cash, cash on delivery, GCash, Maya, bank with uploaded proof; the owner checks proofs by hand                                                                                                                                           |
| Members     | Guest checkout; join with a 6-digit email code; 1 welcome stamp; stamps on completed paid orders; one reward (discount, free item or custom prize); manual stamps with a reason, at most 3 per member per day (N5)                       |
| Dashboard   | Home, Orders (board and detail), Menu or Products, Members (stamp card, claims), Editor (look and content, draft and publish), Insights, Settings (info, hours, order types, payments, delivery); new-order email to the owner (N9, N10) |
| Platform    | Owner sign-up creates a pending shop; the founder approves                                                                                                                                                                               |
| Price       | ₱599 or ₱799 per shop per month (open)                                                                                                                                                                                                   |

Not in the MVP (Blueprint B): POS, shifts, kitchen screen, staff and roles, promos, dine-in QR, shipping, advance orders beyond tomorrow, push announcements, full reports, admin screens, custom domains, online payments, native app.

## 2. Look and feel (from storefront v2, still valid)

- Storefront: phone app shell (top bar 56 px with logo, name, open state, area pill, bell for order updates, avatar; floating tab dock Home, Menu, Rewards, Orders, 64 px tall, 12 px from the edges; basket bar "3 items · ₱345 View" above it, hidden at 0 items and on checkout and receipt). Top navigation from 1024 px; sticky cart column from 1280 px (a right drawer from 1024 to 1279). Widths and phone behaviour: `docs/ux.md`. Light mode only.
- Owner picks one brand colour and a logo; the 60/30/10 palette is generated with a contrast check (`docs/design-tokens.md`); status colours never change.
- Owner content: logo, brand colour, up to 3 banners, announcement, About, contact, all edited in the Editor (N7).
- Dashboard: bottom dock on phone, 72 px rail on tablet, 248 px sidebar on laptop and up (one nav per device), light and dark. Products list with table and grid toggle.

## 3. Phases

| Phase                       | What                                                                                                            | Done when                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 0 Foundation                | T01: monorepo, docs, auth migration, demo accounts, login and sign up, blank "dashboard" and "storefront" pages | Each demo owner can log in; CI green                                |
| 1 Kit and shell             | Install planned components, `/kit` page, tokens, app shells for both apps, mock data for the 5 demo shops       | Both shells work on phone and desktop with mock data                |
| 2 Storefront screens (mock) | One screen per task, in the order of section 1                                                                  | Every screen and state visible with all 5 shops                     |
| 3 Dashboard screens (mock)  | One screen per task                                                                                             | Owner can do every MVP job on mock data                             |
| 4 Backend, area by area     | For each area: migration (RLS, grants, SQL functions), Nest module, switch the adapter to `api`                 | The area works on the dev database; mocks still pass the same tests |
| 5 Launch                    | Prod Supabase, Railway, Vercel domains, Resend, privacy page, proof deletion job, audit and fixes               | Acceptance list below passes on a real phone                        |

Area order in phase 4: shops and settings, catalog, orders and payments, members and stamps, reports.

## 4. Rules that must hold in the backend

- Totals, stock and stamps are computed in SQL functions, never trusted from the browser. Clients never write money, stock or stamp tables.
- Statuses. Order: `placed`, `preparing`, `ready`, `out_for_delivery`, `completed`, `cancelled`, `expired`. Payment: `unpaid`, `pending`, `paid`. Steps only move forward; completing needs paid; cancel needs a reason; nothing is deleted (an item with orders is archived).
- Order lines copy the item name and price at order time; `total = subtotal - discount + delivery fee`. Stock is taken at placement and given back once on cancel or expiry.
- Gap-free daily order numbers; a double tap never makes two orders (client key).
- A screenshot never marks an order paid; only the owner's check does. Duplicate references are blocked.
- Only GCash, Maya and bank orders expire unpaid (30 min default); cash and COD wait for the owner.
- Proofs: private bucket, at most 3 files, upload only while unpaid and within 7 days, owner views through 5-minute signed links, files deleted after 30 days (the payment row stays). A reference is unique per shop among payments that were not rejected.
- Abuse limits: at most 3 unpaid orders per phone per 30 min and 30 orders per shop per minute.
- Stamps only for completed paid orders, given back on reversal; the stamp history is append-only. Never stamps for reviews.
- A guest order links to a member only by its order token or the same email, never by phone alone.
- Shop media paths never change (`<tenantId>/<folder>/<uuid>.webp`); images are compressed on the phone.
- Every table: RLS on, explicit grants, policies, in the same migration. A cross-shop test per table.

## 5. Launch acceptance

1. A customer orders on a phone in under a minute (pickup GCash and walk-in cash).
2. The owner sees the new order without refreshing and finishes it.
3. A rejected proof can be sent again; an approved one marks the order paid.
4. A member joins, earns stamps and redeems a reward.
5. Shop A can never see shop B's data (tested).
6. The storefront installs on Android and iPhone (Serwist, same Next.js app), opens the saved copy instantly and shows an offline page. Stock, prices and open/closed are fetched fresh before checkout. "Add to home screen" is offered after a customer joins or places a first order.
7. Lighthouse mobile performance 90 or more on shop home and menu; storefront first-load JavaScript at most 200 kB gzipped per page; CLS under 0.1.
8. A privacy page per shop (plain English plus a short Filipino summary) is linked from checkout, account and the footer; marketing opt-ins are separate and unticked.

## 6. Done before the first paying shop

Prod Supabase project with backups (the dev project becomes staging); Resend SMTP with email confirmation on; Railway API on its domain; Vercel Pro and domains; branch protection on `main`; privacy notice reviewed; 30-day proof deletion job; price decided.
