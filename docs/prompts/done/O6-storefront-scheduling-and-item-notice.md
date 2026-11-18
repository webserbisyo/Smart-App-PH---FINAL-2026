# O6 Storefront scheduling: pick a day and time, item notice and daily limits

Prompt 6 of 6 for the Orders page. 2026-11-02. Paste after O1's cloud check is green. It does not need O2 to O5's screens, only O1's data and O2's installed parts, so it can run after O2 if you want it sooner.

Copy everything below the line into Antigravity.

---

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

You are replacing the storefront's "Later" time dropdown with a proper **day and time picker**, so customers can book days ahead: a birthday cake for Saturday, a coffee catering box for next week, water delivery tomorrow morning. You are also adding the two item fields owners need for it (**notice** and **daily limit**) to the Menu item editor, and showing the **pickup code** on the receipt.

Today (see the founder's screenshots in the thread) "Later" opens a plain native dropdown of about 40 times, today and tomorrow only, with no dates, no notice and no limits.

## Read first

- `AGENTS.md`, `docs/ux.md` (sections 1 to 6, storefront notes), `docs/decisions.md` N1, R36, R47, T31, T48 to T53
- `apps/storefront/src/features/location/components/how-where-sheet.tsx`, `location-bar.tsx`, `use-location-choice.ts`
- `apps/storefront/src/features/checkout/components/checkout-how.tsx`, `checkout-form.tsx`, `checkout-rules.ts`
- `apps/storefront/src/features/receipt/components/receipt-header.tsx`, `thermal-slip.tsx`; `apps/storefront/src/features/orders/components/order-parts.tsx` and `use-order-again.ts`
- `packages/core/src/rules/` (`scheduleDays`, `slotGroups`), `packages/data` `useSchedule`
- `packages/ui/src/vendor/opensource-ui/week-strip-calendar.tsx`, `booking-slot-calendar.tsx`, `packages/ui/src/components/calendar.tsx`
- `apps/dashboard/src/features/catalog/item-editor.tsx` and its sections
- `tooling/scripts/js-budget.ts` (300 KB first-load budget per page, checkout 320 KB)

## Already decided (do not re-argue)

- Walk-in is never scheduled. Pickup and delivery can be ASAP or Schedule.
- ASAP hides when the basket has an item with notice, or the shop is closed, paused or busy beyond its prep time. The line under it says why.
- Days come from `scheduleDays` through `useSchedule`. The quote and Place order check the same rule; a slot taken in the meantime returns `slot_unavailable`.
- The storefront keeps the shop's own colours. Status colours never change.

## Step 0: scan, plan, then STOP

`git checkout main && git pull`, read the files above, post a short plan (files, components, how you keep the JS budget, anything that doesn't match). **STOP and wait for my OK.**

## Part A: the picker (How and where sheet, and checkout's How step)

Build it once as `apps/storefront/src/features/location/components/when-picker.tsx` and use it in both places.

1. **When:** two radio cards, **ASAP** ("Ready in about 20 min") and **Schedule** ("Pick a day and time"). Same card style as today.
2. **Day strip:** the Opensource UI **week strip** copy. Chips Today, Tomorrow, then "Wed 5", "Thu 6"… up to the shop's `daysAhead`, at most 14 chips. Each chip shows its state with icon + word: open (no label), **Closed**, **Full**, **Too soon** (greyed, not tappable). The first open day is picked by default.
3. **More dates:** when `daysAhead` is more than 14, a last chip "More dates" opens a bottom sheet (phone) or popover (desktop) with the shadcn **Calendar**, closed, full and too-soon days disabled with a legend. **Load this calendar only when it opens** (`next/dynamic`), so `react-day-picker` and `date-fns` never land in a page's first JavaScript.
4. **Time:** the Opensource UI **booking slots** copy for the picked day, grouped Morning (before 12), Afternoon (12 to 5), Evening (after 5). Full slots are crossed out with the word Full. Chips are at least 44 px tall and wrap in rows; no dropdown.
5. **Notice line** under the strip when an item pushed the start: "Ube Macapuno Cake needs 2 days' notice. Earliest pickup: Thu 6 Nov." (`noticeItem` from the schedule).
6. **Summary line** after picking: "Pickup Sat 8 Nov, 3:00 PM" in the location bar and on checkout, exactly as the receipt will show it.
7. **No days at all** (paused shop, or every day full): one line saying when to try ("Fully booked until 15 Nov. Message the shop for a special order.") with the shop's Messenger link; the basket stays.
8. **Changing the basket** (adding a cake) refreshes the schedule; if the picked slot is no longer open, the picker says so and picks the next open one. Never silently keep an invalid time.

**Delivery** uses the same picker with "Delivery" words ("Arrives around 3:00 PM").

## Part B: checkout and place order

- `slot_unavailable` on the quote or Place order: "That time just filled up. Pick another." The picker opens at that day, everything else stays filled in.
- The placed order's `scheduledAt` is the picked slot. ASAP stays `null`.

## Part C: receipt, slip and My orders

- **Receipt header:** under the QR, the **pickup code** in large letters ("Code K7QP") with words "Show this at pickup" for pickup and walk-in, and the date and time for scheduled orders ("Pickup Sat 8 Nov, 3:00 PM").
- **Thermal slip:** add the pickup code and the scheduled date.
- **My orders:** a scheduled order shows its date ("Sat 8 Nov, 3 PM") instead of "placed 2 h ago" until it is done.
- **Order again** (existing): refills the basket and opens the When picker on Schedule, so a returning cake customer books in 3 taps.

## Part D: Menu item editor (dashboard)

- New **Booking** section in the item editor (below price and variants): **Order ahead** (ReUI Number Field, days, 0 = "No notice needed") and **Daily limit** (Number Field, empty = "No limit"; hint "Counts how many can be booked for the same day").
- Both save with the item's existing Save (no extra button). Field errors under the field.
- The items list shows a small "2 days' notice" badge on items with notice, next to the existing badges.
- Words for food and retail via `vocab()`.

## Part E: tests and docs

- Tests: `apps/storefront/src/features/location/when-picker.test.ts` (ASAP hidden with notice, default day, notice line, refresh when the basket changes, invalid slot replaced); update `checkout-rules.test.ts` and `receipt-rules.test.ts` for the new times and code. Playwright: Kanto ASAP still works; Lola Remy book a cake for 3 days ahead at 390 and 1280; a Full day can't be picked; the receipt shows the code and date.
- `docs/ux.md` section 6, storefront Checkout and Receipt: the new picker and code. `docs/components.md`: "Used in" for week strip, booking slots and Calendar. `docs/PROGRESS.md`: `- [x] O6 Storefront scheduling, item notice and limits`. `docs/CHANGELOG.md`: one line.

## Rules for this task

- **JS budget:** every storefront page stays under its budget (300 KB, checkout 320 KB). The week strip and slot chips are small; the Calendar loads only on "More dates". If a page grows by more than 5 KB, stop and tell me.
- Installed parts only: the two Opensource UI copies, shadcn Calendar, Radio Group, Drawer or Sheet, Popover, `ResponsiveDialog`, Field, ReUI Number Field, ReUI Badge, DiceUI QR Code. Never edit installed files.
- Storefront feedback and look rules (ux.md sections 2 to 5): 16 px inputs, 44 px targets, no sideways scroll from 360 px, motion under 400 ms, shop colours from tokens, Manila time, words in `words.ts`, errors from codes.
- No new packages, no database changes.

## Checks and push (decision T40)

- Do not run `pnpm check`, `pnpm build`, Playwright or screenshots. `pnpm format` before the last commit.
- In the dev servers, once each: How and where plus checkout for Kanto (ASAP) and Lola Remy (cake, 3 days ahead), one receipt, and the Lola Remy cake in the item editor: 0 console errors.
- Commit on `main`, `git push origin main`. No branch, no PR. Never force-push.
- The cloud thread runs check, build, the JS budget, e2e, and screenshots of the picker at 390 and 1280 for a food and a retail shop.

## Done when

- [ ] Customers pick a day and time with a day strip and slot chips, see why a day is closed, full or too soon, and can book up to the shop's days ahead.
- [ ] Notice and daily limits work end to end: set in the item editor, enforced in the picker, the quote and Place order.
- [ ] Receipt, slip and My orders show the code and the scheduled date; Order again opens Schedule.
- [ ] The JS budget holds. Docs updated.
- [ ] Pushed to `main`. Finish with: the commit list, what changed, how to test (Kanto ASAP, Lola Remy cake), and what I must do by hand.
