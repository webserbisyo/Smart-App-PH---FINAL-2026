# System blueprint (proposal)

What Smart App PH is, why it exists, who uses it and how it is built, as decided on 2026-11-20 (decision T104). It replaces the October system paper (`docs/archive/SYSTEM.md`, version 2.0), which is history. The rule docs win over this page: `A-mvp.md` (scope), `foundation.md` (stack and way of working), `database.md` (data), `decisions.md` (why).

## 1. Summary

Smart App PH gives each small Philippine shop, food or retail, its own installable ordering app for customers (the storefront) and a dashboard for the owner. Customers order from the shop's own link or QR code, pay the shop directly by cash, GCash, Maya, bank or QR Ph, and join the shop's stamp card. The owner sees every order in one place and builds a member list they own. One flat price, no commission: ₱399 a month after a 14-day trial (T92).

## 2. The problem

1. Orders arrive by Messenger, calls and walk-ins, so they get missed or mixed up.
2. GCash and Maya payments are confirmed by screenshot with no reference check, which invites fake or reused proofs.
3. Owners have no customer list and no loyalty program, so one-time buyers do not come back.
4. Delivery platforms charge a commission on every order and keep the customer.
5. A custom app is too expensive for a small shop; store builders are priced in dollars and built for shipping, not pickup and walk-in.

## 3. Objectives

**General:** launch a multi-shop ordering platform where each small shop gets an installable storefront with a stamp card and an owner dashboard, at a flat monthly fee, and reach the first paying shops fast.

**Specific (MVP A):**

1. Customers order and pay from a fast, installable phone app without an account, in under a minute.
2. Walk-in, pickup (now or up to the shop's days ahead) and delivery by zone, each an owner switch.
3. Cash, cash on delivery, GCash, Maya, bank and QR Ph with uploaded proof that the owner checks.
4. Members join with a 6-digit email code, earn stamps on completed paid orders and redeem one reward.
5. One dashboard: Home, Orders, Menu or Products, Members, Editor, Settings.
6. Shops sign up themselves, the founder approves them, and the trial starts (Super Admin).
7. Every shop's data stays separate, tested per table.

## 4. Scope

- In MVP A: every page in `features.md`.
- Not in MVP A (MVP B, `B-full.md`): POS, shifts, staff and roles, promos, dine-in QR, shipping, deposits, recurring orders, full reports, custom domains, online payment gateways, native app.
- Limitations at launch: payments are checked by hand; order slips are not BIR official receipts; iPhone users add the app to the home screen themselves; delivery is booked by the owner in the rider's app; no stock counts (Sold out today and daily limits instead, N26).

## 5. Users and roles

| Who                       | What they do                                                                 | Where                           |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------- |
| Customer (guest)          | Browse, order, pay, upload proof, follow the receipt                         | Storefront                      |
| Customer (member)         | Everything a guest does, plus stamps, rewards, saved details                 | Storefront, Account and Rewards |
| Owner                     | Runs orders, menu, members, look and settings; pays the plan                 | Dashboard                       |
| Super Admin (the founder) | Approves shops, checks plan payments, Billing chat, help mode, Meta tracking | Dashboard `/admin` (T88)        |
| Staff                     | Not in MVP A                                                                 | MVP B, module M1 (`B-full.md`)  |

## 6. Architecture

Three tiers; nothing skips a tier (T34, AGENTS rule 13).

```
Customer phone ─ Storefront (Next.js on Vercel) ┐
                                               ├─> NestJS API (Railway, Singapore) ─> Supabase Postgres, Auth, Storage (Singapore)
Owner, founder ─ Dashboard (Vite on Vercel) ────┘                 └─> Meta Conversions API, Resend email
```

- Apps: `apps/storefront`, `apps/dashboard`, `apps/api`. Shared packages: `packages/core` (Zod shapes, money, words, rules), `packages/ui` (tokens and installed parts), `packages/data` (API client, mock adapters, Query hooks).
- Screens read through hooks. Each area runs on mock data until it is switched to the API (phase 4 in `PROGRESS.md`).
- Business rules live in NestJS and plain SQL functions. RLS is the second lock, not the first.
- Server data lives in TanStack Query; browser-only shared state (the Editor) in one Zustand store with zundo (T103).

## 7. Data

53 tables in 8 areas, hand-written SQL migrations with RLS, grants and policies, 99 database tests (T96). Full design: `database.md`.

## 8. Security and privacy

- One login error for every failed login; another shop's data shows Not found.
- Every API route is `@Public()` or `@Can()`; the shop comes from `tenant_members`, never the URL.
- Proofs in a private bucket, opened by 5-minute signed links, deleted after 30 days.
- No customer data in logs; contact details reach Meta only hashed (`meta.md`).
- A privacy page per shop (Data Privacy Act, RA 10173); marketing opt-ins separate and unticked.

## 9. Business model

₱399 Pro per shop per month, one plan, 500 MB storage, 14-day trial from approval, 6 months for ₱1,995 (T92). Owners pay by GCash or Maya with a receipt; the founder approves. Shops come from Facebook ads to the sign-up page, measured with the Meta Pixel and Conversions API (T90, `meta.md`).

## 10. Method

Iterative and MVP-first. Frontend first with mock data that uses the same Zod shapes as the API, then the backend one area at a time. Antigravity builds on the founder's Mac and pushes to `main`; a cloud Claude session runs the heavy checks and fixes or reverts (T40). Phases 0 to 5: `A-mvp.md` section 3 and `PROGRESS.md`.

## 11. Risks

| Risk                          | What we do                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------- |
| One founder, little money     | MVP A only; cheap tiers; one codebase for all shops                          |
| Fake or reused payment proofs | Reference unique per shop; only the owner's check marks paid                 |
| One shop sees another's data  | Tenant from `tenant_members`, RLS as backup, a cross-shop test per table     |
| Slow phones, prepaid data     | 300 KB JavaScript budget per page, Lighthouse 90, offline basket             |
| Free tiers pause or fill      | Live database on Supabase Pro with backups before the first paying shop (D4) |
| Agents work around failures   | Every prompt says stop and report; reviews reject workarounds                |

## 12. Course mapping

Each course is a repo skill with our rules and sources (T102): Information Management, Systems Analysis and Design, HCI 1 and 2, Web Systems, OOP, Data Structures and Algorithms, Platform Technologies, plus Security, Integration and Prompt writing. List: `docs/README.md`, "Skills".
