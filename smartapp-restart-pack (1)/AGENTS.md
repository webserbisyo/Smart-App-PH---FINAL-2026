# AGENTS.md: Smart App PH rules

Smart App PH gives each small Philippine shop (food or retail) an installable ordering app for customers (storefront) and a dashboard for the owner. Members and the stamp card are the main selling point.

Read `docs/blueprints/foundation.md` once. Read other docs only when the prompt names them.

## Now

Frontend first with mock data. The database has only auth (profiles) and demo owner accounts. Screens get data from `@smartapp/data` hooks, which use mock adapters until an area is wired to the API.

## Shape

- pnpm + Turborepo, Node 24, TypeScript strict. Packages `@smartapp/*`.
- `apps/storefront` Next.js (App Router) · `apps/dashboard` Vite + React + TanStack Router/Query · `apps/api` NestJS.
- `packages/core` Zod schemas, types, money, words, demo fixtures (no React, no Supabase) · `packages/ui` tokens and installed components · `packages/data` auth client, API client, mock adapters, Query hooks.
- `supabase/migrations` SQL only.

## Commands

`pnpm install` · `pnpm dev` (storefront :3000, dashboard :5173, api :4000) · `pnpm check` (typecheck, lint, test) · `pnpm build` · `pnpm db:push` (founder's yes first) · `pnpm --filter @smartapp/api seed:demo`

## Hard rules

1. **Components:** use the planned library components. Install anything missing with the shadcn CLI (`pnpm dlx shadcn@latest add ...`; registries `@reui`, `@diceui`, `@magicui`). If you hand-write a component instead, stop and tell the founder why before continuing. Do not rewrite installed component files; wrap or compose them.
2. **Registry:** every install or new reuse updates `docs/components.md` in the same commit. Every installed component gets a section on `/kit`.
3. **Mock data:** only in `packages/data/src/mocks` and `packages/core/src/demo`, typed by the Zod schemas in `packages/core`. Screens never import mocks directly.
4. **Imports:** apps never import each other; only `packages/data` and `apps/api` import `@supabase/*`; dashboard features never import each other. Never weaken `eslint.config.js` to pass.
5. **Types:** no `any`, no `as` casts to silence errors, no `@ts-ignore`.
6. **Look:** colours only from tokens (`docs/design-tokens.md`), no hex in components; lucide icons only; status = icon + word + colour.
7. **Words and numbers:** our visible text in `packages/core/src/words.ts`; money in integer centavos; Manila time for display; never compare the shop type in code.
8. **Database:** only new files in `supabase/migrations/`, with RLS, grants and policies in the same file. Never edit an applied migration. Never change the database through a dashboard, SQL editor or MCP. Run `pnpm db:push` only after the founder says yes.
9. **Secrets:** never read, print or commit `.env*` files or keys. Only `.env.example` is committed.
10. **Packages:** exact versions (no `^`). No new package without the founder's yes, except what the shadcn CLI adds with a planned component.
11. **Git:** branch `ag/t<nn>-<name>` from the latest `main`. Never push to `main`, never merge, never force-push. Always open the PR yourself (`gh pr create --base main`) and print its link.

## Every task

1. Post a short plan (files and steps) and wait for OK.
2. Do only that task. Stop and ask when something has no clear place.
3. Before the PR: `pnpm check` and `pnpm build` green; open each changed page, 0 console errors; screenshots at 390 and 1280 px in the PR.
4. Tick one line in `docs/PROGRESS.md`, add one line to `docs/CHANGELOG.md`, record approved decisions in `docs/decisions.md`.
5. Finish with: PR link, what changed, how to test, what the founder must do by hand.

## UX bar (every screen)

Loading skeleton, empty with one action, error with Try again, offline. 360 to 1280 px with no sideways scroll; touch targets 44 px; inputs 16 px text. Motion under 400 ms and off for `prefers-reduced-motion`. Check with a food shop and a retail shop.

## If a command fails

Check the current official docs, use the closest correct equivalent, and say what changed.
