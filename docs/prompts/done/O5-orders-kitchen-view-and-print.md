# O5 Orders: Kitchen view, printed ticket and Find order

Prompt 5 of 6 for the Orders page. 2026-11-02. Paste after O4's cloud check is green.

Copy everything below the line into Antigravity.

---

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

You are adding three things for the people actually making and handing over orders:

1. **Kitchen view** (food) / **Packing view** (retail): a full-screen wall of tickets for a tablet or old phone propped by the grill or the packing table. A cook with wet hands, standing a metre away, must read it and move an order with one tap.
2. **Printed ticket** for shops with a small thermal printer (58 or 80 mm), through the browser's print dialog.
3. **Find order**: at hand-over, the owner types the customer's 4-character pickup code (shown under the QR on the customer's receipt) and the order opens.

## Read first

- `AGENTS.md`, `docs/ux.md` (sections 2, 4, 7, 8), `docs/decisions.md` N13 (the Editor opens outside the shell), T48 to T53
- `apps/dashboard/src/app/orders/order-ticket.tsx` (O3; you add the `kitchen` and `print` sizes)
- `apps/dashboard/src/features/orders/` (O3 and O4 screens) and `apps/dashboard/src/app/router.tsx`
- `packages/ui/src/vendor/opensource-ui/thermal-receipt.tsx` and how the storefront prints: `apps/storefront/src/features/checkout/components/order-printer.tsx`, `apps/storefront/src/features/receipt/components/thermal-slip.tsx`, and the print rules in `packages/ui/src/styles/globals.css`
- `packages/ui/src/components/qr-code.tsx` (DiceUI QR Code)

## Already decided (do not re-argue)

- Kitchen view is a **mode of the Now board**, not a staff app: same data, same rules, owner login. Staff roles stay in MVP B.
- Words come from `vocab()`: food "Kitchen view", retail "Packing view".
- No printer integration, no new package: print uses the browser print dialog and our one stylesheet.

## Step 0: scan, plan, then STOP

`git checkout main && git pull`, read the files above, post a short plan (files, components, anything that doesn't match). **STOP and wait for my OK.**

## Part A: Kitchen view (`/orders/kitchen`)

- Opens from a **Kitchen view** button in the Orders page header. Full screen outside the dashboard shell, like the Editor (N13): no sidebar, no dock. One **Exit** button top left, and Esc on a keyboard.
- **Dark by default** (the dashboard dark tokens), with a light switch remembered on the device.
- **Tickets, oldest `startBy` first, left to right, then wrapping:** 1 column on a phone, 2 on a portrait tablet, 3 or 4 on a landscape tablet or laptop. Only New and Preparing (or Packing) orders, plus scheduled orders once `orderTiming` says `active`. Ready orders show in a thin row at the bottom ("Ready: #009 #011") until handed over.
- **`kitchen` ticket size:** the O3 zones without money and without the payment chip. Quantity and item name at least `text-2xl` with weight 700 for the quantity; variant and add-ons `text-lg`; notes in an amber band with an icon. Type icon and word, number and age chip in the header, larger. Every line of the order, never "+3 more".
- **One tap on the ticket's big button** moves it one step (Start, then Ready), with the 5-second **Recall** toast from O3 at the top of the screen. Tapping elsewhere on the ticket toggles a line check (a strike-through on that line, for the cook's own tracking). Line checks are kept only on this device in `deviceStorage` and never sent to the server.
- **Screen stays on:** ask for a Screen Wake Lock when the view opens and again when it becomes visible. If the browser refuses or lacks it, show a small `Notice` "Keep this screen on in your phone's settings." once.
- New orders chime (the O3 sound), slide in at the end, and pulse their border once (under 400 ms, off for reduced motion). No looping animation.
- Uses `useOpenOrders` polling (15 s, on focus). Offline: a `Notice` at the top, buttons disabled with the reason.
- Type chips from O3 at the top, so a delivery-only packer can filter.

## Part B: printed ticket

- **Print ticket** in the detail ⋯ menu (O3 left the slot hidden; show it now), and a print icon on each Kitchen view ticket.
- `print` ticket size: black on white at any theme, monospace, the shop name, `#012`, type word, due time (and date when not today), customer name, every line with quantity, variant, add-ons and notes, the order note, the total and payment word, then the **QR of the order's receipt link** and the pickup code in large letters. 58 mm and 80 mm both fit (use print rules in `globals.css`, the same way the storefront slip prints). Reuse `ThermalReceiptCard` if it fits these fields; if not, compose from `Item` and `Separator` and tell me why.
- Prints only the ticket, never the page around it.

## Part C: Find order

- A **Find order** button in the Orders page header opens a `ResponsiveDialog` with one input: "Pickup code or order number". 16 px text, `autocapitalize="characters"`, ignores spaces and lower case.
- Calls `useFindOrder`. One match opens order detail with its next step ready (for a Ready order: **Hand over** → Completed). Several matches list them as `card` tickets. None: "No order with that code today. Check the code on the customer's receipt."
- **Scan** button inside the dialog only where the browser has the built-in `BarcodeDetector` (check with feature detection; no package). It reads the QR, takes the token from the receipt link, and finds the order. Another shop's order shows "Not found" (rule 12). Where `BarcodeDetector` is missing, hide the button; never show a broken one.

## Part D: tests and docs

- Tests: `apps/dashboard/test/orders-kitchen.test.ts` (which orders show, order of tickets, line checks stay local), `orders-find.test.ts` (code normalising, one, many and no matches). Playwright: open Kitchen view on a 390 phone and a 1280 screen, Start then Ready an order, Recall it, Exit back to Now; Find order by code as Kanto.
- `docs/ux.md` section 6 "Orders": Kitchen view, print, Find order. `docs/components.md`: "Used in" updates. `docs/PROGRESS.md`: `- [x] O5 Orders Kitchen view, print and Find order`. `docs/CHANGELOG.md`: one line.

## Rules for this task

- Installed parts only (`OrderTicket`, DiceUI QR Code, `ThermalReceiptCard`, Item, Separator, Button, `AsyncButton`, `notify`, `Notice`, `ResponsiveDialog`, Input, Field, Toggle Group, Skeleton). Never edit installed files.
- Look and feedback rules as in O3. Touch targets in Kitchen view at least 56 px (wet hands); the main button full width.
- No new packages, no database changes, no customer phone or address anywhere in Kitchen view (customers can see the screen).

## Checks and push (decision T40)

- Do not run `pnpm check`, `pnpm build`, Playwright or screenshots. `pnpm format` before the last commit.
- Open Kitchen view once as Kanto and once as Tala (Packing view) in the dev server, and print-preview one ticket: 0 console errors.
- Commit on `main`, `git push origin main`. No branch, no PR. Never force-push.

## Done when

- [ ] Kitchen and Packing view work full screen on phone, tablet and laptop, readable from a metre away, one tap per step, Recall, wake lock, local line checks.
- [ ] Print ticket fits 58 and 80 mm with QR and pickup code, and prints only the ticket.
- [ ] Find order works by code and number; Scan shows only where supported.
- [ ] Docs updated. Pushed to `main`. Finish with: the commit list, what changed, how to test, and what I must do by hand.
