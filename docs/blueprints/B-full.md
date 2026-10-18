# Blueprint B: full product

Starts after the MVP has paying shops. Same repo, same NestJS app, same rules (`foundation.md`). Each module ships switched off per shop and turns on when ready, so live shops never break.

## 1. Who uses it

| Person | Where | Login |
| --- | --- | --- |
| Customer | Storefront | Guest, or member with a 6-digit email code |
| Owner | Dashboard | Email and password; two-factor later |
| Staff (cashier, prep) | Dashboard on a shared device | Username plus shop code; change password on first login |
| Platform admin | Dashboard `/admin` | The founder |

Roles: `owner`, `cashier`, `prep` (shown as Kitchen or Packer). Permissions are named (`orders.manage`, `sell.use`, `catalog.manage`...) and checked in Nest (`@Can`) and again in SQL.

Anti-fraud, never cut: nothing is deleted (cancel and void keep a reason); voids after payment and manual discounts need the owner's PIN; blind cash count at shift close; audit log.

## 2. Modules, in build order

Each module = one database task, one API task, then one task per screen.

| # | Module | Adds |
| --- | --- | --- |
| M1 | Staff and roles | seats, staff logins, permissions |
| M2 | Account and audit | profile, security, activity log |
| M3 | Notifications | alerts bell, more email and push events (the outbox and new-order email ship in A, N10) |
| M4 | Inventory | stock movements with reasons, low stock |
| M5 | Settings extras | tables and QR, tax, approval PIN |
| M6 | Dine-in | table ordering on the storefront |
| M7 | Shifts | open, cash in and out, blind close |
| M8 | POS | sell screen, senior and PWD discount, slip |
| M9 | Voids and approvals | void with PIN |
| M10 | Kitchen and packing | prep board |
| M11 | Advance orders | schedule, lead days, deposits |
| M12 | Marketing | vouchers, promotions, announcements |
| M13 | Customers extended | notes, block, export, anonymize, synced favourites and carts, customer Google sign-in |
| M14 | Full reports | breakdowns, CSV |
| M15 | Shipping | by region |
| M16 | Platform | `/admin`, approvals, support mode, billing states |
| M17 | Integrations | PayMongo, Meta Conversions API, Google Sheets |
| M18 | Native app | Capacitor build of the dashboard, Bluetooth printers |
| M19 | Loyalty extras | reward tiers, stamps per peso spent, stamp expiry, double-stamp days |
| M20 | AI | brand assistant from the logo, plain-language insight summaries |
| M21 | Editor extras | section reorder, more templates, scheduled publishing, custom domains |

## 3. Architecture additions

- Nest guard chain: Throttler, Auth (JWKS), Tenant (shop from `tenant_members`, never from the URL), Permission (`@Can`). A test fails the build if a route has neither `@Public()` nor `@Can()`.
- Database access through Drizzle with one transaction per request that sets role `authenticated` and the caller's claims, so RLS still applies. The API's database login has no rights of its own.
- Drizzle never owns the schema; `supabase/migrations` does.
- Each module adds its methods to `docs/api.md` before any code, and its screens follow `docs/ux.md`.
- Supabase secret key used only for staff logins and storage clean-up.
- Jobs: pg_cron for SQL jobs, a Nest worker for the outbox and emails.

## 4. Source for porting

The first build (`webserbisyo/Smart-App-PH`, branch `redesign/v3-home`) has SQL and screens for most modules (staff, POS, shifts, vouchers, schedule, audit chain, reports). Port the rules, not the files.
