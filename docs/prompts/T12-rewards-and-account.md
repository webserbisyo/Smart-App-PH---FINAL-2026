<!-- prettier-ignore-start -->
Task T12: Join with an email code, Rewards tab (stamp card, reward, history, member QR) and Account

Read first: AGENTS.md, docs/ux.md, docs/design-tokens.md (member colour, highlight), docs/components.md, docs/api.md (joinAsMember, getMyAccount, claimReward, error codes), docs/prompts/ref/storefront-rules.md section 6, docs/prompts/ref/demo-menus.md "Rewards and stamp rules", docs/prompts/ref/storefront-components.md sections 3 (Rewards + account) and 4 (stamp-grid, otp-resend), docs/SMART_APP_PH_BLUEPRINT.md sections 5.4, 6.8 to 6.11, 7.4, 7.10 and 8.4.

FOUNDER DECISIONS USED (change before running)
 - The stamp card is the main selling point: it uses the member colour (not the shop colour), the stamp-grid composition from T02 and the stamp-press motion recipe; confetti (Magic UI confetti) fires once per reward, never under reduced motion.
 - Join = name + email + 6-digit code (input-otp, c-input-otp-6 pattern); Resend after 60 s; code expires in 10 min; mock code 123456. No passwords, no Google sign-in for customers.
 - Limited prizes (S26) and the pause switch are in MVP A: "Only 100 pieces" → "23 left" at 20% or less → "All 100 claimed. Your stamps are safe." at 0. Paused: "Stamps paused. Your stamps are safe." and a ready reward can still be used.
 - Demo rules come from ref/demo-menus.md (Kanto 8 stamps = free Classic Smash; AquaLinis 10 = ₱100 off; Tala 5 = Kislap Limited Edition Tee, 100 pieces; Kapé Juan 10 = Suki Tumbler, 50 pieces; Lola Remy 10 = Ube Cheese Pandesal pack of 10). 1 welcome stamp; max 1 earned stamp per day.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

GOAL
Joining takes under 30 seconds on a phone, and a member always sees how many stamps they have, what they are getting, how close they are and what happened to every stamp.

0. BEFORE YOU CODE
 - Branch ag/t12-rewards-account from the latest main (after T11). Node 24.14.0. Post a short plan and wait for my OK. Never touch dashboard shell styling.

1. JOIN /[shop]/join (features/rewards; also opened as a sheet from Home, the receipt and the top bar "Join")
 - Step 1: what you get (the shop's reward in one line + "1 free stamp when you join"), name (c-input-2 pattern), email (c-input-group-5 pattern, inputmode email, autocomplete email), consent line with the privacy link (T14 route; plain text until it exists), Send code (c-button-44 states inside DiceUI pending).
 - Step 2: otp-resend composition: 6 boxes (c-input-otp-6 pattern, autocomplete one-time-code, paste fills all), "We sent a code to j***@example.com · Check Spam or Promotions", Resend disabled with a 60 s countdown, Change email. Errors: "Wrong code, try again" (boxes keep the digits, focus the first), expired → c-alert-8 pattern "This code expired. We sent a new one.", rate_limited → its message.
 - Done: welcome stamp lands with the stamp-press recipe, "Welcome, Juan! You have 1 stamp." → Rewards tab. A guest order still open is linked to the new member (mock: guest tokens on this phone).
 - Already a member on this phone → goes straight to Rewards.

2. REWARDS TAB /[shop]/rewards (dock tab; hidden when the card is Off)
 - Card Off by direct link: c-empty-7 pattern "This shop has no stamp card right now" + Back to the shop.
 - Guest: preview of the card (empty stamp-grid), the reward and the rule ("1 stamp per order of ₱250 or more · up to 1 a day") + Join.
 - Member, Card section (tabs c-tabs-2 pattern: Card / History / Member QR):
   - stamp-grid (c-frame-1 + grid-pattern + tiles c-icon-tile-6 empty, c-icon-tile-16 stamped with the shop's stamp icon, c-icon-tile-14 pending with c-spinner-3): N slots from the rule (5, 8 or 10); wraps to 5 per row; pending stamps show "Pending · Order #042".
   - Progress: DiceUI circular progress + Magic UI number-ticker for the count ("5 of 8"; the ticker only animates when the count changes since the last visit, plain number under reduced motion), "3 more to a free Classic Smash".
   - Reward card (c-card-16 pattern): reward photo (ShopImage; prize image from the pack), name, type line ("Free item", "₱100 off", "Prize"). Ready → highlight token, "Your reward is ready", confetti once (remembered per reward id). Free item / discount: "Use it at checkout" (the T09 switch). Custom prize: Claim (c-button-44 states) → claim code + QR (DiceUI qr-code) "Show this at the counter"; one per customer.
   - Limited prize badge (c-badge-17 pattern): "Only 100 pieces" / "23 left" / all claimed alert. Two claims for the last piece: the loser sees "All 100 claimed. Your stamps are safe." (reward_all_claimed).
   - Paused (c-alert-7 pattern): "Stamps paused. Your stamps are safe." No new stamps; a ready reward still works.
   - Daily cap: "You already earned today's stamp" line when capped (?as=member-capped).
 - History (c-timeline-7 pattern): welcome, pending (order no.), earned (order no.), redeemed, reversed, "Given by the shop" / "Removed by the shop" with the reason category only; newest first; dates in Manila time; 20 at a time with Show more. Empty: "Your stamps will show here".
 - Member QR (c-card-1 pattern + DiceUI qr-code): member code for the counter (walk-in stamps), member name and since date, brightness hint "Turn up your screen brightness".
 - Loading: c-skeleton-9 pattern sized to the card. Error: Try again. Offline: last-seen card with "Last updated".

3. ACCOUNT /[shop]/account (top bar avatar; c-avatar-16 member chip, c-avatar-35 pattern menu: Rewards, My orders, Account, Sign out)
 - Name (editable), email (read-only, "Change email" sends a new code), mobile (optional, same mask as checkout).
 - Opt-ins (c-field-10 pattern switches): "Order updates on this phone" (push; hidden without push support), "Promos by email from this shop" and "Promos by text (SMS)" (both off by default; each saved as its own consent, newest wins). Saved at once with a toast; failures roll back.
 - Sign out (confirm c-alert-dialog-2 pattern): clears the member session on this phone; basket and favourites stay.
 - Privacy link (T14 route) with "To delete your data, contact the shop" (deletion is by contacting the shop in A). No account deletion screen in A.
 - Saved addresses are not here: Storefront Blueprint v1.4 moved saved places to MVP B; the last address is remembered on the phone (T09). Update the 7.10 line in docs/SMART_APP_PH_BLUEPRINT.md to say so.

4. TESTS
 - Unit: stamp-grid slot states from (stamps, pending, rule); progress text for every reward type; limited badge thresholds (100, 21, 20, 1, 0); otp-resend timer with fake timers; confetti-once memory.
 - e2e (routes.ts): join kanto-smash with code 123456 → 1 stamp; wrong code; expired code (mock helper); ?as=member-ready → reward ready + confetti not run under reducedMotion: 'reduce'; Tala claim → code + QR; claim the last piece → all claimed; ?as=member-pending shows Pending; card Off shop → empty state and no Rewards tab in the dock; sign out keeps the basket; keyboard-only join.

5. DOCS
 - components.md "Used in" (stamp-grid, otp-resend, number-ticker, confetti, timeline, qr-code). docs/decisions.md: N34 The stamp card uses the member colour and celebrates once per reward (never under reduced motion). N35 Customers join with a 6-digit email code (resend after 60 s, expires in 10 min); no passwords. Tick T12 in PROGRESS.md, one CHANGELOG line.

DONE WHEN
 - Guest, new member, member with pending, capped, ready, claimed, all claimed, paused and card Off all look finished on all 5 demo shops at 360, 390, 768, 1024 and 1280 px; joining takes under 30 seconds on a phone; Lighthouse mobile on /kanto-smash/rewards: Accessibility 100.

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint, pnpm build and pnpm e2e green. Never weaken eslint or tsconfig, never skip a test. No workarounds: stop and show me any error.
 - Screenshots at 390 and 1280: join step 2, new member, ready reward, Tala limited "23 left", all claimed, paused, history, member QR, account. gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test (with ?as= links), what I must do by hand.

OUT OF SCOPE: owner stamp tools, stamp start/end dates, grace days, pickup windows for rewards, more than one active reward, referral, Google sign-in, real email sending (Resend comes with the API).
<!-- prettier-ignore-end -->
