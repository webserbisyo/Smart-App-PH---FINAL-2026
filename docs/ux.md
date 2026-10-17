# UX rules

Read for every screen task. General rules only; each screen's prompt names its components.

## 1. Responsive plan

| Width                  | Dashboard nav                                                                                                                            | Storefront nav                                                                                                                                                  | Content                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Phone < 768 px         | Bottom dock: Home · Orders · Products · Customers · More (sheet with Reports, Settings). Top bar: title, Back on sub-pages, bell, avatar | Bottom tabs: Home · Menu/Products · Rewards · Orders (Account opens from the avatar; Rewards hidden when the stamp card is off). Cart bar floats above the tabs | One column, 16 px gutters                                                   |
| Tablet 768 to 1023 px  | Icon rail 72 px (sidebar collapsed); the toggle opens it over the page                                                                   | Bottom tabs stay (still a touch device)                                                                                                                         | Two columns where it helps (orders board 2 to 3 columns)                    |
| Laptop 1024 to 1279 px | Sidebar 248 px, collapsible to the rail, choice remembered                                                                               | Top navigation; item opens as a dialog, cart as a right drawer                                                                                                  | Board 4 columns                                                             |
| Desktop ≥ 1280 px      | Same sidebar; optional side panel (order detail next to the board)                                                                       | Same, plus a sticky 360 px cart column; content max 1120 px                                                                                                     | `PageBody` widths: full 1600, wide 1280, settings 880, form 720, narrow 480 |

- One nav per device: never a dock and a sidebar at the same time.
- Breakpoints by width; input sizes by pointer (`pointer: coarse` gets 44 px targets and 16 px text).
- Checkout and receipt are one column, max 640 px, at every width.

## 2. App-like feel on phones (both apps)

- `viewport-fit=cover` and `env(safe-area-inset-*)` padding under the dock, tab bar and cart bar (iPhone home bar). Viewport: `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`; never `maximum-scale` or `user-scalable`.
- `100dvh`, never `100vh` or `h-screen`, so the address bar doesn't cut layouts.
- Inputs at 16 px so iOS doesn't zoom; `inputmode` and `autocomplete` on phone, email, OTP and money fields.
- Hide the dock and bars while the keyboard is open (`visualViewport`), so they don't ride on top of the keyboard; the main action bar sits above the keyboard.
- Bottom sheets (drawer) instead of centred dialogs on phones: item sheet, cart, sign-in, filters. Every sheet sizes itself, stays inside the screen and has exactly one scroll area.
- Press states (`active:`), hover only under `@media (hover: hover)`; no grey tap flash (`-webkit-tap-highlight-color: transparent`); `touch-action: manipulation`.
- Page changes: View Transitions (React `<ViewTransition>`), fade and rise 8 px, off under reduced motion.
- Instant-feeling navigation: TanStack Router `preload: 'intent'`, Next `<Link>` prefetch, skeletons in the shape of the content, optimistic buttons.
- `theme-color` meta per shop (storefront) and for the dashboard; `overscroll-behavior: contain` in sheets.
- PWA install, offline page and icons come with the storefront install task (Serwist, decision T6).

## 3. States (every screen)

Loading skeleton · empty with one line and one action · error with Try again · offline · closed or paused shop · keyboard open · long text (one line with ellipsis on cards, full in sheets and detail) · big amounts (`₱12,345.50` fits, prices never wrap) · dark mode (dashboard). Lists end with a footer, not blank space.

## 4. Accessibility

- AA contrast (4.5:1 text, 3:1 borders, focus rings and chart marks); a visible focus ring on every control.
- Icon-only buttons have an `aria-label` and a tooltip.
- Fields have a label and an error linked by `aria-describedby`.
- Checkout and every form work with the keyboard alone; sortable lists move with Space and Enter.
- `<title>` per route (the item name, not "Edit"); `lang` set.
- Charts: one y-axis, a tooltip and one screen-reader sentence.

## 5. Layout and input

- One filled button per screen; main actions at the bottom in thumb reach; Cancel and Delete small, inside a More menu.
- A disabled button says why ("You're offline", "Closed now", "Choose a size"). Hide options that can't apply (for example payment methods an order type doesn't allow).
- Forms in groups of 5 to 7 fields; each settings section saves on its own.
- Destructive actions confirm with a reason. Order steps only move forward; there is no Undo.
- Forgiving input: phone accepts 0917…, 917… or +63…; money accepts "₱120" and "120.50"; references ignore spaces.
- Toasts: bottom centre above the dock on phones, bottom right on desktop; success closes after 3 s, errors stay; at most one action.

## 6. Screen notes (rules, not components)

**Storefront**

- Home: banners (up to 3), announcement, reward card or "Join and get 1 free stamp", categories, best sellers, About, hours and contact. A closed shop says so and add buttons say why.
- Menu: sticky search and categories; "+" adds at once when there is one variant and no required add-ons, otherwise opens the item; sold-out items stay, greyed; `?item=<id>` opens an item.
- Item: required choices first; a missing one scrolls to it and the button says what to choose; note up to 120 characters.
- Cart: saved on the device per shop; missing or sold-out lines are flagged and left out of the total.
- Checkout: one page (how, who, pay); re-quoted before Place order; pickup slots start 20 min out, today or tomorrow, inside hours; transfers show "Send exactly ₱345" with Copy.
- Receipt: big order number, live status (15 s poll fallback), upload proof → "Checking your payment" → rejected reason with Upload again; "ORDER SLIP · NOT AN OFFICIAL RECEIPT" on slips; install card after the first order.
- Account: 6-digit code with a 60 s resend timer; stamp card; confetti once when a reward is ready.

**Dashboard**

- Owner auth: narrow card, show/hide password, reset by code (no links), Setup, Pending and Suspended screens. Shop status re-checked every 30 s and on focus.
- Orders: open-order count in the nav and tab title; "Turn on order sound" until the first tap; order age amber at 10 min, red at 20; one next-step button from core `nextActions()`; Cancel needs a reason.
- Order detail: proof zoom, reference with Copy, "Check this reference in your own GCash app", Approve or Reject with a reason.
- Home: setup checklist until done; attention items hidden at 0; today's numbers; no % comparisons or date pickers (an empty new day looks calm).
- Products: Visible and Sold out switches inline; up to 5 photos; an item with orders is archived, not deleted; leave guard on unsaved edits.
- Settings: sections with their own Save; a live phone preview for the shop look with a contrast warning.
