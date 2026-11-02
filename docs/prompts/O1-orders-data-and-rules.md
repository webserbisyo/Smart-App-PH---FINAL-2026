# O1 Orders: data, rules and mock data (no screens)

Prompt 1 of 6 for the Orders page. 2026-11-02. Paste into Antigravity when no other task is still pushing to `main`. Paste O2 only after the cloud check of this push is green.

Copy everything below the line into Antigravity.

---

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

You are building the data layer for the new owner **Orders** page and for **scheduled orders** (bakery cakes, catering, pickup and delivery days ahead). This task has **no screens**. It adds the data shapes, the pure rules, the mock data and the data hooks that prompts O2 to O6 will build on. The goal is that every later screen only calls hooks, and that the real NestJS API can later replace the mock without any screen changing.

## Read first

- `AGENTS.md` and `docs/blueprints/foundation.md`
- `docs/api.md`: the Rules, Storefront and "Orders (owner)" sections
- `docs/blueprints/A-mvp.md` sections 1 and 4
- `docs/decisions.md`: N1, T34, T40, T43, T47
- `docs/demo-shops.md`

## Already decided by me (do not re-argue)

1. **T48 Light advance ordering and Kitchen view are in MVP A.** Shops choose how many days ahead customers may order (default 1 = today and tomorrow, so burger shops see no change). Items can need notice ("order 2 days ahead") and can have a daily limit. Shops can cap orders per time slot. Deposits, recurring orders, occasion reminders and walk-in table booking stay in MVP B. Walk-in orders are never scheduled. This replaces the "today or tomorrow only" part of N1 and removes "advance orders beyond tomorrow" and "kitchen screen" from Blueprint A's "Not in the MVP" list. Staff kitchen logins stay in B.
2. **No new order status.** The 7 statuses and their order stay. "Scheduled", "late" and "due" are worked out from times by rules in `packages/core`.
3. **Owners can change an order's time (T52)** and **recall a step (T51: Recall shown for 5 seconds; the server accepts it up to 10 seconds, as grace for slow phones)**. Both are API methods in this task; the buttons come in O3 and O4.
4. Live updates are **polling** (15 s and on window focus). No Supabase Realtime (rule 13, T34).

## Step 0: scan, plan, then STOP

1. `git checkout main && git pull`.
2. Read these and note what you find:
   - `packages/core/src/schemas/enums.ts`, `order.ts`, `owner-orders.ts`, `storefront.ts` (`StorefrontSchema`), `catalog.ts` (`ItemBaseSchema`, `ItemDraftSchema`, `OwnerItemSchema`), `basket.ts`
   - `packages/core/src/rules/order-rules.ts`, `hours.ts` (`pickupSlots`, `openingIntervals`, `SLOT_STEP_MINUTES`), `location.ts` (`slotGroups`)
   - `packages/core/src/errors.ts`, `words.ts` (the `orders` screen words, `vocab()`, `errorWords`)
   - `packages/core/src/demo/packs/*.ts`, `demo/packs/build.ts`, `demo/test-shops.ts`
   - `packages/data/src/adapters/types.ts` (`OwnerOrdersAdapter`, `StorefrontAdapter`), `adapters/api/`, `mocks/store.ts` (`ownerOrders`, `quoteOrder`, `placeOrder`), `mocks/quote.ts`, `mocks/activity.ts` (`generateOrders`, `activityDrafts`, `demoReceiptDrafts`), `mocks/state.ts` (`buildOrder`, `OrderRecord`), `mocks/scenario.ts`
   - `packages/data/src/hooks/owner-catalog/` (copy this pattern for orders)
   - `apps/storefront/src/features/receipt/components/order-thread.tsx` (renders order thread messages by kind)
   - tests: `packages/core/test/rules.test.ts`, `schemas.test.ts`, `packs.test.ts`, `packs-snapshot.test.ts`; `packages/data/test/contract.test.ts`, `rules.test.ts`
3. Post a short plan: the files you will add or change in the order of Parts A to F, and anything here that does not match the code. **STOP and wait for my OK.**

Stop and ask me, instead of choosing, when two docs disagree, something has no clear place, or a change would touch `supabase/`.

## Part A: shapes (`packages/core/src/schemas`)

1. **Shop booking rules** on `StorefrontSchema` (customers need them for the date picker):
   - `daysAhead`: integer 1 to 60. 1 means today and tomorrow.
   - `slotMinutes`: one of 15, 30, 60. Add `SLOT_LENGTHS = [15, 30, 60] as const` and a Zod schema (a union of literals, like `WeekdaySchema`).
   - `ordersPerSlot`: integer 1 to 50, or `null` for no limit.
   - Add a `BookingRulesSchema` (`daysAhead`, `slotMinutes`, `ordersPerSlot`, `prepMinutes`, `takeOrdersWhileClosed`) that the owner reads and saves.
2. **Item booking fields** on `ItemBaseSchema` and `ItemDraftSchema`:
   - `noticeDays`: integer 0 to 30. 0 = no notice.
   - `dailyLimit`: integer 1 to 500, or `null`. It counts the item's quantity across orders due on the same Manila date.
3. **Order times.** Add to `OrderReceiptSchema` (so the receipt, the owner detail and the card all agree):
   - `dueAt`: when it must be ready. Equals `scheduledAt`, or `placedAt + prepMinutes` for ASAP.
   - `startBy`: when making should start: `dueAt − prepMinutes`.
   - `pickupCode`: 4 characters (see Part B).
4. **The card (`BoardOrderSchema`)** gets:
   - `dueAt`, `startBy`, `pickupCode`
   - `seenAt` (nullable): the first time the owner opened or acknowledged it.
   - `lines`: up to 8 `TicketLineSchema` rows (`qty`, `name`, `variantLabel`, `optionLabels`, `note`), plus `moreLines` (count of the rest).
   - `note` (order note, nullable), `ownerNote` (nullable), `deliveryArea` (zone name only, nullable). Never the address or the phone on a card.
   - `lastStepAt`: time of the latest status event (for Recall).
5. **Owner order detail (`OwnerOrderSchema`)** gets `seenAt`, `ownerNote`, `lastStepAt`.
6. **Order thread:** add `'schedule'` to `MESSAGE_KINDS` for "Time changed to Sat 8 Nov, 3:00 PM". Render it in the storefront `order-thread.tsx` as a system line with a CalendarClock icon and words from `words.ts`. That is the only storefront file this task touches.
7. **Schedule shapes:**
   - `ScheduleSlotSchema`: `{ at: IsoDateTime, state: 'open' | 'full' }`.
   - `ScheduleDaySchema`: `{ date: 'YYYY-MM-DD', state: 'open' | 'closed' | 'full' | 'too_soon', slots: ScheduleSlot[] }`. Each state list is an `as const` array plus a Zod enum.
   - `ScheduleSchema`: `{ days: ScheduleDay[], earliest: IsoDateTime | null, noticeItem: { name, noticeDays } | null }`. `noticeItem` names the basket item that pushed the earliest day out.
   - `DayLoadSchema` (owner calendar): `{ date, orders: number, items: { itemId, name, count, limit }[], slotsFull: number }`.
8. **Error codes** (`errors.ts`): `recall_expired`, `reschedule_not_allowed`, `slot_full`, `notice_too_short`, `daily_limit_reached`. Words for each in `errorWords`, each saying what to do next.

All new closed lists: `as const` array + Zod enum (rule 5). No `any`, no `as`, no `@ts-ignore`.

## Part B: rules (`packages/core/src/rules`, pure, no React)

Write each with a test table that the SQL will later share.

1. **`orderTiming(order, now)`** returns `{ phase: 'scheduled' | 'upcoming' | 'active' | 'done', minutesToStart, lateMinutes, ageTone: 'calm' | 'amber' | 'red' }`.
   - `scheduled`: placed and `now < startBy − 2 h`; `upcoming`: placed and within 2 hours of `startBy`; `active`: any open step at or after `startBy`, or preparing, ready, out; `done`: final.
   - Age counts from `startBy`, **not** from `placedAt`, so a 3 PM cake is never red at 9 AM. Amber at 10 minutes past `startBy` without progress, red at 20 (same thresholds as today, ux.md section 6). Ready orders go amber 15 minutes after `dueAt` if not handed over.
2. **`boardColumn`** changes its Scheduled rule from "more than 30 minutes ahead" to "placed and `now < startBy`". Keep its return type.
3. **`dueTimes(input)`** returns `{ dueAt, startBy }` from `placedAt`, `scheduledAt` and `prepMinutes`. Used by the mock when an order is placed or its time changes.
4. **`scheduleDays(storefront, lines, items, bookings, now)`** returns a `Schedule`:
   - Earliest moment = now + `prepMinutes`, pushed to the start of day (today + the largest `noticeDays` among the basket's items) when any item needs notice.
   - Days run from today to today + `daysAhead` (Manila dates). Closed weekdays and closures are `closed`. Days before the earliest are `too_soon`.
   - Slots step by `slotMinutes` inside opening hours (reuse `openingIntervals`). A slot is `full` when its booked orders reach `ordersPerSlot`.
   - A day is `full` when every slot is full, or when any basket item's booked qty that day plus its basket qty exceeds its `dailyLimit`.
   - `bookings` = `{ slotCounts: Record<IsoDateTime, number>, itemCounts: Record<date, Record<itemId, number>> }`. The server supplies them; the rule stays pure.
   - Paused shop: no days. Busy: slots after `busyUntil` only. Closed and `takeOrdersWhileClosed` off: only days from the next opening are open, never "now".
   - `pickupSlots` and `slotGroups` keep working (the checkout still calls them until O6). Make `pickupSlots` return the same as the first two days of `scheduleDays` with no limits, and add a test proving it.
5. **`pickupCode(token)`**: 4 characters from the alphabet without 0, O, 1, I and L, taken from a hash of the token. Same token, same code.
6. **`canRecall(order, now)`**: true when the order is not final, its last status event is less than **10 seconds** old, and it has a step to go back to. The screen shows Recall for 5 seconds; the extra 5 covers slow phones.
7. **`canReschedule(order)`**: true for pickup and delivery orders in `placed` or `preparing`. Never walk-in, never ready, out or final.
8. **`dayLoads(orders, items, from, to)`** returns `DayLoad[]` for the owner calendar.

## Part C: data layer (`packages/data`) and `docs/api.md`

1. `OwnerOrdersAdapter` gets (mock and HTTP stub, same inputs and outputs, all parsed with the core schemas):
   - `listOrders` keeps its inputs plus an optional `q` for the date form (matches order number, customer name or phone on the server; the phone never reaches the card). Cards now carry the Part A fields.
   - `listScheduled({ slug, from, to })` → `{ orders: BoardOrder[], days: DayLoad[] }` (dates are Manila `YYYY-MM-DD`, at most 62 days apart).
   - `findOrder({ slug, code })` → `BoardOrder[]` (pickup code or order number, open orders and today's).
   - `markSeen({ slug, orderId })` → `BoardOrder`.
   - `recallOrder({ slug, orderId })` → `OwnerOrder`, or `recall_expired`. It removes the last status event and its thread message, and gives back nothing else (no stamp is given before completed, so there is nothing to undo).
   - `rescheduleOrder({ slug, orderId, scheduledAt, override })` → `OwnerOrder`. Checks `canReschedule`, then that the slot is open in the shop's schedule. With `override: true` the owner may book past `ordersPerSlot`, `dailyLimit` and notice (never outside opening hours or on a closed day). Adds a `schedule` thread message and recomputes `dueAt` and `startBy`.
   - `saveOwnerNote({ slug, orderId, note })` → `OwnerOrder` (up to 300 characters, never sent to the customer).
   - `getBookingRules({ slug })` / `saveBookingRules({ slug, rules })` → `BookingRules`.
   - `setPause({ slug, mode })` with `mode` one of `busy_15`, `busy_30`, `pause`, `resume` (an `as const` list) → `OpenState`. It writes the existing `pause` fields (`busyUntil`, `paused`) on the storefront, so customers see Busy or Paused at once.
2. `StorefrontAdapter.getSchedule({ slug, type, lines })` → `Schedule`. `quoteOrder` and `placeOrder` check the chosen `scheduledAt` with the same rule and return `slot_unavailable` (existing code) when it is no longer open.
3. Hooks in `packages/data/src/hooks/owner-orders/` (`qk.ts`, `queries.ts`, `mutations.ts`, `index.ts`), copying `owner-catalog`:
   - `useOpenOrders(slug)`: `refetchInterval: 15_000`, `refetchOnWindowFocus: true`, and paused while the tab is hidden.
   - `useOrdersByDate`, `useScheduledOrders`, `useOrderDetail`, `useFindOrder`, `useBookingRules`.
   - Mutations: `useSetPause`, `useAdvanceOrder` and `useRecallOrder` update the cached card at once and roll back on error (`onMutate` / `onError` / `onSettled`). Also `useCancelOrder`, `useReviewPayment`, `useRecordPayment`, `useSaveDeliveryInfo`, `useMarkSeen`, `useRescheduleOrder`, `useSaveOwnerNote`, `useSaveBookingRules`.
   - Storefront hook `useSchedule(slug, type, lines)`.
4. `docs/api.md`: add every new route (`GET /owner/orders/scheduled`, `GET /owner/orders/find`, `POST /owner/orders/:id/seen`, `POST /owner/orders/:id/recall`, `POST /owner/orders/:id/reschedule`, `PATCH /owner/orders/:id/note`, `GET|PUT /owner/booking-rules`, `GET /s/:slug/schedule`) with its codes. Replace `isLate` with `orderTiming`. Replace the two Supabase Realtime rows with "live updates: polling every 15 s now; server-sent events from NestJS in phase 4 (T34)". Note that slot and daily counts are locked in the SQL `place_order` function so two phones cannot take the last slot.

## Part D: mock data (`packages/core/src/demo` and `packages/data/src/mocks/activity.ts`)

One source for the mock, the tests and the future seed. Build on `generateOrders`; do not add a second generator.

| Shop                                  | Booking rules                                       | Items                                                                      | Orders the generator makes                                                                                                                                          |
| ------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kanto Smash (food)                    | `daysAhead` 1, `slotMinutes` 15, no slot limit      | none need notice                                                           | Lunch rush: 18 open orders over every column, 3 late (2 amber, 1 red), 2 unpaid transfers with a proof to check, 1 out for delivery with a rider, 2 with long notes |
| Panaderya ni Lola Remy (food, bakery) | `daysAhead` 30, `slotMinutes` 60, `ordersPerSlot` 4 | Chocolate Moist Cake and Ube Macapuno Cake: `noticeDays` 2, `dailyLimit` 6 | 25 scheduled orders over the next 30 days; next Saturday fully booked for cakes; one 40-line party order; greetings in notes ("Happy 7th birthday, Migo!")          |
| Kapé Juan (food)                      | `daysAhead` 7, `slotMinutes` 30                     | pick one existing item for catering: `noticeDays` 1                        | ASAP coffees now, plus 6 bookings next week                                                                                                                         |
| Tala Apparel (retail)                 | `daysAhead` 3, `slotMinutes` 60                     | none                                                                       | Pickup and delivery only, one ₱12,345.50 order, long product names                                                                                                  |
| AquaLinis (retail)                    | `daysAhead` 2, `slotMinutes` 30, `ordersPerSlot` 3  | none                                                                       | Repeat delivery customers, two slots full tomorrow                                                                                                                  |

- Every generated order gets `dueAt`, `startBy` and `pickupCode` from the Part B rules; `seenAt` is set on about half of the open ones.
- Keep the fixed demo receipt tokens (`DEMO_RECEIPT_TOKENS`) exactly as they are. `packs-snapshot.test.ts` must still pass; if a snapshot changes only because of the new fields, update it and say so.
- `test-shops.ts`: give the stress shop `daysAhead` 60, `ordersPerSlot` 1 and one item with `noticeDays` 30.
- Mock scenarios (`mocks/scenario.ts`) get `ordersRush` (the Kanto numbers for any shop), `ordersEmpty`, and `ordersTrickle` (adds one new order every 20 s while on). The dev panel button comes in O3.
- Update `docs/demo-shops.md` with the table above.

## Part E: words (`packages/core/src/words.ts`)

Add an `ordersWords` block (split it out like `catalogWords` if it keeps the storefront bundle smaller): tab names (Now, Scheduled, History), column names (Starting soon, New, Preparing or Packing via `vocab()`, Ready, Out, Done today), type words (Walk-in, Pickup, Delivery), age words ("8 min", "Late 12 min"), due words ("Due 3:00 PM", "Sat 8 Nov, 3:00 PM"), the schedule thread line, notice words ("Ube Macapuno Cake needs 2 days' notice. Earliest pickup: Thu 6 Nov."), Full, Closed, Too soon, and every new error. Dynamic text as functions. Manila time for display.

## Part F: docs, tests and push

Tests (write them; the cloud thread runs them):

- `packages/core/test/order-timing.test.ts`: every phase, age from `startBy`, ready-late, final.
- `packages/core/test/schedule.test.ts`: notice pushes the start, `daysAhead` 1 equals today plus tomorrow, closures, closed weekdays, busy, paused, closed with and without `takeOrdersWhileClosed`, slot full, daily limit with basket qty, `pickupSlots` parity.
- `rules.test.ts`: new `boardColumn` rule, `canRecall` at 9 s and 11 s, `canReschedule` per type and status, `pickupCode` stable and alphabet-safe.
- `schemas.test.ts`: new fields parse; `slotMinutes` 20 fails; a card with 9 lines fails.
- `packages/data/test/owner-orders.test.ts`: list, scheduled with day loads, find by code and number, mark seen, recall inside and after 10 s, reschedule (ok, full, override, walk-in refused, thread message added), owner note, booking rules round trip, `setPause` (busy shows on the public storefront and slots move after it), `getSchedule` and the quote agree.
- `contract.test.ts`: the HTTP stub has every new method.

Docs (same push):

- `docs/decisions.md`: add **T48** (item 1 of "Already decided"), **T49** (Orders page shape: tabs Now, Scheduled and History; order type is a filter, not a tab; Kitchen view mode; one reusable ticket; status stays the board's axis), **T50** (components: ReUI Kanban, ReUI Event Calendar with shadcn Calendar, Opensource UI week strip and booking slots; packages `date-fns` 4.4.0, `@date-fns/tz` 1.5.0, `react-day-picker` 10.0.2, approved by the founder), **T51** (Recall: a 5-second Recall after a step change; the server allows 10 s; amends ux.md section 5 "there is no Undo" for order steps only), **T52** (owners change an order's time in A; customers see a thread line; the owner may override limits but not hours), **T53** (live updates by polling now, server-sent events from NestJS later; api.md's Realtime rows removed).
- `docs/decisions.md` N1: add "(amended by T48: days ahead are a shop setting, default today and tomorrow)". Do not delete N1.
- `docs/blueprints/A-mvp.md`: update the Order types row (pickup and delivery now or up to the shop's days ahead, item notice and daily limits) and the Dashboard row (Orders: Now board, Scheduled calendar, History, Kitchen view, Change time, Recall). Remove "kitchen screen" and "advance orders beyond tomorrow" from "Not in the MVP" and add "deposits, recurring orders, occasion reminders, walk-in table booking, staff kitchen logins".
- `docs/blueprints/B-full.md` M10 and M11: one line each saying which part moved to A (T48) and what stays in B.
- `docs/SYSTEM.md` and `docs/SMART_APP_PH_BLUEPRINT.md`: every place that says "today or tomorrow" only, "advance-order calendar" out of scope, or "kitchen screen" out of scope (search for `tomorrow`, `kitchen`, `advance`), plus the Orders board description (Scheduled group, 30-minute rule, age from placed time): update each to T48 to T53. List the lines you changed in your final report.
- `docs/ux.md` section 5: amend the Undo sentence per T51 (Recall shown for 5 seconds; the server allows 10).
- `docs/PROGRESS.md`: `- [x] O1 Orders data, rules and mock data (T48 to T53)`. `docs/CHANGELOG.md`: one line.

Checks and push (decision T40):

- Do **not** run `pnpm check`, `pnpm build`, Playwright or screenshots on my laptop. Run `pnpm format` before the last commit.
- Start the storefront dev server once and open one receipt, `/lola-remy/o/demo-scheduled`: 0 console errors.
- Commit in small steps on `main` and `git push origin main`. No branch, no PR. If the push is refused, `git pull` first. Never force-push.
- A cloud Claude thread then runs `pnpm check`, `pnpm build`, the JS budget and e2e, and fixes or reverts.

## Rules for this task

- No screens, no installs, no new packages (the date packages come in O2). Use the existing date helpers in core (`manilaDate`, `addDays`, `manilaToDate`); do not add `date-fns` to `packages/core`.
- `packages/core` imports no React, `@smartapp/ui` or `@smartapp/data`. Mock data only in `packages/data/src/mocks` and `packages/core/src/demo`.
- No database changes, nothing in `supabase/`. Never run `pnpm db:push`.
- Screens never compare the shop type; Kitchen vs Packing comes from `vocab()`.

## Done when

- [ ] Every new shape, rule, adapter method and hook exists, with the tests above.
- [ ] The 5 demo shops produce the orders in the Part D table, with due times and pickup codes, and the fixed receipt tokens still work.
- [ ] The storefront thread shows a "Time changed" line for a `schedule` message.
- [ ] `docs/api.md`, decisions T48 to T53, A-mvp, ux.md, demo-shops, PROGRESS and CHANGELOG are updated.
- [ ] Pushed to `main` with 0 console errors on the receipt above.
- [ ] Finish with: the commit list, what changed, how to test, and what I must do by hand.
