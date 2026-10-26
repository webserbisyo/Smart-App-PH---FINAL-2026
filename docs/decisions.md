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
- T21 sharp is a tooling-only dev dependency for the demo image script.
- T22 Security overrides in pnpm-workspace.yaml: fast-uri pinned to 3.1.9 (GHSA-xhq7-xmqj-769h, GHSA-333x-w4r6-6crp), body-parser to 2.4.0 (GHSA-27r3-jxmh-p828), multer to 2.5.0 (GHSA-q7qp-rjg7-q26m), and zod bumped to 4.6.6 in catalog (GHSA-mrhx-c7xc-m3w5). fast-uri@3.1.9 is temporarily in minimumReleaseAgeExclude as a security exception (remove after 2026-10-26).
- T23 Database types: db:types uses --local so committed types match CI verification against migrations. Types are regenerated on a machine with Docker, or copied from the CI diff when a migration changes.
- T24 Storefront library parts install into packages/ui; registry examples (c-*) live only in the dashboard /kit (dev only) and are never imported by an app screen. (Planned as T22 in the T02 prompt; T22 and T23 were already used.)
- T25 Approved packages for the storefront kit: embla-carousel-react, embla-carousel-autoplay, input-otp, qrcode, canvas-confetti, motion (Rewards only), @base-ui/utils, @diceui/checkbox-group; type packages @types/qrcode and @types/canvas-confetti are devDependencies. (Planned as T23.)
- T26 Dev-only mock scenario switch (?mock, ?as, ?now) never ships in a production build; the CI scan fails on "setMockScenario" or "mock-scenario" in the storefront build. (Planned as T24; T24 and T25 are taken by the open T02 PR.)
- T27 Installed library files (`packages/ui/src/components`) get their own strictness: ESLint turns off only `consistent-type-assertions`, the React Compiler rules `react-hooks/refs`, `react-hooks/set-state-in-effect`, `react-hooks/immutability` and `react-hooks/preserve-manual-memoization` (the last two for the DiceUI Cropper, founder 2026-10-26), and `no-useless-assignment` for those files; TypeScript checks them in `packages/ui/tsconfig.components.json` without `exactOptionalPropertyTypes`, and apps read them as declarations through project references. Our own code (lib, hooks, compositions, vendor copies, apps, packages) keeps the full strict rules. Installed files stay unedited, except `checkbox-group.tsx`: one patch back to DiceUI's own `asChild` on the tick, because the shadcn base-nova transform rewrote it to `render`, which `@diceui/checkbox-group` 1.0.0 does not support (founder, 2026-10-25).
- T28 ReUI primitives keep our tokens: the CLI's raw-palette CSS variables for `success`, `warning`, `info`, `destructive-foreground` and `invert` are not added. New contrast-tested tokens `focus`, `invert`, `destructive-text`, `destructive-soft` and `destructive-soft-foreground` fill the gaps. `reui/badge.tsx` and `reui/alert.tsx` are patched once: solid variants use our `-foreground`, light variants `-soft` / `-soft-foreground`, outline variants `-text`, alerts `-soft` with a `-text` icon (founder, 2026-10-25).
- T29 The ReUI examples may install shadcn `bubble` (c-message-5) and `scroll-area` (c-scrollspy-1, c-scrollspy-2), reversing the T02 skip for these two. `popover` stays skipped: c-input-group-37 is kept without its popover (founder, 2026-10-25).
- T30 Playwright smoke tests (`@playwright/test` 1.64.1, exact, tooling dev dependency) run in CI on every PR at phone 390 and desktop 1280 and fail on console errors, sideways scroll and broken images. `pnpm e2e` (not part of `pnpm check`); demo shop pages run on the production build, test shops and `?mock=` scenarios on a dev server, because a production build never has them (N28, T26). Locally on macOS 12 use `PLAYWRIGHT_CHANNEL=chrome`. (Planned as T25 in the T04 prompt; T25 to T29 were taken.)
- T31 Storefront first-load JS budget raised to 300 KB gzipped (measured 286.6 KB in T04). Follow-up before launch: core schemas to zod/mini and lazy toast, target about 250 KB (founder, 2026-10-25).
- T32 One Serwist service worker for the whole storefront (scope `/`, built by the `/serwist/[path]` route, prerendered with `use cache` because Cache Components has no `dynamic` segment config); each shop has its own manifest at `/<slug>/manifest.webmanifest` (scope `/<slug>/`, id `/<slug>`, theme and background in the shop's page colour, like the theme-color meta) so it installs as its own app. Caching: Next static files, Fluent icons and art precached (no shop photos up front); photos CacheFirst 200 entries 30 days; Home, Menu, My orders and Rewards NetworkFirst with a 3 s timeout (T13 prompt; this replaces the stale-while-revalidate wording in T6, since stock and prices are fetched fresh anyway); checkout, receipts, join, account, proofs, API, auth and token links NetworkOnly; any other page that can't load shows `/~offline`. A new version waits for the customer's Refresh tap. Off in `next dev` unless `SERWIST_DEV=1`.
- T33 Packages for T32 (founder, 2026-10-26: "Yes, install Serwist"): `@serwist/turbopack` and `serwist` 9.5.13 and `esbuild` 0.28.2, exact storefront dev dependencies. esbuild is 0.28.2, not the 0.25.12 first listed, because Vite 8's optional peer wants 0.27 or 0.28 (0.25 gave an unmet peer); Serwist accepts both.

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
- N18 Sidebar menus use gap-1 between items (base-nova default is gap-0).
- N19 Dashboard rail is 60px (as built in T05).
- N20 Demo images live in apps/storefront/public/demo/<slug>/{items,banners,brand}, named <name>-<width>.<ext>, AVIF and WebP (products 640/320, banners 1600/800), read through imageUrl() in core; Halo Dessert Bar is MVP B only.
- N21 Category icons are Fluent Emoji Flat SVGs (MIT) in apps/storefront/public/icons/fluent, keys in core.
- N22 Every image spot uses ShopImage: photo, else a shop-coloured tile with a Fluent icon, else initials.
- N23 Banner carousel: first slide static, carousel code after it, owner sets seconds (default 5), pauses on touch, hover, focus and off-screen, no autoplay under reduced motion, no carousel code for one banner.
- N24 Opensource UI Add to Cart, Thermal Receipt and Like Toggle (kit only) are vendored copies in packages/ui/src/vendor.
- N25 Delivery fees by straight-line km rows plus named zones; no map, no Maps API in A (S27, S28).
- N26 Availability is Available, Sold out today or Sold out; no stock counts in A (S18, S19).
- N27 Stamp card status Off, On or Paused; limited prizes stop at 0; max earned stamps per day/week/month, default 1 per day (S23, S24, S26).
- N28 Shop packs are the one source for mocks, tests, the dev seed and "Start with samples"; test-blank and test-stress exist only in mock and test runs.
- N29 Mock state for customer-created data (orders, proofs, member account) lives on the device; DEMO_RECEIPTS give fixed tokens for every receipt state (/<slug>/o/demo-…).
- N30 Storefront phone nav is one floating pill (Home, Menu or Products, Rewards, Orders) that grows a cart segment; no separate basket bar; no bell.
- N31 The location bar sits under the shop name on phones and opens the How and where sheet.
- N32 The receipt PNG is made on the server with next/og; no screenshot package.
- N33 Proof photos are compressed on the phone by a small canvas helper; no compression package.
- N34 The stamp card on Rewards and Join uses the member colour; confetti fires once per reward on each phone (remembered there), never under reduced motion; the welcome stamp presses in once on the Join done screen.
- N35 Join is name, mobile and email, then a 6-digit email code (resend after 60 s, the code lasts 10 minutes, no passwords). Mobile is asked at join because `joinAsMember` in `api.md` takes it (the T12 prompt had email only). A wrong code clears the boxes.
- N36 The install card shows after joining or after the first order (receipt), never on a first visit; Chrome gets its Install button, iPhone Safari gets the 3 Share steps, other browsers nothing; Hide this keeps it away 30 days per shop. Order updates (Notify me) ask for permission only on the tap; iPhone shows "Add to home screen first" in Safari.
- N37 Each shop has its own privacy notice at `/<slug>/privacy` (English with a Filipino summary): the shop collects the data and Smart App PH runs the app for them (RA 10173). Requests go to the shop's contact rows; no request form in A. The text is a plain-words draft, checked before the first paying shop.
- N38 Contract additions for My orders and Rewards (`api.md`): order rows carry up to 3 item photos, the payment method, the pay-by time and the stars; the member account carries `joinedAt` and the prize `claims`.
- S7 The order thread shows the proof and system lines (status, payment, rider, tracking); no chat posts in A.
- S8 Continue in Messenger copies the order text first, then opens m.me in the same tap; the text has no address or phone.
- S15 QR Ph is a payment method (the shop's QR), text only, no brand logos.
- S16 One prep time per shop (default 20 min) drives ASAP and the first pickup slot.
- S29 A cancelled paid order shows "Cancelled · Refunded ₱x · Reason"; payment status refunded.
- S30 The receipt is kept on the phone for offline viewing ("Last updated 3:42 PM").
- S31 Proof upload is compressed on the phone and retries by itself on slow data; the pay countdown keeps running.
- S32 COD has a per-shop limit; above it the order needs payment first (cod_limit).
- S33 Code problems: "Wrong code, try again", expired code sends a new one, resend after 60 s, check Spam or Promotions.
- S34 A stamp is pending until the order is completed ("Pending · Order #042").

## Storefront redesign (founder, 2026-10-25: "Yes to all" on D1 to D17; built without ReUI Pro)

- R1 No sticky basket column at 1280 px; the basket opens from the cart button on every width (`ux.md` updated).
- R2 Each shop has a surface, light or dark (`as const` list + Zod, mock data only for now). Kanto Smash is dark: 60 black, 30 white, 10 red.
- R3 Light shops get a neutral near-white 60, not a tint of the brand colour.
- R4 Logo status ring: green and animated when open (c-avatar-33 look), plain grey when closed, never red; the word sits on a chip next to it.
- R5 The cart leaves the dock: its own round button with a count dot; the dock keeps 4 places.
- R6 The dock takes the Aceternity Floating Dock look on our installed dock, not its code (no `@tabler/icons-react`).
- R7 About, Hours and Contact leave Home and go into one Shop info sheet.
- R8 Menu on ReUI Scrollspy: one horizontal rail on phones for any number of categories, a vertical list from 1024 px.
- R9 Free parts installed for the redesign: ReUI avatars, tabs, icon stacks and shop patterns, shadcn button-group, DiceUI avatar-group and marquee, Magic UI CSS-only parts. ReUI Pro blocks (receipt-2, checkout-6 and the like) are not bought; their look is built from the free parts.
- R10 Pictures for empty, error and receipt states are Fluent Emoji 3D (MIT) WebP files in `apps/storefront/public/art`, made once by `pnpm --filter tooling art`; keys in core (`ART_KEYS`, `artPath`). No Storyset (needs a credit).
- R11 Default customer avatars: about 24 DiceBear notionists SVGs made once by `pnpm --filter tooling avatars` (`@dicebear/core` and `@dicebear/notionists` 9.4.3, tooling dev dependencies, never shipped to customers; notionists only instead of the whole collection).
- R12 New shared compositions for the redesign (empty-state, shop info sheet, cart button, status ring and the others listed in `components.md` with R12) live in `packages/ui/src/compositions` (T24).
- R13 The one-line announcement slot stays for owner news; no fixed late-night sentence for Kanto.
- R14 No notification bell (N14 stays).
- R15 `motion` stays Rewards-only (T25); every new part is CSS-only to stay under the 300 KB budget (T31).
- R16 Two PRs on branch `claude/project-thread-jornrn`: PR 1 (shell, theme, Home, Menu, basket, checkout, receipt) replaces #16; PR 2 is T11 to T14.
- R17 Light testing for these two PRs: `pnpm check`, `pnpm build` and CI, with screenshots only of `/kit`. This replaces the "screenshots of every changed page" step in `AGENTS.md` for PR 1 and PR 2 only.
- R18 ShopTheme maps the shop palette onto `--primary`, `--ring` and the other base tokens, so every installed part follows the shop colour without edits to each example (kit item K10).
- R20 Storefront dock (founder, 2026-10-26, "Sliding pill, CSS only"): equal tabs with icon and label always shown, one shop-colour pill that slides behind the active tab by CSS transform (300 ms, soft settle), a small icon pop, nothing animated under reduced motion. No tab active (Account, Join, Privacy) fades the pill out and leaves no gap. Replaces the growing icon and label capsule. No `motion` (R15 stands). No library part fits: Magic UI Dock is a hover magnifier, Base UI Tabs would announce page links as tabs, Animate UI is not one of our libraries.
- R21 The logo shows the open state by its glowing ring alone; the word chip stays for Busy and Closed, where colour alone would be the only cue (founder, 2026-10-26). Changes R4.
- R19 The dashboard top bar shows shadcn's small divider between the sidebar button and the page title (founder, 2026-10-26: "Yes, show the line"); it appeared once the `data-horizontal` and `data-vertical` variants were defined for every Separator and Tabs.

## Storefront polish round 2 (founder, 2026-10-26: "yes to all" on P1 to P21, pushed straight to `main` at the founder's request)

- R22 (P1) The customer account stays mock data until the Phase 4 members area has a database. Demo: `?as=member` (or `member-ready`) on any shop, with a richer demo member (orders, addresses, every chat state).
- R23 (P2) Member picture: 36 DiceBear faces in three styles, Sketch (notionists, the default faces), Soft (lorelei) and Bright (micah), 12 each, made once by `pnpm --filter tooling avatars` (`@dicebear/lorelei` and `@dicebear/micah` 9.4.3, tooling dev dependencies only). Micah is CC BY 4.0, so the privacy notice credits it with a licence link; notionists and lorelei are CC0. Glyphs left out.
- R24 (P3) "Use my photo": the DiceUI Cropper fits the photo in a circle (drag, pinch, zoom buttons), then a 256 px WebP is kept on the phone (`customerAvatar` device entry, about 20 KB). The picture shows on Account and the top bar. Demo only until R22's database.
- R25 (P4) Rewards before a shop has a stamp card: "Be a Suki of <shop>" and Join free for guests, "You're in" for members; it never promises stamps. Art: Storyset "Gift" (Rafiki) recoloured green, one SVG in `apps/storefront/public/art`, with "Illustration by Storyset" linking to storyset.com right under it (its licence). An exception to R10 for this one picture. Dev demo: `?mock=nocard`.
- R26 (P5) Shop info lists Monday to Sunday with today marked, breaks on two lines and closures by date; the address gets a Copy button.
- R27 (P6) Desktop item dialog in two columns: photo, badges, description and pairings left; a small sticky name and price, the choices and the Add bar right.
- R28 (P7) Multi-choice add-ons get a square checkbox with the whole row as the label.
- R29 (P8) One badge per product card (Sold out, Best seller, New) with an icon; the menu gets Best sellers and New lists beside Favourites (`?show=best|new`).
- R30 (P9) The receipt header is a ticket: icon rows (type, placed, ready about, method and total, address) and a tear line.
- R31 (P10) Progress track with a check for done steps, a pulsing dot for now, and "Ready about" from the prep time.
- R32 (P11) Place order shows a printer (Fluent "Printer") feeding the order slip (Thermal Receipt) for at least 1.6 s, an exception to the 400 ms motion limit for this one moment; Skip opens the receipt at once; an error is a paper jam with Try again; offline says so. The receipt opens from the cache with no skeleton.
- R33 (P12) Proof of payment: pick a photo, see it made smaller on the phone ("4.2 MB to 310 KB · WebP") with Remove, then Send proof. WebP only, no AVIF.
- R34 (P13) Order updates as a chat (Message, Bubble, Marker): the customer's proofs on the right with the photo sent from this phone, the shop's replies on the left with its logo, status changes as markers. Demo orders cover every chat state; the demo owner panel can accept or reject a proof. Free-text chat stays MVP B (S7).
- R35 (P14) Toasts wear the ReUI Sonner looks on the installed Base UI toast, in semantic colours (green, red, amber, blue), not shop colours; no `sonner` package. "View basket" is a real action.
- R36 (P15) Toasts drop in at the top centre on desktop and sit above the dock on phones.
- R37 (P16) Every storefront badge uses the ReUI Badge.
- R38 (P17) Motion: Number Ticker, loaded lazily, counts up the members pill (R15 becomes "motion only where loaded lazily"). The receipt total does not count up: the ticker's spring takes about 4 s to land on the exact peso, too long for money. The pay timer is a DiceUI Circular Progress ring that empties. Magic UI Progressive Blur softens the item dialog choices where they scroll under the Add bar, and the Magic UI Pulsating Button (ripple only, three pulses per visit) is Join free on Rewards before a stamp card. All off under reduced motion.
- R39 (P18) Desktop nav gets the dock's icons; the icon buttons (saved items, basket, account) get the installed Tooltip.
- R40 (P19) The "1 Issue" Next dev badge could not be reproduced on the current code: 0 issues and 0 console errors on 16 pages and a full click-through order at 390 and 1280 px. If it comes back, open it and send the message.
- R41 (P20) Home banners: dots under the banner with the active one filling like a timer, a 12 px gap with the next slide peeking in on phones, hover arrows from 768 px, Pause and Play, a slow 104% zoom on the active slide. Nothing moves under reduced motion; the timer stops off-screen, on hover and on focus.
- R42 (P21) A banner may have a title (up to 40), a description (up to 90) and a button to an item, a category or Rewards, shown bottom-left over a scrim (new `scrim` and `on-scrim` tokens). Phones use 16:9. Demo banners mix text and photo-only.

## Storefront round 3 (audit "Storefront audit and round 3 plan", founder 2026-10-26)

- R43 Every text field on a phone is 16 px or more, or iPhone zooms the page on tap: the item note box (`text-sm`) and both quantity boxes (14 px, inherited from the sheet) were fixed, and an e2e test fails if any visible field on Menu with the item open, Checkout, Join or an order page is under 16 px at 390 px. Copy buttons turn green for 1.5 s with a check that pops in and draws itself (`draw-check`, shared `DrawnCheckIcon`), and say "Copied" to screen readers.
- R44 Bug fixes from the audit: Save receipt image fetches the picture first and never hands over an error as a file (it was saving "Order not found" as receipt-NN.png.txt and leaving the installed app with no way back); phones get the share sheet, computers a download, and a failure says "Try again, or take a screenshot". Copy details and Share give a toast, since the menu closes on tap. The receipt picture takes its words from words.ts and its colours from the shop's palette on paper (light surface), with a brand-colour band. Scrolling sheets pin Save flush to the bottom (the body drops its bottom padding when it holds a ResponsiveDialogFooter; the footer no longer adds the safe area twice). Payment rows on the order page are a list, not a definition list, and the label on the shop-colour row is full colour (contrast). Banner dots sit in 24 px buttons so taps never hit the next dot. `robots.txt` is served (it fell through to the shop route). An unknown shop keeps answering 200 with a noindex Not found page: a true 404 under Partial Prerendering would need a request-time proxy, not worth it while Google already skips the page.
- R45 The dock shows on an order's page, with Orders lit, so there is always a way back to the shop; the dev-only order panel sits in the page flow instead of floating. Placing an order replaces checkout in the history, so back from the receipt goes to the page before checkout, never to a spent checkout.
- R46 Pull to refresh is hand-written (none of ReUI, DiceUI or Magic UI has one; Ionic's `ion-refresher` needs the whole framework) and copies Ionic's iPhone behaviour: pull past a line at the top, a ring that fills as you pull (our installed progress ring) and an arrow that turns once letting go would refresh, the ring spins while the shop's data reloads, then the page glides back; a sideways first move never starts it (carousels, chip rows). On Home, the menu, Rewards, Orders and an order's page, on touch screens, in the browser too (it replaces the browser's full reload with a quick one). Under reduced motion the page stays put and the ring only fades in (founder chose this on 2026-10-26).
- R47 Next keeps loading the next pages' code in the background (about 158 KB on Home); the installed app goes back to decision T6 (open the saved copy at once and refresh in the background) instead of T32's 3 s network wait, and shop data refreshes when the customer comes back to the app. The demo shops' hours change so at least four of five are open from 9 AM to 9 PM; `?mock=closed` still shows the closed look (founder, 2026-10-26).
- R48 The order steps on the receipt are a vertical list (ReUI timeline, c-timeline-3 look) instead of the horizontal stepper (founder: "vertical, more mature, with icons"): each step has its own icon (placed, payment, kitchen or packing, ready, on the way, done), a check once done, the step happening now in the shop colour with a soft pulse, and its time on the right. The location pill's spoken name now starts with the words it shows.

## Open

- Price: ₱599 or ₱799 per month.
