<!-- prettier-ignore-start -->
Task T07: Menu or Products page, item sheet (variants, add-ons, notes) and favourites

Read first: AGENTS.md, docs/ux.md, docs/design-tokens.md, docs/components.md, docs/prompts/ref/storefront-rules.md section 3, docs/prompts/ref/storefront-components.md section 3 (Menu, Item sheet), docs/SMART_APP_PH_BLUEPRINT.md sections 5.2, 6.4, 7.3, 7.5, 8.1 and 8.3.

FOUNDER DECISIONS USED (change before running)
 - D13: add-on groups with min/max use DiceUI checkbox-group (Base UI build) with c-checkbox-11 rows; disabling unticked rows at the max is our code.
 - D4: the Add button is the vendored Opensource UI Add to Cart (packages/ui/src/vendor), wrapped in DiceUI pending; the heart is c-toggle-9 (Like Toggle stays on /kit only).
 - Search keeps only the search icon and clear button of c-input-group-37 (its status popover is dropped).
 - Favourites are on the phone only (N3).

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

GOAL
A customer finds an item in seconds, understands every choice and its price, and can't add an incomplete item, on a food shop and a retail shop alike.

0. BEFORE YOU CODE
 - Branch ag/t07-menu-item from the latest main (after T06). Node 24.14.0. Post a short plan and wait for my OK. Never touch dashboard shell styling.

1. MENU PAGE /[shop]/menu (features/menu)
 - Title from vocab (Menu or Products). URL state: ?q=, ?cat=, ?fav=1, ?item= (typed parsing in one helper; no new package).
 - Sticky header under the top bar: search (c-input-group-37 pattern: search icon, clear button that appears once typing, loading spinner like c-input-group-15 while filtering), then category chips (c-scrollspy-2 pattern inside DiceUI scroller; history off; tapping scrolls to the section, scrolling highlights the chip). Favourites chip first (c-toggle-6 pattern) only when there are favourites.
 - Desktop 1024+: category rail on the left (c-scrollspy-1 pattern), 3 columns at 1024, 4 at 1280 (with the basket column from T04 at 1280 the grid is 3).
 - Phone: 2-column grid of cards (c-card-7 pattern: ShopImage 1:1 with c-aspect-ratio-3, name 2 lines, price or "from ₱149", badges, heart, "+"). Retail and food look the same; words come from vocab.
 - Badges: Sold out today / Sold out (c-badge-14 pattern + greyed card, "+" disabled with the reason), New and Best seller (c-badge-13 pattern; check contrast with the shop colour), Sample (c-badge-7 pattern) only in preview mode, never for customers.
 - "+" (c-button-11 pattern inside Hitbox, aria-label "Add Classic Smash"): adds at once when one variant and no required groups (toast "Added · View basket"); otherwise opens the item sheet.
 - Empty search: c-empty-2 pattern "No match for 'xyz'" + Clear. No products at all (test-blank, or after Clear samples): c-empty-15 pattern "Nothing on the menu yet" (no action for customers). Loading: c-skeleton-7 pattern. Error: Try again.

2. ITEM SHEET (?item=<id>; features/menu/item-sheet)
 - Phone: bottom drawer (c-drawer-1 pattern: one scroll area, sticky footer). Desktop: dialog with sticky footer (c-dialog-3 pattern). Dock hidden while open. Closing returns to the same scroll position. Unknown or hidden id → sheet doesn't open and a toast says "This item isn't available".
 - Top: photos (carousel like c-carousel-11, no autoplay; one photo = plain image; none = ShopImage placeholder with the category icon), name, description, price ("from ₱149" until a variant is chosen), heart.
 - Variants: food single axis with prices → radio rows (c-radio-group-17 pattern: name + price delta); retail axes → chips per axis (c-toggle-group-4 pattern, controlled, ignore an empty value); impossible or sold-out combinations greyed with "Not available"; choosing a colour with a photo shows that photo first.
 - Add-on groups in owner order, each with a header (c-radio-group-6 pattern) and a rule pill (c-checkbox-19 pattern): "Required · Choose 1", "Optional · Up to 3", "Choose 2 to 4". max 1 → radio rows; otherwise DiceUI checkbox-group with c-checkbox-11 rows; at the max the unticked rows disable with "Up to 3". Options show "+₱40" or "Free"; sold-out options greyed. Defaults pre-selected.
 - Note: c-textarea-6 pattern, 120 characters with a counter, max height.
 - Goes well with: up to 4 items as small cards with their own "+" (quick add or open their own sheet).
 - Footer: quantity (c-number-field-3 pattern, 1 to 99, Hitbox, empty → 1) + Add to Cart showing the line total ("Add · ₱289"). Missing required pick: the button says what's missing ("Choose a patty"); tapping it scrolls to the first unfinished group and marks it invalid (c-radio-group-4 pattern). Offline: adding still works (basket is on the phone).
 - On Add: basket merges identical lines (lineIdentity), toast with "View basket", sheet closes, the dock's cart segment grows.
 - All rules from core validateLinePicks and linePrice; the sheet never computes prices itself.

3. FAVOURITES
 - Heart (c-toggle-9 pattern, aria-pressed, label "Save Classic Smash") on cards and the sheet; stored per shop with useFavourites; hidden or archived items drop out silently; the Home favourites row (T06) and ?fav=1 filter use the same list.

4. STATES AND EDGE CASES
 - Every option of a required group sold out → item shows "Not available today" and can't be added. Item with 30 variants (test-stress) stays usable. Names over 40 characters clamp on cards, show in full in the sheet. ₱12,345.50 fits in the footer at 360 px.
 - Closed shop: browsing and adding work; T08 handles checkout limits.

5. TESTS
 - Unit (features/menu): rule label text for each min/max combination; disabled-at-max logic; quick-add decision.
 - e2e (add routes to tooling/e2e/routes.ts): menu for all shops; open ?item= for Kanto Classic Smash (required patty) and Tala Basic Tee (2 axes, M · Sand sold out); Add is blocked until required picks are made; adding updates the dock count; reload keeps the basket; keyboard only: open an item, pick, add.

6. DOCS
 - components.md "Used in". Tick T07 in PROGRESS.md, one CHANGELOG line.

DONE WHEN
 - A food item with required + optional groups and a retail item with 2 axes can be added correctly at 360, 390, 768, 1024 and 1280 px; wrong picks are impossible; Lighthouse mobile on /kanto-smash/menu: Performance ≥ 90, Accessibility 100, CLS < 0.1.

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint, pnpm build and pnpm e2e green. Never weaken eslint or tsconfig, never skip a test. No workarounds: stop and show me any error.
 - Screenshots at 390 and 1280 (menu, item sheet food, item sheet retail, empty search, test-blank). gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test, what I must do by hand.

OUT OF SCOPE: basket extras (T08), checkout (T09), owner catalog editing, stock counts.
<!-- prettier-ignore-end -->
