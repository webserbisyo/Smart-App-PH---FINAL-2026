<!-- prettier-ignore-start -->
Task T02b: The 119 ReUI storefront patterns on the dashboard /kit

Read first: AGENTS.md, docs/components.md, docs/design-tokens.md, docs/prompts/ref/storefront-components.md (sections 2 and 3).

FOUNDER DECISIONS USED (change before running)
 - D1: the ReUI c-* example files live only in apps/dashboard/src/features/kit/examples/ (dev-only /kit, already kept out of builds by CI). Storefront and dashboard screens never import them; they copy the pattern into their own feature component.
 - D2: while installing, map every raw colour, hex and arbitrary value in the examples to our tokens, and replace remote sample photos (Unsplash and similar) with our demo images through imageUrl(). No lint exceptions.
 - D10: c-stepper-26 is the receipt status pick; c-stepper-3 and c-timeline-3 stay on /kit as alternatives.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

GOAL
A visual catalogue of every storefront pattern, grouped by the screen that will use it and shown in each shop's colours, so every later screen task picks from what we can already see working.

0. BEFORE YOU CODE
 - Branch ag/t02b-kit-examples from the latest main (after T02). Node 24.14.0. Post a short plan and wait for my OK.
 - Never touch the dashboard sidebar, rail, top bar or dock styling.

1. DRY RUN
 - pnpm exec shadcn add @reui/c-stepper-26 -c apps/dashboard --dry-run. Expected: the example file under apps/dashboard/src/components/examples/, its primitives (stepper, button) resolved to packages/ui through the dashboard components.json "ui" alias, and nothing new in packages/ui that T02 didn't install except ReUI primitives (badge, alert, stepper, timeline, number-field, scrollspy, icon-tile, frame). Report what you see before the full install.

2. INSTALL (ref/storefront-components.md section 2, the 15 ReUI lines, all with -c apps/dashboard)
 - Answer No to every overwrite. New npm packages: only the approved ones from T02; anything else, stop and ask.
 - Move every example from apps/dashboard/src/components/examples/ to apps/dashboard/src/features/kit/examples/ (git mv; keep the c-* file names). Remove apps/dashboard/src/components if it ends up empty.
 - Each example exports `Pattern`; import with an alias (`import { Pattern as CarouselDots } from '../examples/c-carousel-11'`).
 - Fix the example files only for: token colours, our imageUrl() demo photos (with origin VITE_STOREFRONT_URL, so run the storefront next to the dashboard), our words where text is visible in the kit, and lint/type errors from sample code (no `any`, no casts). Keep their structure so they still match the ReUI page.
 - New ReUI primitives get a row in docs/components.md and a /kit section like every primitive (Library: ReUI).

3. /kit LAYOUT
 - New group "Storefront patterns" with one section per screen, in this order: Shell, How and where, Home, Menu, Item sheet, Basket, Checkout, Receipt, My orders, Rewards and account, Shop info and system pages (use the table in ref/storefront-components.md section 3).
 - Each pattern card: id (c-carousel-11), the ReUI name, a one-line "Used for" from the table, the live example inside ShopTheme, and a link to its ReUI page.
 - A shop switcher at the top of the group (5 demo shops) changes the ShopTheme and the demo photos.
 - The group lazy-loads per section (React.lazy) so /kit stays quick.

4. CHECKS IN CODE
 - tooling test: no file outside apps/dashboard/src/features/kit imports from features/kit/examples; nothing in apps/storefront or packages imports any c-* file.
 - The components registry test still passes (it covers packages/ui; examples are listed in components.md in a separate "Kit examples" table with id, used for, screen).

5. DOCS
 - docs/components.md: "Kit examples" table (119 rows: id, ReUI name, screen, used for).
 - Tick T02b in PROGRESS.md, one CHANGELOG line.

DONE WHEN
 - All 119 patterns render on /kit at 390 and 1280 px in at least kanto-smash and tala-apparel colours, with 0 console errors and 0 React warnings.
 - No raw palette class, hex or remote photo URL is left in features/kit/examples (lint and a grep in the PR prove it).

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint and pnpm build green; the CI scan still finds no /kit in the production build. Never weaken eslint or tsconfig, never skip a test. No workarounds: stop and show me any error.
 - Screenshots of each screen group at 390 and 1280 in the PR. gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test, what I must do by hand.

OUT OF SCOPE: storefront pages, mock data, any change to packages/ui component files, dashboard shell styling.
<!-- prettier-ignore-end -->
