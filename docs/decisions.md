# Decisions

Current decisions only. One line each; newest at the bottom of its section. Foundation decisions F1 to F10 are in `blueprints/foundation.md`.

## Product

- P1 Two shop kinds at launch: food and retail. Words differ by vocab (Menu or Products), never by `if` on the type.
- P2 Members and the stamp card are the main selling point; 1 welcome stamp on join.
- P3 Payments: cash, COD, GCash, Maya, bank with proof checked by the owner. Only GCash, Maya and bank orders expire unpaid.
- P4 Storefront is light mode only; dashboard has light and dark.
- P5 Demo shops: the 5 in `demo-shops.md`.
- P6 Status colours: amber means "it needs you" (table in `design-tokens.md`).
- P7 Payment proofs: at most 3 files, uploaded within 7 days, deleted after 30 days.
- P8 A guest order links to a member only by its order token or the same email, never by phone alone.
- P9 Screen text is plain English with local words where natural (Suki, Members); a short Filipino summary only on the privacy page.

## Tech

- T1 Supabase project "Smart App PH MVP FINAL" (Singapore) is the dev database and the only one until launch.
- T2 Sign-up email confirmation is off on the dev project until Resend SMTP is set up; on in production.
- T3 Demo owner password comes from the `DEMO_PASSWORD` env variable; never in the repo (public repo).
- T4 `turbo.json` sets `"agentGuidance": false` so Turborepo does not write into `AGENTS.md`.
- T5 TypeScript stays on 6.0.x until typescript-eslint and NestJS support 7.
- T6 One Next.js storefront, no separate Vite PWA (one codebase; shares cart, login and member card). Serwist makes it installable, precaches the app shell and caches shop pages (stale-while-revalidate): the installed app opens the saved copy instantly and refreshes menu, stock and open/closed in the background. Stock, prices and open/closed are always fetched fresh before checkout. Show "Add to home screen" after a customer joins or places a first order. Vite is only for the dashboard (behind login, no SEO needs). From general knowledge of both tools, not measured on our app. Never cached: receipts (`/o/*`), checkout, quotes, proof uploads, auth and API answers.
- T7 Node 24 everywhere. The founder's Mac (macOS 12.7.6) runs v24.14.0 although Node lists macOS 13.5 as the minimum; if a later 24.x stops starting there, stay on 24.14.0 locally or use Node 22.
- T8 CSS rules are enforced with ESLint's built-in `no-restricted-syntax` (no new package): no inline `style` except `cssVars()`, no arbitrary values, no hex in class names outside `packages/ui`.
- T9 Only the founder runs `pnpm db:push`, after merging the migration PR. Agents never write to a hosted database.
- T10 Errors carry a `code` from a closed list in core; screens word them with `errorWords(code)`.
- T11 Minimum browsers: Chrome 111, Safari 16.4 (Tailwind 4 and OKLCH).
- T12 `docs/api.md` is the contract for the mock adapters and the NestJS API.
- T13 pnpm 12 settings live in `pnpm-workspace.yaml` (no `.npmrc` settings): `minimumReleaseAge` 7 days, `allowBuilds` only for packages that need a build script, shared versions in `catalog:`. Node is pinned `.nvmrc` 24.14.0 and `engines` `>=24.14 <25`.
- T14 NestJS 12 without the Nest CLI (its generators need a newer Node 24 than 24.14). ESM, Express adapter, code adapter-neutral. Input checked by the built-in `StandardSchemaValidationPipe` with the shared Zod schemas, env by `@nestjs/config` with Zod, `/health` by Terminus, errors by one global filter. Tests on Vitest with `unplugin-swc` (no Jest).
- T15 Google sign-in is task T01b. T01 is email and password only, with no Google button.
- T16 Prettier with `prettier-plugin-tailwindcss` formats the repo; no git hooks for now.
- T17 Generated database types are committed in `packages/data`; CI regenerates them from the migrations on a local database and fails on any difference.
- T18 The PWA uses `@serwist/turbopack` (Next 16 builds with Turbopack; the webpack-based `@serwist/next` does not run there).
- T19 jsdom pinned to 29.x: 30.x needs Node 24.15+.
- T20 cn comes from the official cn package (catalog); lib/utils.ts re-exports it so ReUI and older items keep working.

## MVP A scope (accepted 2026-10-18; details in `SYSTEM.md` section 4.2 and `SMART_APP_PH_BLUEPRINT.md`)

- N1 A closed or paused shop keeps the cart; "Take orders while closed" (default on) offers next-opening slots today or tomorrow for pickup and delivery only; no new order status.
- N2 Offline: the cart and checkout details are kept; Place order waits for the connection and re-quotes. No background order sending (Safari and iOS have no Background Sync).
- N3 Favourites are stored on the phone only; synced favourites and carts are B (M13).
- N4 Up to 2 variant choices per item and 30 variants; add-on groups are a shared library with min and max picks (min 1 = required); "Goes well with" up to 4 items per item.
- N5 One stamp card per shop with one active reward: discount, free item or custom prize. Manual stamps ±1 need a reason, owner only, at most 3 per member per Manila day.
- N6 The member QR opens the member's page in the dashboard when scanned with the phone camera; no scanner in the app.
- N7 Editor: fixed sections edited in place on a live preview, Draft and Publish, sections on or off; no reorder, fonts or custom blocks in A.
- N8 Logo colour helper builds the 60/30/10 palette without an AI model; the AI brand assistant is B (M20).
- N9 Dashboard navigation: Home, Orders, Menu or Products, Members, Editor, Insights, Settings.
- N10 The owner gets a new-order email in A.
- N11 The receipt can be saved as an image (made on the server from the order with the Next.js built-in image response) or printed and saved as PDF; no new package.
- N12 Settings has Notifications and Plan sections.
- N13 The Editor opens full screen, outside the shell.
- N14 No bell in the MVP A top bar; Home's needs-you list does that job.
- N15 Phone dock: floating pill with 4 places and More; More opens a bottom drawer with tiles.
- N16 The dashboard shell starts from the shadcn sidebar-07 block; bottom-dock, nav-drawer and page-header are shared compositions in packages/ui, router-agnostic, reused by the storefront shell.
- N17 Overlays: Dialog on tablet and desktop, bottom Drawer on phone, through the responsive-dialog composition.

## Open

- Price: ₱599 or ₱799 per month.
