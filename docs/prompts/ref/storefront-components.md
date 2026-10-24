<!-- prettier-ignore-start -->
# Storefront component plan (179 parts)

Source: UI research passes 1, 2 and 3 (24 Oct 2026). Every id below was opened on its registry on 24 Oct 2026 and returned 200. Install with the pinned CLI: `pnpm exec shadcn add <names> -c <target>`. Screens use our wrapped versions; each prompt names the parts it uses.

## 1. Totals

| Library | Count | Goes to |
| --- | --- | --- |
| shadcn/ui primitives (Base UI, base-nova) | 34 (14 new to the repo, 20 already installed) | `packages/ui/src/components` |
| ReUI primitives (pulled in by the examples: badge, alert, stepper, timeline, number-field, scrollspy, icon-tile, frame) | 8 | `packages/ui/src/components` |
| ReUI examples `c-*` (patterns with sample data) | 119 | dashboard `/kit` only: `apps/dashboard/src/features/kit/examples/` (decision D1) |
| DiceUI (Base UI builds) | 12 | `packages/ui/src/components` |
| Magic UI | 3 | `packages/ui/src/components`, lazy-loaded |
| Opensource UI (copy-paste, founder-approved) | 3 | `packages/ui/src/vendor/opensource-ui/` |
| **Total** | **179** (pass 3's 178 + `c-stepper-26`, decision D10) | |
| Fluent Emoji Flat SVG | 52 keys (50 files) | `apps/storefront/public/icons/fluent/` |

New npm packages (all checked on registry.npmjs.org, 24 Oct 2026; none sets a Node limit that blocks 24.14): `embla-carousel-react` 8.6.0 MIT, `embla-carousel-autoplay` 8.6.0 MIT, `@diceui/checkbox-group` 1.0.0 MIT, `input-otp` 1.5.0 MIT, `qrcode` 1.5.4 MIT (+ `@types/qrcode`), `canvas-confetti` 1.9.4 ISC (+ types), `motion` 14.6.0 MIT (Number Ticker only, Rewards route only), `@base-ui/utils` 0.5.0 MIT. Dev only: `sharp` 0.35.5 Apache-2.0 (Node >= 20.9), `@playwright/test` 1.64.1 Apache-2.0 (Node >= 20). Never `sonner`, `vaul`, `react-phone-number-input`, `libphonenumber-js` (via ReUI phone input) or a map SDK.

## 2. Install lists

shadcn primitives (34; the CLI skips the 20 already installed):
```
pnpm exec shadcn add button avatar badge card drawer dialog sheet toast skeleton empty item field input input-group input-otp textarea radio-group checkbox toggle toggle-group tabs table progress spinner aspect-ratio alert-dialog dropdown-menu attachment separator carousel native-select switch popover scroll-area message bubble marker tooltip collapsible -c packages/ui
```
(`dialog`, `sheet`, `tooltip`, `collapsible` and `badge` are already installed and listed so nothing is missing; the count of 34 is the research list.)

DiceUI (12):
```
pnpm exec shadcn add @diceui/hitbox @diceui/pending @diceui/scroller @diceui/status @diceui/banner @diceui/mask-input @diceui/circular-progress @diceui/qr-code @diceui/rating @diceui/checkbox-group @diceui/client-only @diceui/skip-nav -c packages/ui
```

Magic UI (3):
```
pnpm exec shadcn add @magicui/confetti @magicui/number-ticker @magicui/grid-pattern -c packages/ui
```

ReUI examples (119), from the dashboard so the example files land in the dashboard and their primitives in `packages/ui` (T02b):
```
pnpm exec shadcn add @reui/c-alert-4 @reui/c-alert-5 @reui/c-alert-6 @reui/c-alert-7 @reui/c-alert-8 @reui/c-alert-18 @reui/c-alert-dialog-2 -c apps/dashboard
pnpm exec shadcn add @reui/c-aspect-ratio-2 @reui/c-aspect-ratio-3 @reui/c-aspect-ratio-4 @reui/c-attachment-5 @reui/c-attachment-6 -c apps/dashboard
pnpm exec shadcn add @reui/c-avatar-4 @reui/c-avatar-6 @reui/c-avatar-11 @reui/c-avatar-14 @reui/c-avatar-16 @reui/c-avatar-20 @reui/c-avatar-30 @reui/c-avatar-35 -c apps/dashboard
pnpm exec shadcn add @reui/c-badge-7 @reui/c-badge-13 @reui/c-badge-14 @reui/c-badge-15 @reui/c-badge-17 @reui/c-badge-19 @reui/c-badge-22 -c apps/dashboard
pnpm exec shadcn add @reui/c-button-9 @reui/c-button-11 @reui/c-button-19 @reui/c-button-24 @reui/c-button-27 @reui/c-button-35 @reui/c-button-41 @reui/c-button-44 @reui/c-button-49 -c apps/dashboard
pnpm exec shadcn add @reui/c-card-1 @reui/c-card-7 @reui/c-card-16 @reui/c-card-17 @reui/c-carousel-5 @reui/c-carousel-11 -c apps/dashboard
pnpm exec shadcn add @reui/c-checkbox-5 @reui/c-checkbox-11 @reui/c-checkbox-19 @reui/c-collapsible-1 @reui/c-dialog-3 @reui/c-drawer-1 @reui/c-drawer-2 -c apps/dashboard
pnpm exec shadcn add @reui/c-dropdown-menu-13 @reui/c-dropdown-menu-16 @reui/c-empty-2 @reui/c-empty-4 @reui/c-empty-7 @reui/c-empty-9 @reui/c-empty-11 @reui/c-empty-15 @reui/c-empty-20 -c apps/dashboard
pnpm exec shadcn add @reui/c-field-2 @reui/c-field-10 @reui/c-frame-1 @reui/c-icon-tile-6 @reui/c-icon-tile-14 @reui/c-icon-tile-16 -c apps/dashboard
pnpm exec shadcn add @reui/c-input-2 @reui/c-input-5 @reui/c-input-13 @reui/c-input-18 @reui/c-input-group-3 @reui/c-input-group-5 @reui/c-input-group-10 @reui/c-input-group-15 @reui/c-input-group-24 @reui/c-input-group-37 @reui/c-input-otp-6 -c apps/dashboard
pnpm exec shadcn add @reui/c-item-1 @reui/c-item-2 @reui/c-item-4 @reui/c-item-10 @reui/c-marker-2 @reui/c-message-5 @reui/c-native-select-2 @reui/c-number-field-2 @reui/c-number-field-3 @reui/c-progress-2 -c apps/dashboard
pnpm exec shadcn add @reui/c-radio-group-3 @reui/c-radio-group-4 @reui/c-radio-group-6 @reui/c-radio-group-7 @reui/c-radio-group-8 @reui/c-radio-group-9 @reui/c-radio-group-15 @reui/c-radio-group-17 -c apps/dashboard
pnpm exec shadcn add @reui/c-scrollspy-1 @reui/c-scrollspy-2 @reui/c-separator-6 @reui/c-skeleton-2 @reui/c-skeleton-3 @reui/c-skeleton-4 @reui/c-skeleton-7 @reui/c-skeleton-8 @reui/c-skeleton-9 @reui/c-skeleton-10 -c apps/dashboard
pnpm exec shadcn add @reui/c-spinner-3 @reui/c-spinner-8 @reui/c-stepper-3 @reui/c-stepper-13 @reui/c-stepper-26 @reui/c-switch-2 @reui/c-table-16 @reui/c-tabs-2 @reui/c-tabs-7 @reui/c-textarea-6 -c apps/dashboard
pnpm exec shadcn add @reui/c-timeline-3 @reui/c-timeline-7 @reui/c-toggle-6 @reui/c-toggle-9 @reui/c-toggle-group-4 @reui/c-tooltip-12 -c apps/dashboard
```

Opensource UI (copy-paste from the official page, recoloured to tokens, source URL and date at the top of the file):
- Add to Cart (raised 3D press): https://opensourceui.in/components/add-to-cart-button → item sheet "Add · ₱289"
- Thermal Receipt: https://opensourceui.in/components/thermal-receipt → receipt body
- Like Toggle: https://opensourceui.in/components/like-button → `/kit` only (particles; the app uses `c-toggle-9`)

## 3. Where each part is used (screen → pattern)

| Screen | Parts (wrapped from the patterns on /kit) |
| --- | --- |
| Shell (T04) | top bar logo `c-avatar-4` (square) / `c-avatar-14` (initials fallback) / `c-avatar-30` (loading); location bar `c-button-19` (pill, chevron); storefront dock: links like `c-button-27`, cart segment `c-avatar-11` + count `c-badge-19`; toasts `toast` via `notify()`; offline `@diceui/banner`; `@diceui/skip-nav`; `@diceui/client-only` for basket count and hearts; `@diceui/hitbox` on small icon buttons; Back `c-button-49`; icon tooltips and disabled reasons `c-tooltip-12`; basket drawer on desktop `c-drawer-2`; first load `c-spinner-8`; Not found `c-empty-7` |
| How and where sheet (T04, T09) | `drawer` (phone) / `dialog` (desktop) through `responsive-dialog`; order type `c-radio-group-7`; ASAP or later `c-radio-group-3`; slots `c-native-select-2`; zones `c-radio-group-8`; Use my location `c-button-44`; pin link `c-input-group-10` + `c-input-group-24` (valid) + `c-input-group-3` (invalid); rider details `c-field-2` + `c-input-13` + `c-input-18`; too far / denied `c-alert-7` / `c-alert-8`; fee line `c-item-1` |
| Home (T06) | banners `c-carousel-11` + autoplay as in `c-carousel-5`, frame `c-aspect-ratio-4`; no banner: `@magicui/grid-pattern` + `c-avatar-14`; open state `@diceui/status`; announcement `c-alert-5` / `c-alert-7` / `c-alert-6`; reward or join card `c-card-17` + `@diceui/circular-progress`; favourites and best sellers `@diceui/scroller` + `c-card-7`; categories `c-button-27` + Fluent icons; members count `c-avatar-20`; about `c-button-35`; hours `c-table-16`; contact `c-item-4`; loading `c-skeleton-8`; closed `c-empty-20` |
| Menu (T07) | search `c-input-group-37` (search + clear; drop its popover) + `c-input-group-15` (loading); chips `c-scrollspy-2` in `@diceui/scroller`; desktop rail `c-scrollspy-1`; Favourites chip `c-toggle-6`; grid photo `c-aspect-ratio-3`; card `c-card-7`; row `c-item-2`; badges `c-badge-14` (sold out), `c-badge-13` (new, best seller), `c-badge-7` (sample, preview only); "+" `c-button-11`; heart `c-toggle-9`; loading `c-skeleton-7`; no results `c-empty-2`; no products `c-empty-15` |
| Item sheet (T07) | phone `c-drawer-1`, desktop `c-dialog-3`; photos `c-carousel-11` (no autoplay) in `c-aspect-ratio-2`; retail axes `c-toggle-group-4`; food sizes `c-radio-group-17`; group header `c-radio-group-6` + `c-checkbox-19`; multi add-ons `@diceui/checkbox-group` with `c-checkbox-11` rows; missing required `c-radio-group-4`; note `c-textarea-6`; qty `c-number-field-3`; Add `Opensource UI Add to Cart` in `@diceui/pending`; heart `c-toggle-9`; loading `c-skeleton-2` |
| Basket (T08) | lines `c-item-2` + `c-number-field-2` + remove `c-button-24` (Undo toast); totals `c-separator-6`; More `c-dropdown-menu-16` + confirm `c-alert-dialog-2`; flagged line `c-alert-7`; empty `c-empty-11`; closed notice `c-alert-7` |
| Checkout (T09) | name `c-input-2` + `c-input-5`; mobile `@diceui/mask-input` (pattern `####-###-####`); remember me `c-checkbox-5`; pay methods `c-radio-group-9` + `c-radio-group-15`; COD over limit `c-alert-7`; reward switch `c-switch-2`; summary `c-collapsible-1`; totals `c-separator-6`; Send exactly + Copy `c-button-41`; note `c-textarea-6`; Place order `c-button-9` + `c-button-44` states + `@diceui/pending`; loading `c-skeleton-4` |
| Receipt (T10) | success `c-alert-6`; body `Opensource UI Thermal Receipt`; number copy `c-button-41`; QR `@diceui/qr-code`; status `c-stepper-26` (timestamped); pay countdown `c-alert-7` + `c-progress-2` (→ `c-alert-8` at 0); proof `attachment` + `c-attachment-6` + `c-attachment-5`; thread `c-message-5` + `c-marker-2`; rider link `c-item-4`; actions `c-dropdown-menu-13`; rejected `c-alert-4`, refund `c-alert-5`; rating `@diceui/rating` + `c-textarea-6`; Notify me `c-switch-2`; install card `c-alert-18` + iPhone steps `c-stepper-13`; loading `c-skeleton-3`, thread `c-skeleton-10` |
| My orders (T11) | Active / Past `c-tabs-7`; active card `c-item-10`; past row `c-item-4`; status `c-badge-22`, `c-badge-15`, `c-badge-14`, `c-badge-17`; empty `c-empty-4`; loading `c-skeleton-7` |
| Rewards + account (T12) | stamp card `c-frame-1` + `@magicui/grid-pattern` + tiles `c-icon-tile-6` (empty) / `c-icon-tile-16` (stamped) / `c-icon-tile-14` (pending); progress `@diceui/circular-progress` + `@magicui/number-ticker`; reward `c-card-16` + Claim `c-button-44` + `@magicui/confetti`; limited `c-badge-17`; paused `c-alert-7`; card off `c-empty-7`; history `c-timeline-7`; pending `c-spinner-3`; join email `c-input-group-5`; code `c-input-otp-6`; expired `c-alert-8`; member QR `@diceui/qr-code` in `c-card-1`; member chip `c-avatar-16`; member menu `c-avatar-35`; tabs `c-tabs-2`; opt-ins `c-field-10`; loading `c-skeleton-9` |
| Shop info, privacy, system (T06, T14) | hours `c-table-16`; address + Maps `c-item-4`; Messenger `c-button-41` then an open link; offline page `c-empty-9`; Not found `c-empty-7` |
| `/kit` only | `c-avatar-6`, `c-stepper-3`, `c-timeline-3`, Like Toggle, plus every pattern above |

## 4. Our compositions (decision D6; library parts only, no new primitives)

| Composition | Where | Built from |
| --- | --- | --- |
| `shop-image` (photo → brand tile with Fluent icon → initials) | `packages/ui/src/compositions` | `aspect-ratio`, `avatar`, Fluent `<img>` |
| `storefront-dock` (4 tabs + growing cart segment) | `packages/ui/src/compositions` | `dockSlotClass` from `bottom-dock`, `avatar` group like `c-avatar-11`, `badge` |
| `banner-carousel` (lazy, autoplay rules) | `packages/ui/src/compositions` | `carousel` + `embla-carousel-autoplay` |
| `stamp-grid` (N slots: empty, stamped, pending) | `packages/ui/src/compositions` | `frame`, `icon-tile`, `grid-pattern` |
| `pay-countdown` | `apps/storefront/src/features/receipt/components` | `alert`, `progress` |
| `otp-resend` (60 s timer) | `apps/storefront/src/features/rewards/components` | `input-otp`, `button` |
| `messenger-handoff` (copy, then open) | `apps/storefront/src/features/receipt/components` | `button` like `c-button-41` |
| `proof-uploader` (compress, retry, 5 states) | `apps/storefront/src/features/receipt/components` + `compressImage()` in `packages/data` | `attachment` |
| Motion recipes: success check (SVG stroke), stamp press (scale and rotate), clip-path reveal (View Transitions) | `packages/ui/src/styles/globals.css` utilities | CSS only, off under reduced motion |

## 5. Fluent Emoji Flat icon keys (all 52 checked on raw.githubusercontent.com)

Path: `https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/<Folder>/Flat/<folder_with_underscores>_flat.svg`. Save as `apps/storefront/public/icons/fluent/<key>.svg`; copy the repo `LICENSE` (MIT) next to them.

burger: Hamburger · chicken: Poultry leg · rice: Cooked rice · fries: French fries · combo: Fork and knife with plate · nuggets: Poultry leg · soda: Cup with straw · iced_tea: Tumbler glass · shake: Glass of milk · juice: Beverage box · water: Droplet · water_gallon: Potable water · container: Bucket · ice: Ice · tshirt: T-shirt · trousers: Jeans · dress: Dress · set: Coat · accessories: Handbag · earrings: Gem stone · hat: Billed cap · scarf: Scarf · coffee: Hot beverage · kapeng_pinoy: Teacup without handle · milk_tea: Bubble tea · sandwich: Sandwich · beans: Beans · bread: Bread · pastry: Croissant · cake: Shortcake · birthday_cake: Birthday cake · pasalubong: Wrapped gift · chocolate: Chocolate bar · cupcake: Cupcake · donut: Doughnut · cookie: Cookie · ice_cream: Soft ice cream · noodles: Steaming bowl · pizza: Pizza · meat: Cut of meat · egg: Cooking · delivery: Delivery truck · other: Shopping bags · promo: Fire · new: Sparkles · bestseller: Star · gift: Wrapped gift · stamp: Ticket · reward: Trophy · store: Convenience store · offline: Cloud · closed: Crescent moon
<!-- prettier-ignore-end -->
