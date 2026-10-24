<!-- prettier-ignore-start -->
Task T10: Receipt (status, pay countdown, proof upload, thread, Messenger, save and share)

Read first: AGENTS.md, docs/ux.md, docs/components.md, docs/api.md, docs/prompts/ref/storefront-rules.md sections 5 and 7, docs/prompts/ref/storefront-components.md sections 3 (Receipt) and 4 (pay-countdown, messenger-handoff, proof-uploader), docs/SMART_APP_PH_BLUEPRINT.md sections 6.1, 6.6, 6.16, 6.17, 7.8, 8.2 and 8.8.

FOUNDER DECISIONS USED (change before running)
 - D10: the status track is c-stepper-26 (timestamped steps); c-stepper-3 and c-timeline-3 stay on /kit.
 - D4: the receipt body is the vendored Opensource UI Thermal Receipt (packages/ui/src/vendor), mapped to our tokens, footer "ORDER SLIP · NOT AN OFFICIAL RECEIPT".
 - D7: proof photos are compressed on the phone with a small canvas helper compressImage() in packages/data (longest side 1600 px, WebP or JPEG about 0.8, under 1 MB); no new package.
 - Save receipt is a server PNG from next/og ImageResponse at /[shop]/o/[token]/image (no html-to-image package).
 - Messenger hand-off copies the order text first, then opens m.me/<page>?text=… in the same tap; the text never includes the address or phone.
 - A dev-only "Demo owner" panel on the receipt moves the mock order forward (approve, reject, ready, out for delivery, complete, cancel and refund) so every state can be seen without the dashboard. It never ships in a production build.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

GOAL
After Place order the customer always knows: their order number, what to do next (pay, upload, wait, pick up), what the shop has done, and how to reach the shop, even on slow data or offline.

0. BEFORE YOU CODE
 - Branch ag/t10-receipt from the latest main (after T09). Node 24.14.0. Post a short plan (files, components, routes) and wait for my OK. Never touch dashboard shell styling.

1. ROUTE /[shop]/o/[token] (features/receipt; dynamic, never cached; one column max 640 px; no dock)
 - Unknown or expired token → c-empty-7 pattern "We can't find this order" + Back to the shop. Guest tokens are saved with useSavedReceipt / guestOrderTokens (90 days).
 - Just placed (?new=1 set by checkout, removed with replace): c-alert-6 pattern "Order placed" with the success-check motion recipe (off under reduced motion). Focus moves to the order number.
 - Header: big daily number "#042" (tabular, Copy with the c-button-41 pattern), order type and place, scheduled time when set ("Pickup · Tomorrow 7:00 AM"), QR of the receipt link (DiceUI qr-code, 160 px, label "Show this at the counter").
 - Status track (c-stepper-26 pattern): placed → payment checked (transfers) → preparing (vocab: Kitchen or Packing word) → ready / out for delivery → completed, each with its Manila time; current step announced through role status when it changes. Cancelled replaces the track with the cancel or refund alert.
 - Body (Thermal Receipt): items with variant, options and note, quantity, line totals, subtotal, reward discount, delivery fee, total, payment method and status. ₱12,345.50 and 20 lines never overflow at 360 px.

2. PAY WITHIN 25:00 (transfers only)
 - pay-countdown composition (c-alert-7 + c-progress-2 patterns): "Pay within 24:13" from expiresAt; ticks once a second with tabular digits; announces only at 10 min, 5 min and 1 min; at 0 → c-alert-8 pattern "Payment time is over. This order was cancelled." (state comes from the server/mock, the timer only shows it).
 - Shows the shop's account details again with Copy, the shop QR picture if set, and "Send exactly ₱345" with Copy.

3. PROOF UPLOAD (proof-uploader composition)
 - attachment + c-attachment-6 (picker, "Upload proof of payment", camera or gallery, image only) + c-attachment-5 (progress row) patterns.
 - Five states: idle → compressing → uploading (progress) → "Uploading… retrying" (automatic retries 2 s, 4 s, 8 s while online; paused offline with "Will retry when you're back online") → done "Proof sent. The shop will check it." Failed after retries → Try again.
 - Up to 3 proofs (4th → too_many_proofs message); only while unpaid; duplicate reference → its error message. A proof never marks the order paid; the line reads "Waiting for the shop to check your payment".
 - Rejected (c-alert-4 pattern): "Payment not accepted · Reason: amount is short" + Upload again. Refunded (c-alert-5 pattern): "Cancelled · Refunded ₱345 · Reason: …".
 - Nothing is stored on the phone except the upload state; no photos in deviceStorage.

4. ORDER THREAD (read-only in A)
 - c-message-5 pattern bubbles for proofs (thumbnail through ShopImage, tap to view full), c-marker-2 pattern system lines with times: status changes, payment approved / rejected / refunded, rider name and phone (tel: link), tracking link (c-item-4 pattern, opens in a new tab). Loading: c-skeleton-10 pattern. No chat input.

5. ACTIONS
 - Continue in Messenger (messenger-handoff composition): one tap copies "Order #042 · 2 items · ₱345 · <receipt link>", shows "Copied. Paste it in Messenger." and opens m.me/<page>?text=… ; when copy fails, the text shows in a selectable box. Hidden when the shop has no Messenger page.
 - More menu (c-dropdown-menu-13 pattern): Copy order details, Save receipt (downloads the PNG from /image), Print or Save as PDF (print stylesheet: receipt only, no buttons), Share link (Web Share API, fallback Copy link).
 - Notify me (c-switch-2 pattern): calls subscribePush (no-op in mock) and says "We'll tell you when it's ready"; hidden when the browser has no push. Real push is MVP A later (T13 adds the service worker).
 - Join to earn stamps (guests, stamp card On): card linking to the T12 join flow with the order kept. Members: "This order earns 1 stamp · Pending until completed".
 - Order again: copies the lines into the basket (flagged lines handled by T08 rules) and opens the basket.
 - After completed: rating with DiceUI rating (1 to 5, keyboard) + comment c-textarea-6 pattern (300) + Send; once sent it shows "Thanks for rating" with the stars; "Review us on Google" link when the shop set one.
 - Install card (c-alert-18 pattern, shown once after the first order when not installed): "Add Kanto Smash to your home screen" + Install (beforeinstallprompt when available) or iPhone steps (c-stepper-13 pattern). Dismiss is remembered. T13 wires the real install; here the card and its states.

6. RECEIPT IMAGE /[shop]/o/[token]/image
 - next/og ImageResponse, 1080 wide, shop colours and logo (or initials), number, type, items, totals, payment status, QR, the footer line. Fonts from packages/ui. Cache-Control private, no-store. Unknown token → 404.

7. OFFLINE AND POLLING
 - Live status: useOrder polls every 15 s (the mock has no Realtime; the API task adds Realtime with this poll as the fallback), while the order is open, stops when it ends; on reconnect it refreshes at once.
 - Offline: the saved copy shows number, QR, items and totals with "Last updated 3:42 PM" and the offline banner; upload waits; actions that need the network are disabled with the reason.

8. DEV "DEMO OWNER" PANEL (dev only)
 - A small collapsible panel at the bottom, only when NODE_ENV is not production and DATA_SOURCE is mock: buttons from the owner order adapters (Approve payment, Reject with reason, Record cash, Start preparing, Ready, Out for delivery with rider + link, Complete, Cancel, Cancel and refund). Steps only move forward; disabled ones say why.
 - CI build scan: add "Demo owner" and "demo-owner-panel" to the list that must not appear in the production build.

9. STATES
 - Loading: c-skeleton-3 pattern. Error: Try again. Long shop name, long notes and 20 lines wrap or clamp. Every DEMO_RECEIPTS token opens and looks finished at 360 and 1280 px.

10. TESTS
 - Unit: countdown formatting and announce points; proof-uploader state machine (retry timing with fake timers, offline pause, max 3); Messenger text (no address, no phone); compressImage keeps aspect ratio and stays under 1 MB (jsdom canvas stub or a pure size calculator test).
 - e2e: add every DEMO_RECEIPTS token for kanto-smash and tala-apparel to routes.ts. Place a GCash order in kape-juan → receipt shows the countdown → upload a fixture image → "Proof sent"; Demo owner approve → "Payment checked"; reject → reason + Upload again; refund → refund alert; /image returns image/png; offline (setOffline) shows "Last updated"; Messenger button copies text (clipboard permission in the test context).

11. DOCS
 - components.md "Used in" (receipt patterns, Thermal Receipt, proof-uploader, pay-countdown, messenger-handoff). docs/decisions.md: N32 The receipt PNG is made on the server with next/og; no screenshot package. N33 Proof photos are compressed on the phone by a small canvas helper; no compression package. Tick T10 in PROGRESS.md, one CHANGELOG line.

DONE WHEN
 - Every receipt state (all DEMO_RECEIPTS tokens) is reachable and looks finished at 360, 390, 768, 1024 and 1280 px; a transfer order goes placed → proof → approved → completed → rated in the mock with the Demo owner panel; the production build has no Demo owner code.

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint, pnpm build and pnpm e2e green. Never weaken eslint or tsconfig, never skip a test. No workarounds: stop and show me any error.
 - Screenshots at 390 and 1280: just placed with countdown, proof uploading/retrying, rejected, out for delivery with rider, completed with rating, refunded, offline copy, the PNG. gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test (with the demo tokens), what I must do by hand.

OUT OF SCOPE: My orders list (T11), join flow (T12), real web push and the service worker (T13), chat posts, customer cancel, live rider map, the owner dashboard order screens.
<!-- prettier-ignore-end -->
