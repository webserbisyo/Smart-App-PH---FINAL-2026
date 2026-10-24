<!-- prettier-ignore-start -->
# Storefront rules for MVP A (short form)

Source: Storefront Blueprint (MVP A) v1.4, approved by the founder (S1 to S36, 20 and 23 Oct 2026), plus `docs/SMART_APP_PH_BLUEPRINT.md` sections 4, 6, 7 and 8. Agents read this file instead of the Google Doc. If this file and `docs/` disagree, stop and ask.

## 1. Shell (S1, 7.1)
- Top bar: logo, shop name, open state ("Open until 9 PM", "Closed · Opens 5 AM", "Busy · back 3:40 PM"), avatar (Account or Join). No bell (Storefront Blueprint v1.4 section 5; order updates live on the receipt and My orders).
- Location bar: one line under the shop name on phones, inside the top navigation on desktop: "Delivery to Marikina · 2.4 km · ₱49", "Pickup · ASAP", "Walk-in". Tapping it opens the "How and where" sheet. Order type and last address are remembered per shop on the phone.
- Phone dock: one floating pill (shared `bottom-dock`) with Home, Menu or Products, Rewards (hidden when the stamp card is Off), Orders. When the basket has items the pill grows a cart segment: stacked thumbnails (up to 3) + count + ₱ total, which opens the basket. Hidden on the item sheet, checkout and receipt, and while the keyboard is open.
- Desktop (1024 px+): top navigation, content max 1120 px; basket as a right drawer 1024 to 1279 px, sticky 360 px column from 1280 px. Checkout and receipt: one column, max 640 px.

## 2. How and where sheet (S27, S28)
- Tabs: Walk-in, Pickup, Delivery (only the types the shop allows right now).
- Pickup: ASAP ("Ready in about 20 min", one prep time, S16) or a slot today or tomorrow, inside hours, from prep time out; closed shop: next-opening slots only (N1).
- Delivery in the same sheet: "Use my location" (asks for GPS only on tap), "Fix pin in Google Maps" (opens Google Maps at the spot; customer pastes the shared link back), or pick a named zone; then rider details (address line, house no., floor, landmark).
- Fee: straight-line distance from the shop pin, rounded to 0.1 km, matched to the shop's distance rows (e.g. 0–3 km ₱49, 3–5 km ₱79); beyond the rows or no spot: named zone with flat fee; nothing fits: "Too far for delivery (8.2 km, this shop delivers up to 6 km)" + switch to Pickup. No map inside the app, no Maps API, no geocoding. The server always recomputes.

## 3. Catalog (N4, S18, S19)
- Up to 2 variant axes, at most 30 variants; impossible combinations greyed "Not available". Add-on groups with min/max ("Required · Choose 1", "Optional · Up to 3", "Choose 2 to 4"); options ₱0 or more ("Free"); defaults pre-selected.
- Availability: Available, Sold out today (back on by itself at the next opening), Sold out. No stock counts in A.
- Line identity = item + variant + sorted option ids + note; identical lines merge. Note up to 120 characters. Quantity 1 to 99. "Goes well with" up to 4 items.

## 4. Basket, checkout, offline (N1, N2, S32)
- Basket on the phone per shop (deviceStorage, versioned). Flagged lines (sold out, price changed, option gone) show the reason and are left out of the total.
- Checkout one page: How (from the location bar), Who (name, mobile 09xx/9xx/+63, optional email, "Remember me on this phone" on), Pay (methods the type allows), order note (also for "order for someone else"), totals, consent line with the privacy link, Place order. Quote on open, on change (debounced) and before placing. A disabled Place order always says why.
- Payments: cash, COD (delivery only, under the COD limit; above it "Orders above ₱3,000 need payment first"), GCash, Maya, Bank, QR Ph (S15). Transfers show the account, the shop's QR, "Send exactly ₱345" with Copy. Text only, no payment brand logos.
- Offline: saved menu shows, basket and checkout fill work, Place order off with the reason, re-quote on reconnect, nothing sent in the background.

## 5. Receipt (S7, S8, S29 to S31, N11)
- Big daily order number (#042) and type, QR of the receipt link, scheduled time, status track with times, items, totals, payment status.
- Transfer unpaid: "Pay within 25:00" countdown; proof upload (compressed on the phone, retries by itself, "Uploading… retrying"), up to 3 proofs; rejected → reason + Upload again; refunded → "Cancelled · Refunded ₱345 · Reason: …".
- Order thread: proof first, then system lines (status, payment approved/rejected/refunded, rider name/phone, tracking link). No chat posts in A.
- Continue in Messenger: one tap copies the order text, then opens `m.me/<page>?text=…` (copy first, same tap). Text has no address or phone.
- Save receipt (server PNG at `/[shop]/o/[token]/image`), Print or Save as PDF, Share link, Notify me, Join to earn stamps, Order again, rating 1–5 + comment (300) after completion, "Review us on Google" if set. Footer "ORDER SLIP · NOT AN OFFICIAL RECEIPT".
- Offline receipt (S30): number, QR, items and totals kept on the phone, "Last updated 3:42 PM".

## 6. Members and stamps (S20 to S26, S33, S34)
- Join with a 6-digit email code; Resend after 60 s; "Wrong code, try again", "This code expired. We sent a new one.", note to check Spam or Promotions. 1 welcome stamp.
- Stamps only for completed paid orders over the minimum; "Pending · Order #042" until completed (S34); max earned per member per day/week/month (default 1 per day): "You already earned today's stamp."
- Card status Off (tab hidden; direct link shows "This shop has no stamp card right now"), On, Paused ("Stamps paused. Your stamps are safe."; ready rewards still usable).
- One active reward: discount, free item ("Free item sold out today" keeps it for next time) or custom prize (Claim → code + QR).
- Limited prizes (S26): "Only 100 pieces", then "23 left" at 20% or less, "All 100 claimed. Your stamps are safe." at 0.
- History: welcome, pending, earned (order no.), redeemed, reversed, "Given by the shop" / "Removed by the shop" with the reason category (never the owner's private note).
- Confetti once when a reward becomes ready; never under reduced motion.

## 7. Phone data (8.2, 11)
deviceStorage keys per shop, versioned: basket, favourites, checkout draft, last address, order type, guest order tokens (90 days), saved receipts (7 days after the order ends). No proofs or photos stored.

## 8. Not in A (never build)
In-app map, saved places list, chat posts, option templates, location circle, recipient fields, stamp start/end dates, grace days, reward pickup windows, long-distance switch, pickup suggestions, busy prep time, coupons, stock counts, branches, live rider map, customer cancel, Google sign-in for customers.
<!-- prettier-ignore-end -->
