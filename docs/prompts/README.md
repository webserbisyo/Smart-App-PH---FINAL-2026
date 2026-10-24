<!-- prettier-ignore-start -->
# Storefront prompts (MVP A, mock data first)

One prompt = one task = one branch `ag/t<nn>-<name>` = one PR into main. Paste them into Antigravity in the order below. Each prompt makes the agent post a plan and wait for your OK before it codes.

## Before the first prompt
1. Put this folder in the repo as `docs/prompts/` (the prompts) and `docs/prompts/ref/` (4 reference files the prompts point to). I can open that PR for you.
2. Read the "FOUNDER DECISIONS USED (change before running)" box at the top of each prompt. Change anything you disagree with before you paste it.
3. T02a runs on your Mac (it needs the images in `.github/assets`). Everything else can run anywhere.

## Run order
| # | File | What you get | Batch |
| --- | --- | --- | --- |
| 1 | T02a-demo-assets.md | The 105 demo images identified, renamed, resized to AVIF + WebP and moved per shop; 50 Fluent icons; one image helper. Stops once for you to confirm the image list. | alone (your Mac) |
| 2 | T02-components-tokens-placeholders.md | Library parts installed in packages/ui, the carousel with autoplay, shop colours from one brand colour, motion rules, and the placeholders (ShopImage, logo, brand panel) that keep every screen finished without photos. | paste 2 and 3 back to back |
| 3 | T02b-kit-examples.md | All 119 ReUI examples on the dashboard /kit page, on our colours and demo photos, grouped by storefront screen. | with 2 |
| 4 | T03a-shop-packs-and-rules.md | Zod shapes, the 5 demo shop packs + test-blank + test-stress, and the rules (money, hours, options, delivery fee, stamps, phone numbers). | alone |
| 5 | T03b-mock-store-adapters-hooks.md | The mock back end on the phone, data hooks, demo receipts in every state, and the dev switch (?mock=, ?as=, ?now=). | alone |
| 6 | T04-storefront-shell.md | Top bar, location bar, pill dock with cart segment, basket drawer, toasts, offline banner, and the Playwright phone + desktop smoke tests in CI. | alone |
| 7 | T06-shop-home.md | Home with the banner carousel and all 12 sections. | paste 7 and 8 back to back |
| 8 | T07-menu-and-item-sheet.md | Menu or Products, item sheet (sizes, colours, add-ons with min/max, note), favourites. | with 7 |
| 9 | T08-basket.md | Flagged lines, closed, busy, paused and offline basket, stamp progress. | alone |
| 10 | T09-checkout-and-location.md | Delivery location without a map, checkout (How, Who, Pay), Place order. | alone |
| 11 | T10-receipt.md | Receipt, pay countdown, proof upload with retry, order thread, Messenger, save PNG, rating, dev "Demo owner" panel. | alone |
| 12 | T11-my-orders.md | Active and past orders, Order again. | paste 12 and 13 back to back |
| 13 | T12-rewards-and-account.md | Join with email code, stamp card, rewards (limited, paused), history, member QR, account. | with 12 |
| 14 | T13-install-as-app.md | Installable per shop (Serwist), offline page, splash, install card, push for order status. | alone |
| 15 | T14-privacy-and-system-pages.md | Privacy notice per shop, system pages, and the final check of the whole storefront. | alone |

"Back to back" means paste the second prompt only after the first PR is merged; they are small and touch different folders. T05 (dashboard shell) is already merged, so there is no T05 here.

## Reference files (docs/prompts/ref/)
- `demo-images.md`: answer key for the 105 images (which shop and item each should be, output names).
- `demo-menus.md`: Demo Shop Assets v1.2 menus, add-ons, brand colours and the rewards table.
- `storefront-rules.md`: Storefront Blueprint v1.4 rules in short form (S1 to S36). Agents read this, not the Google Doc.
- `storefront-components.md`: all 179 parts with install commands, which screen uses which part, our compositions and the 52 icon keys.

## Components: 179 parts
34 shadcn primitives + 8 ReUI primitives + 119 ReUI examples + 12 DiceUI + 3 Magic UI + 3 Opensource UI, plus 50 Fluent Emoji Flat icon files (52 keys). Every prompt carries this line word for word: "Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing."

## Decisions the prompts use (my picks; change in the boxes)
- D1 ReUI examples live on the dashboard /kit page, not in packages/ui (keeps storefront CSS small; CI already blocks /kit from builds).
- D2 Example colours are mapped to our tokens and photos replaced with our demo images; eslint is never loosened.
- D3 Banner carousel: ReUI carousel with dots + autoplay, owner sets the seconds (default 5), pauses on touch, hover, focus and off-screen, off under reduced motion, no carousel code for one banner.
- D4 Opensource UI Add to Cart and Thermal Receipt in the app; Like Toggle only on /kit.
- D5 Fluent Emoji Flat SVGs for category icons (MIT, no package).
- D6 Our compositions (dock with cart, stamp grid, pay countdown, OTP resend, Messenger hand-off, proof uploader) are built only from library parts.
- D7 Proof photos compressed with a small canvas helper; no compression package.
- D8 New packages (all checked for licence and Node 24.14): embla-carousel-react, embla-carousel-autoplay, @diceui/checkbox-group, input-otp, qrcode, canvas-confetti, motion, @base-ui/utils, dev-only sharp and @playwright/test, and @serwist/turbopack in T13.
- D9 Lighthouse by hand in Chrome DevTools; no Lighthouse CI tool.
- D10 Order status = ReUI timestamped stepper (c-stepper-26).
- D11 GCash, Maya, Bank and QR Ph as text only (no brand logos); no coupons in A.
- D12 Halo-halo images parked (Halo Dessert Bar is MVP B).
- D13 Add-on min/max with DiceUI checkbox-group.
- D14 Totals as rows (no table), order type as radio cards, search with a clear button, DiceUI rating.

## Testing environment (same data everywhere)
- One source of sample data: the 5 shop packs + test-blank + test-stress in packages/core/src/demo. Local dev, unit tests, Playwright, the future dev database seed and the live "Start with samples" all read the same packs. "Clear samples" leaves exactly the test-blank look.
- Unit tests (Vitest) for every rule and the mock store, with a fixed seed and date.
- Smoke tests (Playwright, from T04) open every storefront route at phone 390 and desktop 1280 for food, retail, blank and stress shops and fail on console errors, sideways scroll and broken images. Each later task adds its routes. Runs in CI on every PR.
- Dev switch (never in a production build): `?mock=slow|error|empty|offline|closed|basket`, `?as=guest|member|member-ready|member-pending|member-capped`, `?now=2026-10-24T04:30+08:00`. Demo receipts open by fixed tokens, e.g. `/kanto-smash/o/demo-proof-rejected`. Mock email code: 123456.
- Lighthouse by hand on the pages each prompt names; targets Performance ≥ 90, Accessibility 100, CLS < 0.1, first page ≤ 200 KB JS.

## Placeholders and empty states
- Every image goes through ShopImage: photo, else a tile in the shop colour with the category's Fluent icon, else initials. Logos fall back to initials; no banner shows the brand panel.
- Customers never see empty sections or "coming soon"; empty lists have a designed empty state with one action. Owner-side "Add a banner" spots come later with the Editor.

## New decision numbers each prompt adds (no clashes)
T02a: N20, N21, T21 · T02: N22 to N24, T22, T23 · T03a: N25 to N28 · T03b: N29, T24 · T04: N30, N31, T25 · T10: N32, N33 · T12: N34, N35 · T13: N36, T26 · T14: N37. If main already uses a number, the agent takes the next free one and says so.

## Rules every prompt repeats
Plan first and wait for OK · branch from the latest main · Node 24.14.0 · never touch the dashboard sidebar or shell styling · no new package without your yes · never read or print .env files or keys · never touch the database (only you run `pnpm db:push`) · pnpm format:check, check, lint, build and e2e green · no workarounds, stop and show the error · screenshots at 390 and 1280 · `gh pr create --base main` and print the link.
<!-- prettier-ignore-end -->
