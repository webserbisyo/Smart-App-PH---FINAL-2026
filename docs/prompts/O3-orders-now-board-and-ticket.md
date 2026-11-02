# O3 Orders: the Now board, the reusable ticket and order detail

Prompt 3 of 6 for the Orders page. 2026-11-02. Paste after O2's cloud check is green.

Copy everything below the line into Antigravity.

---

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

You are building the heart of the owner dashboard: the **Orders** page's **Now** tab (the live board), one **reusable order ticket**, and **order detail**. This is the page an owner keeps open during a lunch rush, on a phone at the counter, a tablet by the grill or a laptop. It must feel instant, never make them hunt, and never lag. The last version of this page in an older build was the least responsive screen we had, so speed is part of "done".

## Read first

- `AGENTS.md`, `docs/blueprints/foundation.md`, `docs/ux.md` (all, especially sections 1, 3, 5, 6 "Orders" and "Order detail", 7 and 8)
- `docs/decisions.md`: T35, T36, T43, T44, T45, T47, T48 to T53
- `docs/components.md`, `docs/design-tokens.md`, `docs/api.md` "Orders (owner)"
- `packages/core/src/rules/order-rules.ts` (`nextActions`, `canCancel`, `boardColumn`, `orderTiming`, `canRecall`, `STATUS_TONE`, `PAYMENT_TONE`, `payCountdown`)
- `packages/data/src/hooks/owner-orders/`
- The Menu page as the pattern for page tabs, URL search state, `PageEmpty`, `PageError`, `Notice`, `AsyncButton`, `notify` and the Dev Scenarios panel: `apps/dashboard/src/features/catalog/` (`tabs.ts`, `items-list.tsx`, `dev-scenario-panel.tsx`)
- `apps/dashboard/src/features/orders/` (today's placeholders) and `apps/dashboard/src/app/router.tsx`

## Already decided (do not re-argue)

- **Status is the board's axis.** Columns: **Starting soon** (scheduled orders whose `startBy` is within 2 hours; collapsed strip), **New**, **Preparing** (food) or **Packing** (retail) via `vocab()`, **Ready**, **Out** (only when the shop delivers), **Done today**.
- **Order type is a filter, not a tab:** chips All · Walk-in · Pickup · Delivery, each with its count, above the board. They live in the URL (`?type=pickup`) and survive reloads and Back.
- **Page tabs:** Now · Scheduled · History (`?view=now|scheduled|history`, default now). Scheduled and History are built in O4; in this task they show `PageEmpty` with one line from `words.ts` and no button. Replace today's Board and List tabs and their words.
- **One next-step button per order**, from `nextActions()`. Steps move one at a time. After a step, the toast offers **Recall** for 5 seconds (T51). Cancel always asks for a reason.
- Drag and drop is only for mouse and trackpad. Touch screens use buttons. Phones never show columns side by side.

## Step 0: scan, plan, then STOP

1. `git checkout main && git pull`.
2. Read the files above and post a short plan: the files you will add or change (in the order of Parts A to F), the components you will use from the table in Part G, and anything here that does not match the code. **STOP and wait for my OK.**

## Part A: `OrderTicket` (one component, four sizes)

Location: `apps/dashboard/src/app/orders/order-ticket.tsx` (shared app code, because Home "In progress" and Members order history will reuse it; features never import each other). Props: the `BoardOrder` (or `OwnerOrder` for `full`), `size: 'card' | 'kitchen' | 'full' | 'print'`, `now` from the shared clock, and the action slot. It never fetches; it only renders.

This task builds `card` and `full`. `kitchen` and `print` come in O5, so leave clean props for them.

**Fixed zones, in this order, so every ticket lines up and nothing floats:**

1. **Header row (48 px):**
   - Left: the order type as a ReUI **Icon Tile** (Store = Walk-in, ShoppingBag = Pickup, Bike = Delivery; one map in the shared code, same icons as the storefront's `order-type-icons.ts`) plus the type word. The type has **no colour**: colour is only for status.
   - Middle: the order number, large, `tabular-nums`, weight 700 (`#012`). Scheduled orders on another day show the short date beside it ("Sat 8 Nov").
   - Right: the due time ("3:00 PM") and the **age chip** from `orderTiming()` (calm, amber, red, each with icon + word + colour, for example Clock "8 min", AlertTriangle "Late 12 min").
   - A small dot before the number while `seenAt` is null (new and unseen), with an `aria-label`.
2. **Who row:** customer name (one line, ellipsis) and badges (ReUI Badge): First order, Member (mint, T36 rule: mint only for stamps and members), Reward. **Never** the phone or address on a card.
3. **Lines:** a two-column grid. Column 1 is a fixed width for the quantity (`2×`, weight 600, tabular). Column 2 is the item name, with the variant and add-ons under it in muted text. A line note is an amber row with a MessageSquareText icon. The order note sits after the lines in the same style. `card` shows up to 4 lines then "+3 more"; `full` shows all.
4. **Footer row:** the payment chip (DiceUI **Status**: icon + word, from `PAYMENT_TONE`; unpaid transfers show the `payCountdown` label), the total right-aligned and tabular, and under it the **next-step button** full width (`AsyncButton`: "Start" → "Starting" → check "Started"; words from `words.ts`, food and retail via `vocab()`).

Long names, big amounts (`₱12,345.50`), 40-line orders, and 360 px wide cards must all fit with no overflow and no wrapping prices.

## Part B: the Now board

Files: `apps/dashboard/src/features/orders/screens/orders.tsx`, `now-board.tsx`, `board-column.tsx`, `type-filter.tsx`, `status-strip.tsx`, `tabs.tsx` (new tab set), plus words.

**Layout by width (ux.md section 1):**

| Width                  | Board                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone below 768 px     | A sticky **status strip** at the top (New 3 · Preparing 2 · Ready 1 · Out 1, DiceUI Scroller if it overflows). Tap a step to show that step's tickets as one full-width list. The strip remembers the step in the URL (`?step=ready`). After a step change, the ticket leaves the list with a 200 ms slide; the check state of the button says where it went ("Moved to Ready"). No drag. |
| Tablet 768 to 1023 px  | Three columns visible with scroll-snap sideways; tap buttons only; no drag.                                                                                                                                                                                                                                                                                                               |
| Laptop 1024 px and up  | All columns side by side, each scrolls on its own. **ReUI Kanban** for drag with a mouse. A drop on the next column calls `advanceOrder`. Any other drop snaps back (`restoreOnCancel`) with a short toast saying why ("Orders move one step at a time").                                                                                                                                 |
| Desktop 1280 px and up | Columns plus the **detail side panel** on the right (Part C) when an order is open.                                                                                                                                                                                                                                                                                                       |

**Starting soon strip:** above the columns, collapsed to one line ("3 starting soon · next 2:30 PM"); tap to expand. Each item there has a **Start now** button.

**Done today:** shows the last 10 with "Show all in History" (link to `?view=history`).

**Speed (required, the cloud check measures it):**

1. One shared clock: a `useNow(30_000)` hook for the page. No timers inside tickets.
2. Tickets are `React.memo` and only re-render when that order's `status`, `paymentStatus`, `seenAt` or `scheduledAt` changes, or the clock ticks.
3. Optimistic step changes through the O1 mutations; a failure rolls the card back and shows an error toast with Try again.
4. Polling through `useOpenOrders` (15 s, on focus, paused while hidden). No other polling.
5. Columns with more than 30 tickets use `content-visibility: auto` through a token utility (no inline style). No layout animation on the whole board.
6. Drag sensors only when `(pointer: fine)`; keyboard sensor always on.

**Sound and title (blueprint):** a "Turn on order sound" `Notice` until the first tap. Then a short chime (Web Audio API, no sound file, no package) when a new order appears. The tab title shows the open count ("(5) Orders · Kanto Smash Burgers"). The sidebar and dock Orders item shows the same count.

**Busy and pause:** a **Busy** button in the page header opens a small menu: Busy 15 min, Busy 30 min, Pause new orders, Resume. It calls `useSetPause` from O1. The header shows the state with icon + word ("Busy until 3:40 PM", "Paused").

**Dev Scenarios panel:** add buttons for Lunch rush, Empty day and New order every 20 s (O1 scenarios), next to the existing Slow and Error toggles.

## Part C: order detail

- Route `/orders/$orderId`. At 1280 px and up it opens as a side panel beside the board (the board stays usable). Below 1280 px it is a full page with Back to the same step and scroll (T47: router scroll restoration, search params kept).
- Opening it calls `markSeen` once.
- Content, top to bottom: the `full` ticket; the next-step button pinned in a sticky bottom bar on phones (48 px, ux.md section 7); payment (proof photo with zoom, reference with `CopyButton`, "Check this reference in your own GCash app", Approve or Reject with a reason; Record cash for cash and COD); delivery (rider name, phone, provider, tracking link; one sheet with its own Save, outside any form); the order steps as a ReUI **Timeline** (same look as the customer receipt, R48); the order thread; customer (name, phone as a tap-to-call link, Messenger link, Member badge); **Owner note** (Textarea, its own Save, "Only you see this").
- A **⋯ menu** (it has at least two actions): Cancel order, Print ticket (O5 wires it; hide until then), Change time (O4 wires it; hide until then).
- **Cancel:** `AlertDialog` with reason chips (Sold out, Shop closing early, Customer asked, Other with a Textarea) and a solid red "Cancel order" button. No Undo for cancel.

## Part D: Recall (T51)

- After any step change (button or drag), show a toast: "#012 moved to Ready" with one action **Recall**, for 5 seconds.
- Recall calls `recallOrder`. On `recall_expired`, say "Too late to recall. Change the step from the order."
- Timing (T51): the owner sees Recall for **5 seconds** (the toast closes then). The server accepts a recall up to **10 seconds** after the step, only as a grace for slow phones; never show Recall longer than 5 seconds.
- Only the latest step can be recalled, and only once.

## Part E: every state

Loading: skeletons in the board's shape (columns on desktop, the strip plus 3 tickets on phone). Empty day: `PageEmpty` "No orders yet. New orders show here as soon as customers place them." with **Share my shop** as the one action. Error: `PageError` with Try again. Offline: `Notice` "You're offline. Orders will refresh when you're back." and step buttons disabled with that reason. Closed shop: a `Notice` with the opening time. A filter with no matches: one line and "Show all types".

## Part F: words, tests, docs

- Words in `words.ts` (`ordersWords`), food and retail through `vocab()`, errors from codes.
- Tests: `apps/dashboard/test/orders-board.test.ts` for the column grouping per filter, the drop rules (next column only), recall timing and the ticket line cap. Add Playwright cases to `tooling/e2e/app.spec.ts`: advance an order on phone (390) and on desktop (1280), recall it, cancel with a reason, open detail and come back to the same step. Wait for card states, never fixed timeouts (the T46 flake lesson).
- `docs/components.md`: "Used in" for every reused part. `docs/ux.md` section 6 "Orders": the new tabs, chips, strip and Recall. `docs/PROGRESS.md`: `- [x] O3 Orders Now board, ticket and detail`. `docs/CHANGELOG.md`: one line.

## Part G: components to use (all installed)

ReUI Kanban, ReUI Icon Tile, ReUI Badge, Badge Overflow, ReUI Timeline, DiceUI Status, DiceUI Scroller, shadcn Tabs, Toggle Group, Card, Item, Button, `AsyncButton`, `CopyButton`, `notify` and `AppToaster`, `PageEmpty`, `PageError`, `Notice`, Skeleton, Sheet, `ResponsiveDialog`, Alert Dialog, Radio Group, Textarea, Field, Dropdown Menu, Tooltip, Attachment, Dialog (proof zoom), Message or Bubble (thread), Rating, Avatar. If something you need is not in this list, stop and ask.

## Rules for this task

- Feedback rules (ux.md section 8): no toast when the result shows where the owner tapped, except the Recall toast (it carries the Undo). Errors stay until closed. At most 3 toasts.
- Look: token classes only, no arbitrary values, no hex, no raw palette classes, no inline `style` except `cssVars()`. Lucide icons. 44 px targets and 16 px inputs on touch. 360 to 1280 px with no sideways page scroll (the board's own columns may scroll sideways on tablet). Motion under 400 ms, off for reduced motion. One filled blue button per view (T35): the next-step button of the open detail, or none on the board (board buttons use the secondary style).
- Types: no `any`, no `as`, no `@ts-ignore`. Imports: features never import each other; shared parts go in `apps/dashboard/src/app/`.
- No new packages. No database changes.

## Checks and push (decision T40)

- Do not run `pnpm check`, `pnpm build`, Playwright or screenshots. Run `pnpm format` before the last commit.
- Open `/orders` once as the Kanto account and once as the Tala account in the dev server: 0 console errors, 0 React warnings.
- Commit in small steps on `main`, `git push origin main`. No branch, no PR. Never force-push.
- The cloud thread runs check, build, e2e, a phone CPU-throttled performance pass on the rush scenario, and screenshots at 390 and 1280 for food and retail.

## Done when

- [ ] Now tab works on phone (strip), tablet (snap columns) and desktop (Kanban with snap-back, side panel at 1280).
- [ ] Every ticket uses the same zones; long text, big amounts and 40 lines fit at 360 px.
- [ ] Next step, Recall within 5 s, Cancel with a reason, payment check, cash, rider, owner note all work on the mock and survive a reload.
- [ ] Sound, tab count, Busy menu, type chips in the URL, Back to the same step and scroll.
- [ ] Every state in Part E. Words in `words.ts`. Docs updated.
- [ ] Pushed to `main`. Finish with: the commit list, what changed, how to test (Kanto lunch rush, Tala retail), and what I must do by hand.
