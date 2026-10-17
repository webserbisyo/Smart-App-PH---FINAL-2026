# T01 Foundation: monorepo, auth, demo accounts, blank pages

Paste everything below into Antigravity.

---

Read `AGENTS.md`, `docs/blueprints/foundation.md`, `docs/components.md`, and the Summary table in `docs/demo-shops.md`. Nothing else. This repo starts empty except those docs; do not look for or copy code from any other repo.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

## Goal

A clean monorepo with three apps and three packages, a Supabase auth migration, 5 demo owner accounts, working log in and sign up. After log in the dashboard shows only the text `dashboard`. The storefront shows only the text `storefront`. The API answers `/health`.

## Rules for this task

- Branch `ag/t01-foundation` from `main`. One commit per step (`chore(t01): ...`, `feat(t01): ...`).
- Check every version with `npm view <pkg> version` and pin it exactly. Use the latest stable unless `foundation.md` says otherwise (TypeScript 6.0.x, Node 24, pnpm 12.x).
- Post your plan (files and steps) first and wait for my OK.

## Steps

1. **Root.** `package.json` (`packageManager` pinned pnpm, `engines.node` 24, scripts `dev`, `build`, `check` = `turbo run typecheck lint test`, `typecheck`, `lint`, `test`, `db:push` = `supabase db push`, `db:new` = `supabase migration new`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`, `tooling`), `.npmrc` (`save-exact=true`, `engine-strict=true`), `.nvmrc` (24), `turbo.json` (`"agentGuidance": false`; `build` and `typecheck` depend on `^build`; `dev` persistent, no cache), `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), `.gitignore` (`.env*` except `.env.example`, `node_modules`, `dist`, `.next`, `.turbo`), `.github/workflows/check.yml` (Node 24, pnpm from `packageManager`, `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm build`). Supabase CLI as an exact root devDependency.
2. **ESLint walls** (`eslint.config.js`, flat, typescript-eslint strict type-checked, react-hooks for React code): apps never import each other; only `packages/data` and `apps/api` may import `@supabase/*`; `packages/core` may not import React or Supabase; files in `apps/dashboard/src/features/<a>` may not import `features/<b>`. Add a `tooling` workspace (`@smartapp/tooling`) with `lint-walls.test.ts` that lints small fixture files and expects each wall to fire.
3. **`packages/core`** (`@smartapp/core`, builds to `dist` with `tsc`, exports from `dist`): `zod`; `src/schemas/auth.ts` (`LoginSchema`: email, password min 8; `SignUpSchema`: full name 1 to 80, email, password min 8); `src/schemas/demo-shop.ts` (`DemoShopSummarySchema`: slug, name, kind `food|retail`, ownerName, ownerEmail); `src/demo/shops.ts` with the 5 shops from the Summary table (owner names from each shop section); `src/words.ts` (`appName: 'Smart App PH'`, `dashboard: 'dashboard'`, `storefront: 'storefront'`, auth form labels and errors). Vitest: every demo shop parses; slugs and emails are unique.
4. **`packages/ui`** (`@smartapp/ui`): Tailwind v4, `src/styles/tokens.css` from `docs/design-tokens.md` (light and dark), Plus Jakarta Sans. Run `shadcn init` for a monorepo: style `base-nova` (Base UI), icon library lucide, CSS variables on, and add the registries to `components.json`: `"@reui": "https://reui.io/r/{style}/{name}.json"`, `"@diceui": "https://diceui.com/r/{style}/{name}.json"`, `"@magicui": "https://magicui.design/r/{name}"`. Vitest `components-registry.test.ts`: fails if any file in `src/components/` is not listed in the Installed table of `docs/components.md`.
5. **`packages/data`** (`@smartapp/data`): `@supabase/supabase-js`; `createAuthClient(url, publishableKey)`; TanStack Query hooks `useSession`, `useSignIn`, `useSignUp`, `useSignOut`; errors mapped to one shape `{ status, message, fieldErrors? }` with friendly words from `words.ts`. Empty `src/mocks/` with a one-line README: "Mock adapters live here from T03."
6. **`apps/dashboard`** (`@smartapp/dashboard`, Vite + React + TypeScript, port 5173): Tailwind using `@smartapp/ui` tokens; TanStack Router (code routes) and TanStack Query.
   - From the app folder install the shadcn blocks `login-01` and `signup-01` (they pull button, card, input, label, field into `packages/ui`). Wire them to React Hook Form + Zod with `LoginSchema` and `SignUpSchema`. Edit block text only to use `words.ts`.
   - Routes: `/login`, `/signup`, `/` (needs a session, shows only `dashboard`), `/logout` (signs out, goes to `/login`). Signed-in users on `/login` go to `/`.
   - States: button shows loading and is disabled while sending; wrong password and taken email show a field or form error; offline shows "You're offline" on the button.
   - `/kit`: only when `import.meta.env.DEV` or `VITE_SHOW_KIT=true`. One section per installed component (name, library, live example, where used) plus token swatches and a light/dark switch. Lazy-loaded so production bundles do not include it.
7. **`apps/storefront`** (`@smartapp/storefront`, Next.js App Router, TypeScript, `src/`, port 3000): Tailwind with `@smartapp/ui` tokens; light mode only. `/` shows only `storefront`. `/[shop]` shows only `storefront` when the slug is one of the 5 demo shops, otherwise `notFound()`. `params` is async. Keep the `AGENTS.md` that create-next-app adds inside the app.
8. **`apps/api`** (`@smartapp/api`, NestJS, port 4000): strict TS, env validated with Zod at start (`PORT`, `SUPABASE_URL`, `CORS_ORIGINS`), CORS for the two local apps, `GET /health` returns `{ "ok": true, "app": "Smart App PH" }` using `words.appName` from `@smartapp/core` (proves the shared import). Unit test for health.
   - `scripts/seed-demo-accounts.ts`, run by `pnpm --filter @smartapp/api seed:demo` with `node --env-file=.env.local` (no new package). Reads `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DEMO_PASSWORD`. For each demo shop: create the owner with the Admin API if missing (`email_confirm: true`, `user_metadata.full_name`, `app_metadata.demo_shop = slug`), else update those fields and the password. Prints only `email: created|updated`. Safe to run many times.
9. **Supabase.** `supabase init`. `config.toml`: `site_url = "http://localhost:5173"`, additional redirect URLs for 5173 and 3000, `enable_confirmations = false` for email. One migration `supabase/migrations/<timestamp>_auth_profiles.sql`:
   - Lock down first: revoke default privileges on tables, sequences and functions in `public` from `anon` and `authenticated`, and execute on functions from `public`.
   - `create schema private` (no grants to `anon` or `authenticated`).
   - `public.profiles` (`id uuid primary key references auth.users on delete cascade`, `full_name text check (char_length(full_name) between 1 and 80)`, `created_at timestamptz not null default now()`), RLS on, `grant select, update (full_name) to authenticated`, policies: a user selects and updates only `id = (select auth.uid())`.
   - `private.handle_new_user()` (`security definer`, `set search_path = ''`) inserts the profile from `raw_user_meta_data->>'full_name'` (fallback: the part of the email before `@`); trigger `after insert on auth.users`.
   - Do not run `pnpm db:push`. Stop and ask me (step 11).
10. **Env examples** (no real values): `apps/dashboard/.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_URL`, `VITE_SHOW_KIT`), `apps/storefront/.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), `apps/api/.env.example` (`PORT`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DEMO_PASSWORD`, `CORS_ORIGINS`).
11. **Stop for me.** Say: "Fill the three .env.local files, link the Supabase CLI, then say yes to push the migration." After my yes: run `pnpm db:push`, then `pnpm --filter @smartapp/api seed:demo`. Never open or print the `.env.local` files.
12. **Docs.** Fill the Installed table in `docs/components.md` (every file the CLI added, the block names, where used). Tick T01 in `docs/PROGRESS.md`, one line in `docs/CHANGELOG.md`.
13. **PR.** If `.github/pull_request_template.md` is missing, add it with sections Task, What changed, How to test, Components (installed, reused, hand-written), Checks, Founder must do by hand, Screenshots. `gh pr create --base main` with the template filled, screenshots at 390 and 1280 px of `/login`, `/signup`, `/` (dashboard), `/kit`, and the storefront. Print the PR link.

## Done when

1. `pnpm install`, `pnpm check` and `pnpm build` pass locally and in GitHub Actions.
2. Each of the 5 demo owners logs in at http://localhost:5173/login and sees only `dashboard`; `/logout` returns to `/login`; a wrong password shows an error.
3. Sign up with a new email lands on `dashboard`, and a row for that user exists in `public.profiles` (I check in the Supabase Table Editor).
4. http://localhost:3000 and http://localhost:3000/kanto-smash show only `storefront`; http://localhost:3000/no-such-shop shows a 404.
5. http://localhost:4000/health returns `{"ok":true,"app":"Smart App PH"}`.
6. `/kit` shows every installed component; the registry test passes; `/kit` is absent from a production build.
7. The lint-walls test proves `@supabase/supabase-js` imported in `apps/dashboard` fails lint.
8. 0 console errors on every page; PR open with screenshots and its link printed.

Finish with: PR link, what changed, how to test, what I must do by hand.
