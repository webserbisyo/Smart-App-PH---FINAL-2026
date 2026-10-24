<!-- prettier-ignore-start -->
Task T09: Checkout (How, Who, Pay) and delivery location without a map

Read first: AGENTS.md, docs/ux.md, docs/components.md, docs/prompts/ref/storefront-rules.md sections 2 and 4, docs/prompts/ref/storefront-components.md section 3 (How and where, Checkout), docs/SMART_APP_PH_BLUEPRINT.md sections 6.1, 6.2, 6.3 and 7.7.

FOUNDER DECISIONS USED (change before running)
 - Location (S27, S28): "Use my location" (GPS only on tap), "Fix pin in Google Maps" (open Google Maps, paste the shared link back), or a named zone; typed rider details; fee by straight-line km rows, else zone, else "Too far". No map, no Maps API, no geocoding.
 - Payments: text only for GCash, Maya, Bank and QR Ph (no brand logos); the shop's QR picture is shown for QR Ph and GCash when set (demo accounts are labelled "Sample").
 - COD limit (S32): above it, only transfers with "Orders above ₱3,000 need payment first".
 - Mobile field: DiceUI mask-input with the custom pattern ####-###-#### and core normalisePhPhone (the built-in US phone mask is not used).

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

GOAL
A customer places a correct order in under a minute on a phone, with the fee known before Place order and every disabled button saying why.

0. BEFORE YOU CODE
 - Branch ag/t09-checkout from the latest main (after T08). Node 24.14.0. Post a short plan and wait for my OK. Never touch dashboard shell styling.

1. HOW AND WHERE SHEET: DELIVERY (extends T04, features/location)
 - Delivery tab adds, in one sheet: "Use my location" (c-button-44 pattern: idle → locating → done/denied; geolocation only after the tap; denied → c-alert-8 pattern "Location is off. Paste a Google Maps link or pick your area." with role status); "Fix pin in Google Maps" (opens https://www.google.com/maps/search/?api=1&query=<lat>,<lng> in a new tab when a spot exists, otherwise the shop area) + a paste field (c-input-group-10 pattern with a Paste button; valid → c-input-group-24 pattern check; invalid or short link → c-input-group-3 pattern with "Paste the full link from Google Maps"; resolved through useResolveMapsLink); zone list (c-radio-group-8) for customers who share no location.
 - Rider details (c-field-2 pattern): address line (required), house no. / floor (optional badge c-input-18 pattern), landmark (required mark c-input-13 pattern, "beside the sari-sari store"). Remembered with useLastAddress.
 - Result line (c-item-1 pattern, tabular): "2.4 km · ₱49 · 30 to 45 min" or zone fee; too far → c-alert-7 pattern "Too far for delivery (8.2 km, this shop delivers up to 5 km)" + "Switch to pickup".

2. CHECKOUT PAGE /[shop]/checkout (features/checkout; dynamic, never cached; one column max 640 px at every width; no dock)
 - Back (c-button-49 pattern) to the menu. Collapsed order summary at the top (c-collapsible-1 pattern: "5 items · ₱345" opens the lines).
 - How: the current order type and place with Change (opens the sheet); pickup ASAP ("Ready in about 20 min") or a slot; closed shop: slots only.
 - Who: name (c-input-2 pattern; up to 60 chars, no lower max), mobile (DiceUI mask-input, inputmode numeric, accepts 0917…, 917…, +63…), email optional (prefilled for members), "Remember me on this phone" (c-checkbox-5 pattern, on by default; off clears the draft). autocomplete attributes on all three.
 - Pay: methods the type allows (c-radio-group-9 pattern cards, text and a lucide icon; "Recommended" badge c-radio-group-15 pattern on the shop's first transfer method). COD only for delivery and under the limit (over → disabled + c-alert-7 pattern message). Transfer selected → account name and number with Copy (c-button-41 pattern), shop QR picture if any, "Send exactly ₱345" with Copy, and "Upload your proof on the next page".
 - Reward switch (members with a ready reward; c-switch-2 pattern): "Use my reward: free Classic Smash"; free item sold out today → off with "Free item sold out today. Your reward is saved."
 - Order note (c-textarea-6 pattern, 300): placeholder "Notes for the shop, or who will receive the order".
 - Totals (c-separator-6 pattern): subtotal, reward discount, delivery fee, total.
 - Consent line: "By placing this order you agree to the shop's privacy notice" (link to /privacy once T14 exists; plain text until then).
 - Place order (c-button-9 pattern large + c-button-44 states inside DiceUI pending, no auto-reset): quote right before placing; offline → disabled "You're offline. Your basket is saved."; closed without scheduling → disabled with the opening time; any quote problem → disabled "Fix 1 item in your basket" with a link back. Double tap is safe (clientKey). Success → clear the basket, save the guest token, go to /[shop]/o/<token>. Errors from their code (rate_limited "Finish or cancel your other order first", pickup_time_invalid refreshes slots, out_of_range, cod_limit).
 - The basket drawer's main button becomes "Checkout · ₱345" (or "Schedule for 5:20 AM").
 - Loading: c-skeleton-4 pattern. Keyboard-only use works start to finish; errors are linked with aria-describedby; focus moves to the first error.

3. TESTS
 - Unit: mobile normalising cases; payment method visibility table (type × COD limit × allowed methods).
 - e2e: walk-in cash (kanto-smash), pickup GCash at a slot (kape-juan), delivery COD under limit (kanto-smash zone), COD over ₱3,000 blocked, delivery by pasted full Maps link inside 3 km (fee ₱49) and outside (Too far), lola-remy closed → scheduled slot, offline → Place order disabled with reason, double click places one order, keyboard-only checkout.

4. DOCS
 - components.md "Used in". Tick T09 in PROGRESS.md, one CHANGELOG line.

DONE WHEN
 - The 3 order types and every payment method can be placed in the mock at 360, 390, 768, 1024 and 1280 px; a walk-in cash order takes under a minute on a phone from Home; every disabled Place order says why.

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint, pnpm build and pnpm e2e green. Never weaken eslint or tsconfig, never skip a test. No workarounds: stop and show me any error.
 - Screenshots at 390 and 1280: checkout delivery, pickup, COD blocked, too far, closed scheduled. gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test, what I must do by hand.

OUT OF SCOPE: the receipt (T10), saved places, in-app map, recipient fields, coupons, online payment.
<!-- prettier-ignore-end -->
