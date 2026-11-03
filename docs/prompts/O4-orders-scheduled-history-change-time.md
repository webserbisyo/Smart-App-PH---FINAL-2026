# O4 Orders: Scheduled calendar, History list and Change time

Prompt 4 of 6 for the Orders page. 2026-11-02. Paste after O3's cloud check is green.

Copy everything below the line into Antigravity.

---

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

You are building the other two tabs of the owner **Orders** page:

- **Scheduled**: a real calendar of booked orders (cakes, catering, pickups and deliveries days ahead) with how full each day is.
- **History**: every order on a date, searchable, for looking back.

You are also adding **Change time** (T52) and the shop's **Booking rules** sheet. This is what lets us sell to bakeries and caterers: an owner must see at a glance what is booked this week and which days are full.

## Read first

- `AGENTS.md`, `docs/ux.md` (sections 1, 3, 5, 6, 7, 8), `docs/decisions.md` T47 to T53, `docs/components.md`
- `packages/ui/src/components/reui/event-calendar*.tsx`: read the props, views, colour API, render slots and the external CRUD contract **before** planning. Also the O2 kit section in `apps/dashboard/src/features/kit/orders-primitives.tsx`.
- `packages/ui/src/components/calendar.tsx`, `reui/data-grid/`, and the Menu items list (`apps/dashboard/src/features/catalog/items-list.tsx`) for the Data Grid pattern, search params and scroll restoration
- `apps/dashboard/src/app/orders/order-ticket.tsx` and the O3 Now board
- `packages/core/src/rules/` (`scheduleDays`, `dayLoads`, `canReschedule`, `orderTiming`) and `packages/data/src/hooks/owner-orders/`

## Already decided (do not re-argue)

- The Scheduled tab uses the installed **ReUI Event Calendar** (T50): month, week and agenda views. Drag to move is on only for a mouse or trackpad, and a drop **never** saves on its own: it opens the Change time dialog filled in, and the owner confirms.
- Phones use the agenda view, plus a month grid to pick the day. No hourly grid on a phone.
- Change time (T52): pickup and delivery orders in New or Preparing only (`canReschedule`). The owner may go past the slot limit, the daily limit and the notice (an "Allow anyway" switch, off by default). They may never pick a closed day or a time outside opening hours. The customer sees a "Time changed" line on their receipt (built in O1).
- All filters in the URL. Type chips from O3 apply to Scheduled and History too.

## Step 0: scan, plan, then STOP

1. `git checkout main && git pull`.
2. Read the files above. Post a short plan: the Event Calendar props and slots you will use (or tell me which ones it lacks), the files you will add or change, and anything here that does not match the code. **STOP and wait for my OK.**

## Part A: Scheduled tab (`?view=scheduled`)

Files under `apps/dashboard/src/features/orders/`: `screens/scheduled.tsx`, `scheduled-calendar.tsx`, `day-agenda.tsx`, `booking-rules-sheet.tsx`, `change-time-dialog.tsx`.

**Data:** `useScheduledOrders({ from, to })` for the visible range (month view: the visible weeks; week view: 7 days; agenda: 14 days from the picked day), returning orders and `DayLoad`s.

**Events:** one event per open order at its `dueAt` (all scheduled and ASAP orders that are not final). Event chip text: type icon, `#012`, customer name. The event colour follows the **status** tone through the component's colour API (info for New, warning for Preparing, success for Ready). Cancelled and expired orders never show. Done orders show muted when "Show done" is on (off by default).

**Day load:** each day shows its order count and, when the shop has limits, a small **Progress** bar ("4 of 6 cakes"). A day at its limit shows a **Full** status (icon + word + colour). Use the Event Calendar's day-cell render slot. If it has none, show the load in the agenda day header and as an all-day chip, and tell me which you chose.

**Tap or click an event:** opens order detail (the O3 side panel at 1280 px and up, the page below), with Back returning to the same view, date and scroll.

**Tap a day:** on desktop, switch to that day in week view; on a phone, show that day's tickets below the month grid as `card` tickets (the same `OrderTicket`).

**Toolbar:** Today, previous and next, view switch (Month · Week · Agenda, desktop only), the type chips, and a **Booking rules** button.

**Views by width:**

| Width              | Scheduled                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Phone              | Month grid (dots and counts only) on top, the picked day's tickets below. Swipe or arrows change the month. |
| Tablet             | Month grid left, the day's tickets right.                                                                   |
| Laptop and desktop | Full Event Calendar, Week by default, Month and Agenda in the switch.                                       |

## Part B: Booking rules sheet

A `ResponsiveDialog` opened from the Scheduled toolbar (later the Settings page will reuse the same form). Fields, each with a label and a one-line hint from `words.ts`:

- **Take orders up to** N days ahead (ReUI Number Field, 1 to 60).
- **Time slots every** 15, 30 or 60 minutes (Toggle Group).
- **Orders per time slot** (Number Field, empty = no limit).
- **Prep time** in minutes (Number Field, 5 to 180).
- **Take orders while closed** (Switch).

One `AsyncButton` Save. It saves only itself, closes, and the calendar refreshes (T47). Field errors under the field.

## Part C: Change time dialog

- Opened from the detail ⋯ menu ("Change time", hidden when `canReschedule` is false; O3 left the slot), and from a drag drop on desktop.
- Content: the shop's **week strip** (Opensource UI copy from O2) over the next `daysAhead` days, then the **booking slots** grid for the picked day (full slots crossed out and labelled Full), both from `scheduleDays` with the order's own items (so notice and daily limits apply). Use the shadcn **Calendar** in a Popover for "Pick another date" when `daysAhead` is more than 14.
- An **Allow anyway** switch lets the owner pick Full and Too soon slots. Closed days stay disabled.
- `AsyncButton` "Change time" → "Changing" → check "Changed". The dialog closes and the ticket shows the new time. Toast: "#012 moved to Sat 8 Nov, 3:00 PM" (the change happened away from the calendar cell that was tapped).
- Errors from codes: `slot_full` ("That time just filled up. Pick another or turn on Allow anyway."), `reschedule_not_allowed`.

## Part D: History tab (`?view=history&date=2026-11-02&q=`)

- ReUI **Data Grid** (installed) with virtual rows. Columns: `#`, time, type (icon + word), customer, items summary, total (right-aligned, tabular), payment (Status), order status (Status).
- Header: a date button that opens the shadcn **Calendar** in a Popover, with Today and Yesterday quick buttons; the `SearchField` (number, name or phone, matched in the mock); the type chips.
- A row opens order detail. Back returns to the same date, search and scroll.
- Phone: the grid becomes a list of compact rows (number, time, name, total, status), the same pattern as the Menu items list on phones.
- Footer: count and total sales for the day (tabular), so the list ends with a footer, not blank space.

## Part E: states

Each tab: skeleton in its own shape; empty ("Nothing booked from 3 to 9 Nov." with **Booking rules** as the action; History: "No orders on Sun 2 Nov."); error with Try again; offline `Notice` with Change time and Save disabled and saying why; slow network shows the skeleton, never a blank calendar.

## Part F: words, tests, docs

- Every word in `words.ts` (`ordersWords`), dates and times in Manila time.
- Tests: `apps/dashboard/test/orders-scheduled.test.ts` (events from orders, day load and Full, drop opens the dialog and does not save), `orders-history.test.ts` (search by number, name and phone; date change). Playwright: open Scheduled as Lola Remy, see next Saturday Full, change an order's time with and without Allow anyway, check the customer receipt shows "Time changed"; History search on phone and desktop.
- `docs/ux.md` section 6 "Orders": Scheduled, History, Change time and Booking rules. `docs/components.md`: "Used in" for Event Calendar, Calendar, Data Grid, week strip and booking slots. `docs/PROGRESS.md`: `- [x] O4 Orders Scheduled, History, Change time`. `docs/CHANGELOG.md`: one line.

## Rules for this task

- Use only installed parts: ReUI Event Calendar, shadcn Calendar, Popover, ReUI Data Grid, the Opensource UI week strip and booking slots copies, `OrderTicket`, Progress, DiceUI Status, Tabs, Toggle Group, ReUI Number Field, Switch, Field, `ResponsiveDialog`, `AsyncButton`, `notify`, `PageEmpty`, `PageError`, `Notice`, Skeleton, `SearchField`. Never edit installed files; wrap them. If the Event Calendar cannot do something without an edit, stop and tell me.
- Feedback rules (ux.md section 8), look rules (tokens only, no arbitrary values, Lucide, 44 px, 16 px inputs, no sideways page scroll from 360 px, motion under 400 ms), types (no `any`, `as`, `@ts-ignore`), imports (features never import each other).
- No new packages, no database changes.

## Checks and push (decision T40)

- Do not run `pnpm check`, `pnpm build`, Playwright or screenshots. `pnpm format` before the last commit.
- Open Scheduled and History once as Lola Remy and once as Tala in the dev server: 0 console errors, 0 React warnings.
- Commit on `main`, `git push origin main`. No branch, no PR. Never force-push.

## Done when

- [ ] Scheduled shows Lola Remy's 30 days in month, week and agenda (desktop) and month plus day list (phone), with counts, limit bars and a Full Saturday.
- [ ] A drag on desktop opens Change time and only saves on confirm; Change time works from detail on every width; Allow anyway works; closed days never pickable; the customer receipt shows the change.
- [ ] Booking rules save and the calendar follows them.
- [ ] History lists any date, searches, and returns to the same place after detail.
- [ ] Every state in Part E. Words in `words.ts`. Docs updated.
- [ ] Pushed to `main`. Finish with: the commit list, what changed, how to test (Lola Remy and Tala), and what I must do by hand.
