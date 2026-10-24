<!-- prettier-ignore-start -->
Task T08: Basket with flagged lines, closed shop, offline and stamp progress

Read first: AGENTS.md, docs/ux.md, docs/components.md, docs/prompts/ref/storefront-rules.md sections 4 and 6, docs/prompts/ref/storefront-components.md section 3 (Basket), docs/SMART_APP_PH_BLUEPRINT.md sections 5.3, 6.2, 6.3, 7.6 and 8.2.

FOUNDER DECISIONS USED (change before running)
 - Totals use the c-separator-6 pattern (rows wrap; no table), so ₱12,345.50 never widens anything at 360 px.
 - Clear basket sits in a More menu (c-dropdown-menu-16 pattern) with a confirm (c-alert-dialog-2 pattern).
 - The basket never blocks browsing; problems are shown per line and left out of the total.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

GOAL
The basket always tells the truth: what will be charged, what can't be ordered and why, and when the shop can take the order, without losing anything the customer picked.

0. BEFORE YOU CODE
 - Branch ag/t08-basket from the latest main (after T07). Node 24.14.0. Post a short plan and wait for my OK. Never touch dashboard shell styling.

1. BASKET (extends the T04 drawer and desktop column; features/basket)
 - Quote on open and on every change (useQuote, debounced); keep the last good quote while refreshing (no flicker).
 - Flagged lines from quote.problems: sold out / sold out today, price changed ("Price changed from ₱149 to ₱159"), option gone, item hidden: the line shows the reason (warning tone, icon + text), is excluded from the total, and offers Remove (and "Choose again" that opens the item sheet when options changed).
 - Goes well with: up to 3 items not already in the basket, small cards with "+".
 - Stamp progress (stamp card On only): "This order earns 1 stamp" or "Spend ₱70 more to earn a stamp" or "You already earned today's stamp" (core earnsStamp); member colour, not the shop colour.
 - Header: "Your basket" + item count + More menu (Clear basket → confirm "Remove all 5 items?").
 - Totals: subtotal; delivery fee or "Delivery fee at checkout" when no place is chosen; total (tabular, 700 weight).
 - A version reset (T03b notice) shows one line: "Your basket was reset after an update."

2. CLOSED, BUSY, PAUSED AND OFFLINE (blueprint 8.2 table)
 - Closed with takeOrdersWhileClosed and next opening today or tomorrow: warning alert "Closed now · Opens 5:00 AM. Your basket is saved." and the main button reads "Schedule for 5:20 AM" (T09 wires the button; here the message and state).
 - Closed without scheduling, or opens later than tomorrow: "Opens Tue 10:00 AM. Your basket is saved."; main action off with that reason.
 - Busy: slots after the pause only. Paused indefinitely: "Not taking orders right now".
 - Offline: "You're offline. Your basket is saved."; quote shows "Prices as last seen" and refreshes on reconnect.

3. STATES
 - Empty (c-empty-11 pattern, Browse menu). Loading quote: lines stay, totals show a small skeleton. Quote error: lines stay, "Couldn't check prices. Try again." Long names clamp to 2 lines. 20 lines (test-stress) scroll inside the drawer with the footer fixed.

4. TESTS
 - Unit: problem → message mapping; closed-state decision table (open, closed with/without scheduling, busy, paused, offline).
 - e2e: add Kanto items, mark one sold out through the mock (?mock scenario or a test helper) → flagged and excluded; lola-remy at 04:30 → "Closed now · Opens 5:00 AM"; offline (context.setOffline) → message and prices as last seen; Clear basket with confirm; desktop 1280 shows the sticky column.

5. DOCS
 - components.md "Used in". Tick T08 in PROGRESS.md, one CHANGELOG line.

DONE WHEN
 - Every row of blueprint 8.2 is visible with a demo shop and ?now / ?mock, at 390 and 1280 px; totals never include a flagged line; nothing in the basket is lost by closing, reloading or going offline.

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint, pnpm build and pnpm e2e green. Never weaken eslint or tsconfig, never skip a test. No workarounds: stop and show me any error.
 - Screenshots at 390 and 1280: normal, flagged line, closed with scheduling, offline, empty. gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test, what I must do by hand.

OUT OF SCOPE: the checkout page and its button (T09), synced baskets (MVP B).
<!-- prettier-ignore-end -->
