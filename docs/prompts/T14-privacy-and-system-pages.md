<!-- prettier-ignore-start -->
Task T14: Privacy notice, system pages and the final storefront check

Read first: AGENTS.md, docs/ux.md, docs/components.md, docs/prompts/ref/storefront-rules.md sections 6 and 7, docs/prompts/ref/storefront-components.md section 3 (Shop info, privacy, system), docs/SMART_APP_PH_BLUEPRINT.md sections 7.11, 7.12 and 16.1, docs/SYSTEM.md section 10, docs/RESEARCH.md (Data privacy).

FOUNDER DECISIONS USED (change before running)
 - One privacy notice per shop at /[shop]/privacy: the shop is the one collecting the data, Smart App PH runs the app for them (Data Privacy Act of 2012, RA 10173). English in full, with a short Filipino summary box at the top. Text is a plain-words draft; I will have it checked before the first paying shop (say this in the PR).
 - The notice lists exactly what A collects: name, mobile, optional email, delivery address and landmark, order details, payment proof photos (deleted after the order ends, by a later job), stamp history, and what stays only on the phone (basket, favourites, saved receipts). No selling of data, no ads trackers.
 - Who sees it: only this shop (and Smart App PH only to run the app). Deletion and other requests in A: by contacting the shop (its Messenger and phone rows); no request form.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

GOAL
Every link in the storefront leads somewhere finished: a clear privacy notice a customer can read in a minute, and calm, branded pages for not found, suspended, errors and offline. Then one last pass proves the whole storefront at phone and desktop size.

0. BEFORE YOU CODE
 - Branch ag/t14-privacy-system from the latest main (after T13). Node 24.14.0. Post a short plan and wait for my OK. Never touch dashboard shell styling.

1. PRIVACY /[shop]/privacy (features/legal; static per shop, cached)
 - Filipino summary box (c-alert-5 pattern): 4 short lines ("Ginagamit lang namin ang pangalan, numero at address mo para sa order mo." …).
 - Sections with headings and anchor links: Who we are (shop name, address; "This app is run for <shop> by Smart App PH"), What we collect, Why, What stays on your phone, How long we keep it, Who sees it (only this shop; Smart App PH only to run the app), Your rights under the Data Privacy Act (access, correct, delete; ask the shop), Contact (the shop's contact rows), Last updated date (Manila).
 - Words live in words.ts (both languages), with the shop name filled in; no shop-type checks.
 - Wire the links left as plain text before: Home footer (T06), checkout consent (T09), join consent and the Account privacy link (T12). On join and on Place order the mock records a privacy consent (channel privacy, as in the consents table).

2. SYSTEM PAGES
 - Not found (T04) checked again for both levels: unknown shop and unknown page inside a shop (inside a shop it keeps the shop's colours and a link to its Menu).
 - Suspended or pending shop: c-empty-7 pattern "This shop isn't taking orders here right now" + no links to the shop's menu; status 404 for robots (noindex) but a friendly page.
 - Errors: [shop]/error.tsx and global-error.tsx with c-empty-2 pattern "Something went wrong" + Try again (reset) + Back to the shop; no stack traces or ids shown; logs a single console.error in dev only.
 - Offline page (T13) and closed-shop states (T06, T08) checked again with the shop colours.
 - All system pages: words from words.ts, light theme, 360 px safe, keyboard focus on the heading.

3. FINAL STOREFRONT CHECK (no new features)
 - routes.ts covers every storefront route and every DEMO_RECEIPTS token for all 5 demo shops + test-blank + test-stress; the smoke test passes at phone and desktop.
 - Clear samples (T03b clearSamples) on kanto-smash, then walk Home, Menu, Basket, Checkout, Rewards and Orders: every image and section shows its designed placeholder or empty state (ShopImage tile, brand panel, empty states); paste screenshots.
 - Lighthouse mobile by hand (Chrome DevTools) on /kanto-smash, /kanto-smash/menu, /tala-apparel/menu, /kanto-smash/checkout, a receipt and /kanto-smash/rewards: write the Performance, Accessibility, Best Practices and SEO scores and CLS in a table in docs/PROGRESS.md under T14. Targets: Performance ≥ 90 (Home, Menu), Accessibility 100, CLS < 0.1. Anything below target → fix it in this task if small, otherwise list it and stop.
 - Build route table: first-load JS per storefront route pasted in the PR; Home ≤ 300 KB gzipped.
 - CI build scan still blocks demo owner emails, /kit, localhost, setMockScenario, mock-scenario and Demo owner in the storefront production build.
 - QA: fill the storefront rows of docs/SMART_APP_PH_BLUEPRINT.md 16.1 that the mock can prove (360 to 1280, Android Chrome and iPhone Safari by hand where you can; leave the rest blank and say so).
 - Words check: no visible text outside words.ts (search the storefront for string literals in JSX and list any left).

4. TESTS
 - e2e: privacy page for every demo shop (shop name present, Filipino box present, links from footer, checkout and join reach it); suspended shop page; error boundary through ?mock=error on a page that throws; unknown page inside a shop keeps the shop colours.

5. DOCS
 - components.md "Used in". docs/decisions.md: N37 Each shop has its own privacy notice (English with a Filipino summary); the shop collects the data and Smart App PH runs the app for them. Tick T14 in PROGRESS.md (with the Lighthouse table), one CHANGELOG line. README tracker: storefront frontend with mock data done.

DONE WHEN
 - No dead links or "coming soon" anywhere in the storefront; privacy, not found, suspended, error and offline pages look finished at 360, 390, 768, 1024 and 1280 px; the Lighthouse table is filled and meets the targets or lists what's left; the sample-free walk-through looks finished.

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint, pnpm build and pnpm e2e green. Never weaken eslint or tsconfig, never skip a test. No workarounds: stop and show me any error.
 - Screenshots at 390 and 1280: privacy (kanto-smash), suspended, error, not found inside a shop, and the sample-free walk-through. gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test, what I must do by hand (including: get the privacy text checked before the first paying shop).

OUT OF SCOPE: terms of service, cookie banner (no trackers in A), proof deletion job (API task), owner privacy settings, new storefront features.
<!-- prettier-ignore-end -->
