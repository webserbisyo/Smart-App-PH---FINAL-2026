# Smart App PH: Research

Version 1.0, October 18, 2026. Companion to [`SYSTEM.md`](SYSTEM.md) (what and why) and
[`SMART_APP_PH_BLUEPRINT.md`](SMART_APP_PH_BLUEPRINT.md) (how). This file holds the evidence: what
the ecosystem looks like today, which libraries fit, who else serves these shops, and how the pilot
will be measured.

**Status words used below.** **Verified**: checked on October 18, 2026 against the npm registry, a
package's own source, or a cited page. **Assumed**: from memory, earlier research or common
practice, not re-checked today. Anything assumed must be checked before a task depends on it.

This is the one doc allowed to name versions. Decided versions live in `pnpm-lock.yaml` and the
T01 branch; the versions here are a snapshot, not a pin.

## 1. Ecosystem findings

### 1.1 Decided stack (T01)

Versions resolved on the T01 foundation branch (not yet merged into `main`); registry lookups on
October 18, 2026. Sources are listed in section 6.

| Area              | Choice                                   | Version seen               | Status   | Note                                                                             |
| ----------------- | ---------------------------------------- | -------------------------- | -------- | -------------------------------------------------------------------------------- |
| Runtime           | Node.js                                  | 24.14 (founder's Mac)      | Verified | Packages needing 24.15+ are pinned to an older version that supports 24.14 (T19) |
| Package manager   | pnpm                                     | 12.8.1                     | Verified | Settings in `pnpm-workspace.yaml`; engineStrict on                               |
| Monorepo          | Turborepo                                | 2.11.7                     | Verified | Task graph for check, build, test                                                |
| Language          | TypeScript                               | 6.0.3                      | Verified | Strict; no `any`, no casts to silence errors                                     |
| Storefront        | Next.js (Turbopack, `proxy.ts`)          | 16.4.0                     | Verified | Server-rendered shop pages, Cache Components                                     |
| Dashboard         | Vite + React                             | 8.3.4 / 19.3.0             | Verified | One React version across the repo                                                |
| Routing (dash)    | TanStack Router                          | 1.170.42                   | Verified | Typed routes and search params                                                   |
| Server state      | TanStack Query                           | 5.104.1                    | Verified | Cache, retries, optimistic updates                                               |
| Forms             | React Hook Form + resolvers              | 7.89.0 / 5.9.1             | Verified | Zod schemas from `packages/core`                                                 |
| Validation        | Zod                                      | 4.6.5                      | Verified | Shared by mock data, API and forms                                               |
| API               | NestJS on Express (by hand, no CLI)      | 12.1.2                     | Verified | Config 12.0.1, terminus 12.1.0, Standard Schema validation pipe                  |
| API security      | helmet, jose (JWKS)                      | 8.3.0 / 6.2.12             | Verified | Supabase access tokens checked against the project's JWKS                        |
| API tests         | Vitest + unplugin-swc                    | 5.0.3 / 2.0.0              | Verified | SWC for Nest decorators; jsdom 29.1.1 for UI tests (T19)                         |
| Database and auth | Supabase (supabase-js, ssr, CLI)         | 2.117.3 / 0.12.7 / 2.120.0 | Verified | `getClaims` in the storefront proxy; migrations only via files                   |
| UI primitives     | shadcn (Base UI), lucide icons           | 4.21.4 / 1.9.0 / 1.55.0    | Verified | Plus ReUI, DiceUI, Magic UI through the shadcn CLI                               |
| Styling           | Tailwind CSS                             | 4.3.3                      | Verified | Tokens in `packages/ui`                                                          |
| Lint and format   | ESLint, Prettier (+ Tailwind plugin)     | 10.12.0 / 3.9.10 / 0.8.1   | Verified | Prettier checks Markdown too                                                     |
| Hosting           | Vercel (both web apps), Railway (API)    | n/a                        | Assumed  | Free or hobby tiers until the first paying shop                                  |
| Email             | Resend from `codes@mail.webserbisyo.com` | n/a                        | Assumed  | Owner sign-in codes and the new-order email (N10)                                |

### 1.2 Platform facts that shape the design

| Fact                                                                                                         | Status   | What it changes                                                                                       |
| ------------------------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------- |
| Background Sync is not supported in Safari or on iOS (all iOS browsers use WebKit)                           | Verified | No "send the order later when online" (N2). The basket and checkout details are kept instead          |
| Serwist ships a Background Sync queue and plugin, with a replay fallback when the browser lacks the API      | Verified | Could be used in B for non-money requests (for example analytics); never for placing orders           |
| iOS web push works only for a PWA added to the Home Screen, after the customer allows it                     | Assumed  | Order-status push is a bonus; the order page and its link stay the main way to follow an order        |
| Supabase Realtime private channels are authorised by RLS policies on `realtime.messages`, checked at connect | Verified | Owner order feed uses a private channel per shop; access changes apply on reconnect                   |
| Next.js draft mode skips the cache for the visitor holding the cookie                                        | Verified | Editor preview uses a short-lived preview token page instead of draft mode with Cache Components (N7) |
| Draft mode with Cache Components has open community reports of rough edges                                   | Verified | Same as above; re-check when a later Next.js release notes a fix                                      |
| GCash, Maya and bank transfers have no free payment confirmation API for small merchants                     | Assumed  | Manual payment check with an uploaded proof (P3); a payment gateway is B                              |
| Most target customers use mid-range Android phones on mobile data                                            | Assumed  | Image compression on upload, small JS on the storefront, skeletons instead of spinners                |

### 1.3 Running costs at launch

All **assumed** from public pricing pages as remembered; check before the first paying shop.

| Item                     | Launch plan             | Monthly cost   | When it grows                                                          |
| ------------------------ | ----------------------- | -------------- | ---------------------------------------------------------------------- |
| Supabase (dev DB)        | Free project, Singapore | ₱0             | Live DB needs the paid plan (about US$25) before the first paying shop |
| Vercel                   | Hobby while testing     | ₱0             | Commercial use needs Pro (about US$20 per member)                      |
| Railway (NestJS API)     | Hobby plan              | about US$5     | Grows with traffic; one small service is enough for the pilot          |
| Resend                   | Free tier               | ₱0             | Paid plan once daily email volume passes the free limit                |
| Domain `webserbisyo.com` | Already owned           | Yearly renewal | Subdomains only, no new domains per shop                               |

## 2. Library research

Rules from [`decisions.md`](decisions.md): no new package without the founder's yes; UI comes from
the installed libraries. Each row below is a **candidate**, not a decision. "Planned" means a
blueprint task already names it; "Candidate" means it needs a yes. Versions verified on the npm
registry on October 18, 2026.

### 2.1 Storefront (PWA)

| Need                                     | Package                         | Version       | Status in plan          | Why it fits                                                                                                | Watch out                                                 |
| ---------------------------------------- | ------------------------------- | ------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Install, offline shell, caching          | `@serwist/turbopack`, `serwist` | 9.5.13        | Planned (T6)            | Works with Turbopack builds; precache plus runtime caching                                                 | Keep money requests out of any cache or queue             |
| URL state (category, search, sheet open) | `nuqs`                          | 2.10.2        | Candidate               | Type-safe query params; adapters for the Next.js app router and TanStack Router, so both apps can share it | Do not put basket or personal data in the URL             |
| Basket and checkout kept on the phone    | `idb-keyval`                    | 6.3.0         | Candidate               | Tiny IndexedDB wrapper; survives reloads and closed tabs (N1, N2, N3)                                      | Clear on sign-out; store per shop slug                    |
| Phone numbers                            | `libphonenumber-js`             | 1.13.15       | Candidate               | Validates and formats 09xx and +63 numbers                                                                 | Use the small metadata build                              |
| Manila time and opening hours            | `date-fns` + `@date-fns/tz`     | 4.4.0 / 1.5.0 | Candidate               | Open or closed, next-opening slots (N1) in Asia/Manila                                                     | Rules live in `packages/core`, not in components          |
| Stamp earned celebration                 | `canvas-confetti`               | 1.9.4         | Candidate               | Small, no React needed; respects reduced motion if we check it                                             | Magic UI may already cover this; prefer the installed one |
| Banner carousel                          | `embla-carousel-react`          | 8.6.0         | Candidate               | Used by the shadcn carousel                                                                                | Arrives with the shadcn component; no separate install    |
| Toasts                                   | `sonner`                        | 2.0.8         | Candidate               | Used by the shadcn toast                                                                                   | Same as above                                             |
| Animated numbers (stamp count, totals)   | `@number-flow/react`            | 0.6.2         | Candidate               | Smooth count changes                                                                                       | Nice to have; skip if bundle size hurts                   |
| SEO structured data                      | `schema-dts`                    | 2.1.0         | Candidate               | Types for `Restaurant` and `Store` JSON-LD on shop pages                                                   | Types only, no runtime cost                               |
| Web push for order status                | `web-push` (API side)           | 3.6.7         | Candidate (late A or B) | Standard VAPID sender                                                                                      | Last release 2024; check activity before adopting         |
| Usage analytics                          | `@vercel/analytics`             | 2.0.1         | Candidate               | Page views without cookies                                                                                 | Mention in the privacy page                               |

Rejected for A: background order sending (Safari gap, section 1.2); client state libraries for
the basket beyond React state plus `idb-keyval`; heavy animation libraries on the storefront
(`motion` 14.3.0 only if an installed component already pulls it in).

### 2.2 Dashboard and API

| Need                                 | Package                                | Version | Status in plan | Note                                                                                                                     |
| ------------------------------------ | -------------------------------------- | ------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Member QR on the storefront          | `qrcode`                               | 1.5.4   | Candidate      | Generates the QR that opens the member page in the dashboard (N6)                                                        |
| Image compression before upload      | `browser-image-compression`            | 2.0.2   | Candidate      | Last release 2023; the plan is a canvas WebP helper in `packages/data`; this library only if that fails on target phones |
| One-time code input                  | `input-otp`                            | 1.5.0   | Candidate      | Used by the shadcn input-otp component                                                                                   |
| Tables (orders, members, catalog)    | `@tanstack/react-table`                | 9.3.1   | Candidate      | Comes with data-table components; v9 is new, check the installed block's version                                         |
| Charts (Insights)                    | `recharts`                             | 3.10.1  | Candidate      | Used by the shadcn chart component                                                                                       |
| Reorder categories and items         | `@dnd-kit/react`                       | 0.5.1   | Candidate      | Still 0.x; up and down buttons are enough for A                                                                          |
| Keep queries across reloads          | `@tanstack/react-query-persist-client` | 5.104.4 | Candidate (B)  | Helps the dashboard on weak data; not needed for A                                                                       |
| URL state                            | `nuqs`                                 | 2.10.2  | Candidate      | Same package as the storefront (filters, tabs)                                                                           |
| Rate limits (place order, codes)     | `@nestjs/throttler`                    | 6.7.1   | Planned        | Named in `foundation.md` before public routes; peer range includes Nest 12 (verified)                                    |
| Jobs (expire unpaid orders, cleanup) | `@nestjs/schedule`                     | 12.0.2  | Candidate      | Or a Supabase cron; one place only (blueprint section 13.5)                                                              |
| Structured logs                      | `nestjs-pino`                          | 5.3.1   | Planned        | "pino logs" in `foundation.md`; peers Nest 12.0.2+, pino 10, pino-http 11; Node 22.12+ (fine on 24.14)                   |
| Global client state                  | `zustand`                              | 5.0.15  | Not needed     | TanStack Query plus URL state cover A                                                                                    |
| ORM                                  | `drizzle-orm`                          | 0.45.4  | Planned (B)    | Not in A (Supabase client plus SQL functions); B uses it with RLS per request (`B-full.md`)                              |

### 2.3 Logo colour helper (N8)

Goal: from an uploaded logo, suggest a 60/30/10 palette (neutral background, brand colour, accent)
that passes contrast checks. No AI model in A.

| Package          | Version | Runs in          | Fit                                                                                  |
| ---------------- | ------- | ---------------- | ------------------------------------------------------------------------------------ |
| `extract-colors` | 4.2.1   | Browser and Node | Returns colours with their area share; good for "which colour is the brand colour"   |
| `node-vibrant`   | 4.0.4   | Browser and Node | Named swatches (Vibrant, Muted, Dark); good starting roles                           |
| `colorthief`     | 3.5.0   | Browser and Node | Simple dominant colour and palette                                                   |
| `culori`         | 4.0.2   | Anywhere         | OKLCH conversion, lightness steps and WCAG contrast; builds the 60/30/10 from a seed |

Proposal: one extractor (`extract-colors` first choice) plus `culori` for the palette and contrast
math, with the palette rules in `packages/core`. The owner always confirms or edits the result.
An AI brand assistant (reads the logo, names the style, suggests copy) is B (M20).

## 3. Competitor review

How small Philippine food and retail shops take orders today. Feature notes are **assumed** from
public product pages and common use; prices change often and are not listed.

| Option                                      | What shops use it for                    | Strength                            | Gap Smart App PH fills                                                       |
| ------------------------------------------- | ---------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Facebook page + Messenger                   | Menu photos, orders by chat              | Free; every customer already has it | No order list, no prices in one place, no payment check, orders lost in chat |
| Delivery marketplaces (GrabFood, foodpanda) | Delivery orders                          | Riders and reach                    | High commission, the customer belongs to the platform, no own loyalty        |
| POS apps (Loyverse and similar)             | Counter sales, inventory, simple loyalty | Strong at the counter               | Built for the cashier, not for customers ordering from their own phone       |
| Store builders (Shopify and similar)        | Online store with shipping               | Mature, many apps                   | Dollar pricing, shipping-first, no walk-in or stamp card out of the box      |
| Paper stamp cards                           | Loyalty                                  | Cheap, familiar                     | Lost cards, no data, easy to fake                                            |
| Google Forms or spreadsheets                | Pre-orders                               | Free                                | No menu, no totals, manual follow-up                                         |

Where we must match or beat them: ordering in under a minute from a link, clear payment steps for
GCash and Maya, a stamp card the customer cannot lose, and a flat monthly fee (₱599 or ₱799, open).
Where we do not compete in A: riders, counter POS, marketplace reach.

## 4. Pilot metrics and validation

### 4.1 Pilot setup

- 3 to 5 real shops (target mix: one food shop, one water refill, one retail), 4 weeks each.
- Before the pilot: the 5 demo shops pass the demo script in blueprint section 16.
- Data comes from the database (orders, members, ledger) and short owner interviews in week 1 and
  week 4. No tracking beyond what the privacy page states.

### 4.2 Metrics and formulas

| Metric                  | Formula                                                                  | Target for "keep going" |
| ----------------------- | ------------------------------------------------------------------------ | ----------------------- |
| Weekly orders per shop  | count(orders placed in the week, not cancelled by the shop as spam)      | Grows week over week    |
| Order completion rate   | completed orders ÷ placed orders                                         | 90% or more             |
| Payment check time      | median(payment confirmed time − proof uploaded time)                     | Under 15 minutes        |
| Member join rate        | new members ÷ distinct customers who placed an order                     | 30% or more             |
| Repeat customer rate    | customers with 2+ orders in 30 days ÷ customers with 1+ order in 30 days | 25% or more             |
| Reward redemption       | rewards claimed ÷ members who reached a full card                        | 50% or more             |
| Closed-shop orders (N1) | orders with `placed_while_closed` ÷ all orders                           | Watched, no target      |
| Checkout drop-off       | (checkouts opened − orders placed) ÷ checkouts opened                    | Under 40%               |
| Owner setup time        | time from sign-up to first published storefront                          | Under 30 minutes        |
| Willingness to pay      | shops that agree to pay after the pilot ÷ pilot shops                    | At least 2 shops        |

### 4.3 Usability test

- **Owners (5):** set up a shop, add 5 items with a variant and an add-on group, publish the
  storefront, confirm a GCash order, give a manual stamp. Think aloud; note time and errors.
- **Customers (8 to 10):** on their own phone and mobile data, order pickup with a GCash proof,
  join as a member, find the stamp card, order again from history.
- Score each task: done without help, done with help, not done. Fix anything below 80% done
  without help before launch.
- After the tasks, each person fills in the System Usability Scale (SUS) below.

### 4.4 System Usability Scale

Answer each from 1 (strongly disagree) to 5 (strongly agree). Filipino or Taglish wording may be
used in the test; keep the meaning.

1. I think that I would like to use this app often.
2. I found the app unnecessarily complex.
3. I thought the app was easy to use.
4. I think that I would need help from a technical person to use this app.
5. I found the parts of this app well put together.
6. I thought there was too much inconsistency in this app.
7. I would imagine that most people would learn to use this app very quickly.
8. I found the app very awkward to use.
9. I felt very confident using the app.
10. I needed to learn a lot of things before I could get going with this app.

**Score:** for odd items, score − 1; for even items, 5 − score; add all ten and multiply by 2.5
(0 to 100). 68 is average; aim for 75 or more for both owners and customers.

## 5. Limitations and ethics

- **Small sample.** A pilot of a few shops shows direction, not proof; results are reported as
  counts, not as broad claims.
- **Assumed facts.** Rows marked "Assumed" in this file must be checked before a task relies on
  them; costs and competitor features change often.
- **Data privacy.** Customer names, phone numbers, addresses and payment proofs are personal data
  under the Data Privacy Act (RA 10173). Collect only what the order needs, explain it on the
  privacy page, keep each shop's data apart (RLS), and delete payment proofs on a schedule.
- **Consent.** Pilot owners and test participants agree in writing to take part; interviews are
  anonymised in any write-up; participants can stop at any time.
- **Honest loyalty.** Manual stamps carry a reason and the owner's name, with a daily cap (N5), so
  owners cannot quietly inflate or remove rewards.

## 6. Sources

Checked October 18, 2026 unless marked otherwise.

- npm registry package pages, `https://www.npmjs.com/package/<name>`, for every version in
  sections 1 and 2 (looked up with `npm view`).
- Serwist package source (`serwist` 9.5.13, BackgroundSyncQueue and BackgroundSyncPlugin), read
  from the published package.
- Serwist docs for Turbopack: https://serwist.pages.dev/docs/next/turbo (not reachable from the
  research machine; README on npm used instead).
- nuqs README on npm (adapters list): https://www.npmjs.com/package/nuqs
- Can I use, Background Sync API: https://caniuse.com/background-sync
- Supabase docs, Realtime Authorization: https://supabase.com/docs/guides/realtime/authorization
- Next.js docs, Draft Mode: https://nextjs.org/docs/app/guides/draft-mode
- Next.js blog (16.x releases): https://nextjs.org/blog
- NestJS docs, migration guide: https://docs.nestjs.com/migration-guide
- Vite blog: https://vite.dev/blog
- pnpm blog: https://pnpm.io/blog
- shadcn changelog (Base UI support): https://ui.shadcn.com/docs/changelog
- Founder's stack research for T01:
  `/mnt/project-files/restart/research/T01-stack-research.md` (project files, not in the repo).
- System Usability Scale: Brooke, J. (1996). "SUS: A quick and dirty usability scale."
- Data Privacy Act of 2012 (RA 10173): https://privacy.gov.ph/data-privacy-act/
