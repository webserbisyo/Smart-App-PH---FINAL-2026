<!-- prettier-ignore-start -->
Task T04: Storefront shell (top bar, location bar, pill dock with cart, basket drawer) and the phone + desktop smoke tests

Read first: AGENTS.md, docs/ux.md, docs/design-tokens.md, docs/components.md, docs/prompts/ref/storefront-rules.md sections 1, 2, 4 and 7, docs/prompts/ref/storefront-components.md section 3 (Shell, How and where), docs/SMART_APP_PH_BLUEPRINT.md sections 4.1, 4.2 and 7.1.

FOUNDER DECISIONS USED (change before running)
 - One floating pill dock: Home, Menu or Products, Rewards (hidden when the stamp card is Off), Orders. With items in the basket it grows a cart segment (up to 3 stacked thumbnails, count, ₱ total). No separate basket bar. Hidden on the item sheet, checkout, receipt and while the keyboard is open.
 - Top bar: logo, name, open state, location bar ("📍 Delivery to Marikina · ₱49 ▾"), avatar or Join. No bell. One shop per storefront, never a marketplace.
 - D8: @playwright/test 1.64.1 (exact) as a dev dependency of tooling for smoke tests. If its Chromium won't run on the founder's Mac (macOS 12), the tests still run in CI (Ubuntu); say so and continue.
 - The How and where sheet ships here with order type, pickup time and named zones; T09 adds Use my location, Fix pin in Google Maps, distance fees and rider details to the same sheet.
 - The basket drawer ships here with lines, quantity, remove and total; T08 adds flagged lines, closed and offline states, Goes well with, stamp progress and the More menu; T09 adds the Checkout button.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

GOAL
A customer opening any demo shop link on a phone sees a fast, branded app frame that remembers how they order, and every later screen plugs into it. A test opens every page at phone and desktop size and fails on any console error.

0. BEFORE YOU CODE
 - Branch ag/t04-storefront-shell from the latest main (after T03b). Node 24.14.0. Post a short plan (files, components, routes) and wait for my OK.
 - Never change the dashboard sidebar, rail, top bar or dock styling; bottom-dock.tsx stays as it is (the storefront dock is its own composition reusing dockSlotClass).

1. ROUTES AND LAYOUT (apps/storefront/src/app)
 - `/`: short platform page (what Smart App PH is, one link for owners to app.webserbisyo.com). Static.
 - `/[shop]/layout.tsx` (server): getStorefrontForServer(slug) → notFound() for unknown, pending or suspended. Wraps children in ShopTheme (T02). Metadata per shop: title "<Shop name>", description = tagline, theme-color = shop-10, icons and apple-touch-icon from brand/, Open Graph image brand/og.jpg, robots noindex for test shops. generateStaticParams = the 5 demo shops (test shops only outside production).
 - `/[shop]/page.tsx` (Home): for now a simple real page (tagline, about, today's hours) with installed components; T06 builds the full Home. Never "Coming soon".
 - Not found page: c-empty-7 pattern, words from words.ts, link back to the platform page.
 - Storefront viewport and body follow docs/ux.md section 2 (viewport-fit=cover, 100dvh, no tap flash, 16 px inputs). Light mode only.
 - Feature folders: apps/storefront/src/features/{shell,location,basket}/components.

2. TOP BAR (features/shell)
 - Phone: row 1 = ShopLogo (32 px), shop name (1 line, ellipsis), avatar or "Join" (44 px target); row 2 = location bar. Open state as DiceUI status + text ("Open until 9 PM", "Closed · Opens 5 AM", "Busy · back 3:40 PM") from core openState. Sticky, pt-safe.
 - Desktop (1024+): one row: logo, name, open state, nav links (Home, Menu or Products, Rewards, Orders), location bar, basket button with count, avatar. Content max 1120 px.
 - Skip to content (DiceUI skip-nav). Back on sub-pages with the c-button-49 pattern.

3. LOCATION BAR + HOW AND WHERE SHEET (features/location)
 - Bar: the c-button-19 pattern (pill, MapPin icon, chevron), max width with ellipsis: "Walk-in", "Pickup · ASAP", "Pickup · Today 3:30 PM", "Delivery · Concepcion Uno · ₱40", "Choose how you'll order" when nothing is set. Remembered per shop (useOrderType, useLastAddress).
 - Sheet through responsive-dialog (drawer on phone, dialog on desktop): order type with the c-radio-group-7 pattern (only types allowed now, each with one line of detail: "Ready in about 20 min", "₱40 to ₱80 · 30 to 45 min"); pickup ASAP or later (c-radio-group-3) with slots in a native select (c-native-select-2) grouped Today / Tomorrow from core pickupSlots; delivery: zone list (c-radio-group-8) with fee and ETA. Closed shop: only next-opening slots, with the reason. Save closes the sheet and updates the bar.

4. STOREFRONT DOCK (packages/ui/src/compositions/storefront-dock.tsx, router-agnostic like bottom-dock)
 - Props: items: NavItem[] (max 4), cart: { count, totalLabel, thumbs: ImageSources[], link } | null. Reuses dockSlotClass, dock tokens, pb-dock spacing; 56 px targets; aria-current on the active tab.
 - Cart segment (c-avatar-11 pattern with square thumbnails 32 px, + count badge c-badge-19, ₱ total tabular): grows in with a width transition (instant under reduced motion). With a long total (₱12,345.50) it shows 2 thumbnails, then 1, then none, and never wraps or overflows at 360 px.
 - Read the basket through DiceUI client-only with a fallback of "no cart segment", so the server HTML never mismatches.
 - Hidden on /checkout, /o/*, while an item sheet is open, and with keyboard-open. Tablet keeps the dock; desktop has no dock (top nav + basket button).
 - /kit section with 0, 1, 3 and 9 items and a ₱12,345.50 total.

5. BASKET DRAWER (features/basket)
 - Opens from the cart segment (phone) and the basket button (desktop: right drawer 1024–1279 with the c-drawer-2 pattern; a sticky 360 px column from 1280 px on Menu and Home).
 - Lines with the c-item-2 pattern: ShopImage 48 px, name, variant and options summary, note, quantity (c-number-field-2 pattern, Hitbox), remove (c-button-24 pattern + Undo toast through notify()), line total. Total with the c-separator-6 pattern. Empty: c-empty-11 pattern "Your basket is empty" + Browse menu.
 - No checkout button yet (T09 adds it); no "Coming soon" text.

6. TOASTS AND OFFLINE
 - notify() helper in packages/ui wraps the shadcn Base UI toast: bottom centre above the dock on phones, bottom right on desktop; success 3 s, errors stay; at most one action; z-index above the dock.
 - Offline banner: DiceUI banner, role status, "You're offline. Showing your saved menu." Sticky under the top bar; useOnline from @smartapp/data.

7. SMOKE TESTS (tooling/e2e, Playwright)
 - playwright.config.ts: projects phone (390 × 844, touch) and desktop (1280 × 800); webServer = `pnpm --filter @smartapp/storefront start` after build; baseURL localhost:3000.
 - smoke.spec.ts: for kanto-smash, tala-apparel, test-blank and test-stress, open every storefront route that exists (today: /, /<slug>, an unknown slug → Not found) and fail on: any console error or React warning, a failed request for an image or script, horizontal scroll (scrollWidth > clientWidth), a broken image (naturalWidth 0). Later tasks add their routes to the same list (one array in routes.ts).
 - Scenario checks with ?mock=: offline banner shows; closed shop shows the closed state; ?mock=basket (3 demo lines, dev only) shows the cart segment and the basket drawer.
 - Root script `pnpm e2e` (not part of pnpm check). CI: a new job "e2e" after build that installs Chromium with `pnpm exec playwright install --with-deps chromium` and runs pnpm e2e; it is required to pass.
 - Unit tests: storefront-dock (segment only with items, thumbnail count by width, aria-current), location bar text for each order type, basket merge and remove with Undo.

8. DOCS
 - docs/components.md rows (storefront-dock, notify, every pattern now "Used in" the shell). docs/ux.md storefront column: dock with cart segment replaces "Cart bar floats above the tabs". docs/decisions.md: N30 Storefront phone nav is one floating pill (Home, Menu or Products, Rewards, Orders) that grows a cart segment; no separate basket bar; no bell. N31 The location bar sits under the shop name on phones and opens the How and where sheet. T25 Playwright smoke tests run in CI on every PR (phone 390 and desktop 1280) and fail on console errors, sideways scroll and broken images.
 - Tick T04 in PROGRESS.md, one CHANGELOG line.

DONE WHEN
 - Every demo shop opens with its colours, logo (or initials), open state and location bar at 360, 390, 768, 1024 and 1280 px; test-blank still looks finished; test-stress long name and big total never break the bar or dock.
 - Order type and zone survive a reload; basket lines survive a reload; the dock hides with the keyboard.
 - pnpm e2e green locally or in CI; Home first-load JS for /kanto-smash ≤ 300 KB gzipped (paste the build route table).

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint, pnpm build and pnpm e2e green. Never weaken eslint or tsconfig, never skip or quarantine a test. No workarounds: stop and show me any error.
 - Screenshots at 390 and 1280 for kanto-smash and tala-apparel (closed shop: lola-remy with ?now=...T04:30+08:00). gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test, what I must do by hand.

OUT OF SCOPE: Home sections (T06), menu and item sheet (T07), basket extras (T08), checkout and delivery location (T09), PWA (T13), dashboard changes.
<!-- prettier-ignore-end -->
