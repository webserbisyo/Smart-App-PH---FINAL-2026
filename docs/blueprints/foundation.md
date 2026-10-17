# Foundation blueprint

The base every task builds on. Product scope lives in `A-mvp.md` (launch) and `B-full.md` (after launch).

## 1. Decisions

| # | Decision |
| --- | --- |
| F1 | New repo and new Supabase project. Old repos are reference only, never copied wholesale. |
| F2 | Frontend first: build and see every screen with mock data, then wire the backend one area at a time. |
| F3 | The only database work now is auth (sign up, log in, profiles) and 5 demo owner accounts. |
| F4 | NestJS API from day 1 (`apps/api`). It starts with health and auth checks and grows as areas are wired. |
| F5 | Mock data uses the same Zod schemas as the API, so the swap is one switch per area. |
| F6 | UI only from installed libraries (shadcn on Base UI, ReUI, DiceUI, Magic UI). Hand-writing a component needs the founder's OK. |
| F7 | `docs/components.md` lists every installed component and where it is used; `/kit` shows them all. |
| F8 | One long-lived branch `main`. Agents work on `ag/<task>-<name>` and always open a PR into `main`. |
| F9 | Icons: lucide (the default of all four libraries). Font: Plus Jakarta Sans. |
| F10 | Docs stay short and general. Agents read only the docs a prompt names. Specific component picks live in each task's prompt. |

## 2. Stack

Versions are checked with `npm view <pkg> version` at install time and pinned exactly (no `^`). Snapshot 2026-10-17:

| Part | Choice |
| --- | --- |
| Monorepo | pnpm 12.x + Turborepo 2.11.x, Node 24 LTS, TypeScript 6.0.x strict (move to 7 when typescript-eslint and Nest support it) |
| Storefront | Next.js 16.4.x App Router, React 19.3, Tailwind 4.3 (Vercel) |
| Dashboard | Vite 8.3 + React 19.3, TanStack Router (code routes) + TanStack Query, React Hook Form + Zod (Vercel) |
| API | NestJS 12.x, Zod validation, `jose` for Supabase JWT checks; later Drizzle ORM (Railway, Singapore) |
| Shared | `@smartapp/core` (Zod schemas, types, money, words, demo fixtures), `@smartapp/ui` (tokens + installed components), `@smartapp/data` (Supabase auth client, API client, mock adapters, Query hooks) |
| Backend services | Supabase Singapore: Postgres, Auth, later Storage and Realtime. Resend for email later |

The storefront is one Next.js app and is also the installable PWA (no separate Vite storefront). Serwist precaches the app shell and caches shop pages stale-while-revalidate, so the installed app opens the saved copy instantly and refreshes menu, stock and open/closed in the background. Stock, prices and open/closed are always fetched fresh before checkout. See T6 in `decisions.md`.

## 3. Folders

```
apps/
  storefront/   Next.js customer app: src/app/[shop]/..., src/features/<area>/
  dashboard/    Vite owner app: src/app/ (router, guards, shell), src/features/<area>/{screens,components,hooks}
  api/          NestJS: src/modules/<area>/, src/common/ (guards, pipes, filters), scripts/ (seed)
packages/
  core/         Zod schemas (one file per shape), enums, money, words, demo fixtures. No React, no Supabase
  ui/           tokens.css, installed components (shadcn CLI), lib/utils. No business logic
  data/         auth client, api client, mock adapters, TanStack Query hooks, deviceStorage. Only frontend door to data
tooling/        lint-wall tests and their fixtures
supabase/
  migrations/   SQL: tables, RLS, grants, functions (one new file per change)
docs/           blueprints/, prompts/, decisions, PROGRESS, CHANGELOG, components, design-tokens, demo-shops
```

Import walls (enforced by ESLint): apps never import each other; only `packages/data` and `apps/api` import `@supabase/*`; `packages/core` has no React and does not import `ui` or `data`; `packages/ui` does not import `data`; dashboard features never import each other (shared dashboard code goes in `apps/dashboard/src/app/`).

CSS: one stylesheet, `packages/ui/src/styles/globals.css` (Tailwind v4, imports `tokens.css`). Each app's CSS file only imports it and adds `@source` for `packages/ui/src`, because Tailwind does not scan workspace packages by itself. No `tailwind.config.js`; never follow Tailwind v3 guides. ESLint fails on inline `style` (except `cssVars()`), arbitrary values and hex in class names outside `packages/ui`.

## 4. How data flows

```
Screen -> hook in @smartapp/data -> adapter
                                    |-- mock: fixtures from @smartapp/core/demo, fake latency and errors
                                    `-- api:  NestJS -> Postgres (RLS) / SQL functions
Auth (all phases): app -> @smartapp/data -> Supabase Auth directly
```

- `DATA_SOURCE=mock|api` per app; each area moves to `api` when its backend lands. `docs/api.md` is the contract both adapters follow; a test fails if either misses a method.
- Errors everywhere have one shape: `{ status, code, message, fieldErrors? }`. `code` is from the closed list in `packages/core/src/errors.ts`; screens word it with `errorWords(code)`.
- Mocks return the exact Zod types, throw the same codes and keep the same rules (stock never negative, steps only forward, gap-free order numbers, a proof never marks an order paid). Data comes from a seeded generator (no faker), dated relative to today, with totals and stamps computed, never typed. Mock state survives a reload (versioned key) and `resetDemoData()` clears it. `MOCK_LATENCY` adds delay (400 ± 150 ms, 0 in tests), and each area can be forced empty, error or slow for screenshots and `/kit`.
- Order steps: one transition table in core (`nextActions`, `boardColumn`, `canCancel`) shared with the SQL tests. Screens never compare statuses themselves.
- Data kept on the device (cart, drafts, guest order tokens) goes through one `deviceStorage` in `packages/data`.
- Money in integer centavos. Times stored UTC, shown in Manila time.
- Code words: tenant, item, catalog, prep. Screen words come from vocab (Menu or Products). Never compare the shop type in code; use feature switches.

## 5. Auth

- Owners sign up and log in with email and password (Supabase Auth). Customers (members) come later with a 6-digit email code. Auth emails always send codes, never links.
- One error message for every failed login. Server code checks the user with `getClaims()`, never `getSession()`.
- `public.profiles` is the only table now, created by a trigger on sign up, RLS: a user reads and edits only their own row.
- Demo owners are created by an idempotent script (`apps/api/scripts/seed-demo-accounts.ts`) with the Supabase Admin API. The password comes from an env variable, never from the repo (the repo is public). Each demo user has `app_metadata.demo_shop = <slug>`.
- The API checks the Supabase access token with `jose` against the project JWKS (asymmetric signing keys). The secret key lives only in `apps/api` env and scripts.

## 6. Environments

| Now | Before the first paying shop |
| --- | --- |
| Supabase "Smart App PH MVP FINAL" (the dev project: demo data only, safe to reset) | add a separate prod project; migrations reach prod only by a manual GitHub Action after review |
| Apps run on the founder's Mac; Vercel previews optional | Vercel prod from `main` (Pro plan; Hobby bans commercial use), `shop.webserbisyo.com`, `app.webserbisyo.com` |
| API runs locally | Railway Singapore, `api.webserbisyo.com` |

Migrations reach the dev project only when the founder runs `pnpm db:push` after merging; agents never run it. Local Docker Supabase is optional and not required for any task. Regions: Supabase Singapore, Vercel functions `sin1`, Railway Singapore. Before the first paying shop: branch protection on `main` (PR and green CI required) and Supabase backups.

## 7. Way of working

1. Claude proposes the next task plan; the founder says yes; Claude writes one prompt (`docs/prompts/T<nn>-<name>.md`).
2. The founder pastes it into Antigravity. Antigravity posts its plan; the founder pastes it back to Claude for review.
3. Antigravity codes on `ag/t<nn>-<name>`, runs `pnpm check` and `pnpm build`, takes screenshots at 390 and 1280 px, ticks one line in `docs/PROGRESS.md`, adds one line to `docs/CHANGELOG.md`, opens the PR with `gh pr create` and prints the link.
4. Claude checks the PR (including that planned components were installed, not written). The founder merges.

Every prompt carries this line: "Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing."

## 8. NestJS from day 1: risks and fixes

| Risk | Fix |
| --- | --- |
| One more app to run, build and deploy before it does much | It starts tiny (health, auth check, seed script); Railway only when the first area is wired |
| Nest cannot import TypeScript source from workspace packages | `@smartapp/core` builds to `dist` with `tsc`; Turbo builds dependencies first |
| Tenant data leaks through a forgotten filter | From the first route: every route needs `@Public()` or `@Can()` (a test fails otherwise); the shop comes from `tenant_members`, never the URL or body; JWT checks `iss`, `aud`, `exp`; later guards (Auth, Tenant, Permission) plus RLS in the same request transaction and cross-shop tests |
| Open API surface | helmet, CORS allow-list, 100 kB body limit, Zod on every input (unknown keys stripped), no customer data in logs |
| Two places for rules (Nest and SQL) | Money, stock and stamps stay in SQL functions; Nest validates, checks permission and calls them |
| Extra latency (app -> Railway -> Supabase) | Same region (Singapore); public storefront reads cached in Next |
| Cost | Railway Hobby only from the first wired area; check pricing then |

## 9. Quality bar (every screen)

- The rules in `docs/ux.md`: responsive plan, phone feel, states, accessibility.
- Colours only from tokens (`docs/design-tokens.md`); status shown by icon plus word plus colour.
- Motion under 400 ms, off for `prefers-reduced-motion`.
- 0 console errors and 0 React warnings. Check at 360, 390, 768, 1024 and 1280 px (dashboard also 1536).
- Test with a food shop and a retail shop, phone and desktop.
