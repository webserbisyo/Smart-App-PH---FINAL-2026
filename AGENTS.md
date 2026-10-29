# AGENTS.md: Smart App PH rules

Smart App PH gives each small Philippine shop (food or retail) an installable ordering app for customers (storefront) and a dashboard for the owner. Members and the stamp card are the main selling point.

Read `docs/blueprints/foundation.md` once. For a screen task also read `docs/ux.md`; for data or API work also read `docs/api.md`. Read other docs only when the prompt names them.

## Now

Frontend first with mock data. The database has only auth (profiles) and demo owner accounts. Screens get data from `@smartapp/data` hooks, which use mock adapters until an area is wired to the API.

## Shape

- pnpm + Turborepo, Node 24, TypeScript strict. Packages `@smartapp/*`.
- `apps/storefront` Next.js (App Router) · `apps/dashboard` Vite + React + TanStack Router/Query · `apps/api` NestJS.
- `packages/core` Zod schemas, types, money, words, error codes, demo fixtures (no React, no Supabase) · `packages/ui` tokens, the one `globals.css` and installed components · `packages/data` API client (calls NestJS only), mock adapters, Query hooks.
- `supabase/migrations` SQL only.

## Commands

`pnpm install` · `pnpm dev` (storefront :3000, dashboard :5173, api :4000) · `pnpm check` (typecheck, lint, test) · `pnpm format` · `pnpm build` · `pnpm db:push` (only the founder runs it) · `pnpm db:types` · `pnpm --filter @smartapp/api seed:demo`. No Nest CLI (its generators need a newer Node 24 than 24.14).

## Hard rules

1. **Components:** use the planned library components. Install anything missing with the shadcn CLI, which is an exact root devDependency (`pnpm exec shadcn add ...`; registries `@reui`, `@diceui`, `@magicui`). If you hand-write a component instead, stop and tell the founder why before continuing. Do not rewrite installed component files; wrap or compose them.
2. **Registry:** every install or new reuse updates `docs/components.md` in the same commit. Every installed component gets a section on `/kit`.
3. **Mock data:** only in `packages/data/src/mocks` and `packages/core/src/demo`, typed by the Zod schemas in `packages/core`. Screens never import mocks directly. Mock and API adapters follow `docs/api.md` exactly.
4. **Imports:** apps never import each other; only `apps/api` imports `@supabase/*`; `packages/core` imports no React, `@smartapp/ui` or `@smartapp/data`; `packages/ui` does not import `@smartapp/data`; dashboard features never import each other (shared code goes in `apps/dashboard/src/app/`). Never weaken `eslint.config.js` to pass.
5. **Types:** no `any`, no `as` casts, no `@ts-ignore` or `@ts-expect-error`. Closed lists are `as const` arrays plus a Zod enum, mirrored by a database CHECK (no Postgres enums).
6. **Look:** Tailwind token classes only (`docs/design-tokens.md`). No arbitrary values (`p-[13px]`), no hex, no raw palette classes (`bg-red-500`), no inline `style` except CSS variables set through the typed `cssVars()` helper (shop colours, progress). No CSS modules or extra CSS files: the only stylesheet is `packages/ui/src/styles/globals.css`. Lucide icons only; status = icon + word + colour.
7. **Words and numbers:** our visible text in `packages/core/src/words.ts` (dynamic text as functions). Plain English with local words where natural (Suki, Members); short verb buttons; an error says what to do next; never "Coming soon". Money in integer centavos; Manila time for display; never compare the shop type in code. Screens word errors from their `code`, never from the message text.
8. **Database:** only new files in `supabase/migrations/`, with RLS, grants and policies in the same file. Never edit an applied migration. Trusted functions are `security definer` with `set search_path = ''`. Never change the database through a dashboard, SQL editor or MCP. Never run `pnpm db:push`: stop and ask the founder to run it. Types are regenerated on a machine with Docker, or copied from the CI diff when a migration changes.
9. **Secrets:** never read, print or commit `.env*` files or keys. Only `.env.example` is committed. Each app checks its env with Zod at start.
10. **Packages:** exact versions (no `^`), and no release younger than 7 days unless it is a security fix. pnpm settings live in `pnpm-workspace.yaml` (`minimumReleaseAge`, `allowBuilds`, `catalog`); `.npmrc` settings are ignored. No new package without the founder's yes, except what the shadcn CLI adds with a planned component.
11. **Git:** branch `ag/t<nn>-<name>` from the latest `main`. Never push to `main`, never merge, never force-push. Always open the PR yourself (`gh pr create --base main`) and print its link.
12. **Security:** one login error for every failed login (never say which part was wrong). Another shop's pages show Not found, never "forbidden". Every API route has `@Public()` or `@Can()`; the shop comes from `tenant_members`, never from the URL or body. No customer data in logs.
13. **Backend:** browser → NestJS → Postgres for everything, login included (decision T34). No Supabase calls from apps, no edge functions, pg_net, pg_cron, Realtime or rule-carrying triggers.

## Every task

1. Post a short plan (files and steps) and wait for OK.
2. Do only that task. Stop and ask when something has no clear place, or when two docs disagree (never pick one silently).
3. Before the PR: `pnpm check` and `pnpm build` green; open each changed page, 0 console errors and 0 React warnings; screenshots at 390 and 1280 px in the PR.
4. Tick one line in `docs/PROGRESS.md`, add one line to `docs/CHANGELOG.md`, record approved decisions in `docs/decisions.md`.
5. Finish with: PR link, what changed, how to test, what the founder must do by hand.

## UX bar (every screen)

Follow `docs/ux.md` (responsive plan, phone feel, states, accessibility). In short: loading skeleton, empty with one action, error with Try again, offline, closed shop, long text, big amounts. 360 to 1280 px with no sideways scroll; touch targets 44 px; inputs 16 px text. Motion under 400 ms and off for `prefers-reduced-motion`. Check with a food shop and a retail shop.

## If a command fails

Check the current official docs, use the closest correct equivalent, and say what changed.
