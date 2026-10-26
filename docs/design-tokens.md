# Design tokens

Tokens are defined as plain CSS variables in `:root` and `.dark` in `packages/ui/src/styles/tokens.css` (OKLCH) and mapped into Tailwind v4 with `@theme inline` in `packages/ui/src/styles/globals.css`. Components use token classes (`bg-primary`, `text-success-text`), never hex, raw palette classes or arbitrary values: if a value is missing, add a token here first. Each colour has a `-foreground` partner with at least 4.5:1 contrast. Dark mode is a `.dark` class (custom variant), so the dashboard can have a switch. OKLCH needs Chrome 111 / Safari 16.4 or newer, the same minimum as Tailwind 4.

## Base (shadcn names)

`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `sidebar-*`, `chart-1..5`. The `sidebar-*` tokens point at existing ones (`card`, `primary`, `accent`, `border`, `ring`) in light and dark, so the sidebar has no colours of its own. Start from shadcn `neutral`, then set:

| Token     | Meaning                                                | Light start            | Dark start             |
| --------- | ------------------------------------------------------ | ---------------------- | ---------------------- |
| `primary` | Main action (one filled button per screen), brand blue | `oklch(0.52 0.16 255)` | `oklch(0.70 0.14 255)` |
| `accent`  | Hover and selected surfaces, neutral grey              | shadcn default         | shadcn default         |
| `ring`    | Focus ring                                             | same as `primary`      | same as `primary`      |

## Meaning colours (fixed, never follow a shop's brand)

| Token         | Use only for                                            | Light start            | Dark start             |
| ------------- | ------------------------------------------------------- | ---------------------- | ---------------------- |
| `success`     | Paid, done, open now                                    | `oklch(0.53 0.14 150)` | `oklch(0.72 0.17 150)` |
| `warning`     | Needs attention, waiting for proof, low stock           | `oklch(0.60 0.15 70)`  | `oklch(0.78 0.15 75)`  |
| `destructive` | Cancelled, rejected, delete                             | `oklch(0.58 0.21 27)`  | `oklch(0.65 0.20 25)`  |
| `info`        | Neutral notices, in progress                            | `oklch(0.50 0.12 243)` | `oklch(0.72 0.12 240)` |
| `member`      | Stamps, rewards, member badges (teal green)             | `oklch(0.54 0.11 175)` | `oklch(0.78 0.13 172)` |
| `highlight`   | Celebration only (reward ready, order placed); marigold | `oklch(0.78 0.16 72)`  | `oklch(0.78 0.16 72)`  |

Each meaning colour also gets:

- `-foreground`: text on the solid colour (ensures >= 4.5:1 contrast; e.g. dark destructive-foreground is `oklch(0.145 0 0)` against `oklch(0.65 0.20 25)`).
- `-hover`: the solid colour on hover.
- `-text`: coloured text on a card or the page (plain `text-success` on white fails contrast).
- `-soft` and `-soft-foreground`: tinted background and its text, for badges and alerts. Library badge and alert variants are mapped to these once.

Also: `faint-foreground`, `border-strong`, `overlay` (scrim behind sheets), `skeleton`, `chart-1..5` with fixed meanings per report.

For the ReUI primitives (decision T28): `destructive-text`, `destructive-soft` and `destructive-soft-foreground` (destructive had no soft pair), `invert` / `invert-foreground` (near-black surface with light text in both themes, also light text on a photo scrim) and `focus` / `focus-foreground` (same values as `primary`). ReUI uses `-foreground` for dark text on a tint; ours means text on the solid colour, so `reui/badge` and `reui/alert` are mapped to `-soft`, `-soft-foreground` and `-text` once.

For banner words over a photo (decision R42): `scrim` (a near-black fade, the same in both themes) and `on-scrim` (white text on it).

## Shop brand (storefront only)

The owner picks one colour (default `#2456D3`, presets, or "use logo colour") and a surface, light or dark (`look.surface`, decision R2). `shopPalette(hex, surface)` in core makes a 60/30/10 palette, set on the shop layout at runtime through `cssVars()`:

| Variable                    | Use                                    | Light shop                                                             | Dark shop                         |
| --------------------------- | -------------------------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| `--shop-60`                 | Page background                        | near white: L 0.982, C ≤ 0.003 (no tint)                               | near black: L 0.16, C ≤ 0.008     |
| `--shop-30`                 | Cards, sheets, the glass bars          | white                                                                  | raised grey: L 0.215, C ≤ 0.01    |
| `--shop-10`                 | Main button, active tab, cart          | brand darkened until white text reaches 4.5:1; if it can't, black text | same                              |
| `--shop-10-foreground`      | Text on `--shop-10`                    | white or black, from the check                                         | same                              |
| `--shop-10-hover`           | Hover of `--shop-10`                   | 10 minus 0.06 L                                                        | same                              |
| `--shop-10-text`            | Brand-coloured text, links, focus ring | brand darkened until 4.5:1 on 60                                       | brand lightened until 4.5:1 on 30 |
| `--shop-10-soft`            | Chips, selected rows                   | L 0.95, C ≤ 0.035                                                      | L 0.3, C ≤ 0.06                   |
| `--shop-10-soft-foreground` | Text on `--shop-10-soft`               | brand darkened until 4.5:1                                             | brand lightened until 4.5:1       |

Utilities (Tailwind `@theme inline`): `bg-shop-60`, `bg-shop-30`, `bg-shop-10`, `text-shop-10-foreground`, `text-shop-10-text`, `bg-shop-10-soft`, `text-shop-10-soft-foreground`, `hover:bg-shop-10-hover` (any colour utility works with these names). `ShopTheme` (`packages/ui/src/compositions/shop-theme.tsx`, server-safe) sets these on a `display: contents` wrapper and also maps the app tokens to the shop (decision R18): `--background` = 60, `--card` and `--popover` = 30, `--primary` = 10, `--secondary` = 10 soft, `--ring` and `--focus` = 10 text, and `--foreground` for the surface. So every installed part (buttons, rings, inputs, badges) wears the shop's colours, never the app's default blue. A dark shop also gets the `.dark` class, so muted, border and state tokens switch to their dark values. In the storefront `withPortals` copies the same variables onto `<html>` while a shop is open, because sheets, dialogs and toasts render outside the wrapper. `--shop-color` keeps the older `bg-shop` / `text-shop` utilities on the same colour. `tokens.css` holds the light defaults for `#2456D3`. When darkening would move L more than 0.2, the colour is kept and the text turns black (very light brands such as pale yellow). With black text the hover goes 0.06 lighter instead of darker so the text stays readable. Presets: `BRAND_COLOR_PRESETS` in core (the default blue, green, orange, magenta, a very light yellow and a very dark navy); the contrast test runs all of them and the 5 demo brands on both surfaces. `theme-color` is the shop's 60, so the phone's status bar meets the glass top bar.

Prices stay in the text colour, never the brand colour. Status and member colours never follow the brand.

## Order status tones

| Status                      | Tone | Icon idea (lucide) |
| --------------------------- | ---- | ------------------ |
| Amber means "it needs you". |

| Status                         | Tone          | Icon idea (lucide)        |
| ------------------------------ | ------------- | ------------------------- |
| Placed (new), out for delivery | `info`        | `bell`, `bike`            |
| Preparing                      | `warning`     | `chef-hat`                |
| Ready, completed               | `success`     | `check`                   |
| Cancelled, late                | `destructive` | `x-circle`, `alarm-clock` |
| Expired                        | `muted`       | `clock`                   |

| Payment | Tone      | Words                             |
| ------- | --------- | --------------------------------- |
| Unpaid  | `muted`   | "Unpaid" (COD: "Pay on delivery") |
| Pending | `warning` | "To verify"                       |
| Paid    | `success` | "Paid"                            |

The mapping lives once in `packages/core` (`STATUS_TONE`) and is used by every badge.

## Type, shape, motion

- Font: Plus Jakarta Sans (variable, self-hosted); numbers with `tabular-nums`. Money as `₱1,234` (no `.00` for whole pesos); prices never wrap.
- Type scale: 12, 14, 16, 18, 22, 28 px (in rem, so the phone's text size setting scales the app). Weights 400 and 600; 700 only for prices and order numbers.
- Space: 4 px grid. Page gutter 16 px on phone, 24 px on desktop. Card padding 16 px phone, 20 px desktop.
- Radius: shadcn default scale with `--radius: 0.625rem` in `:root` and mapped in `@theme inline` (`--radius-sm: calc(var(--radius) * 0.6)`, `--radius-md: calc(var(--radius) * 0.8)`, `--radius-lg: var(--radius)`, `--radius-xl: calc(var(--radius) * 1.4)`); chips and pills fully round.
- Elevation: `--elevation-xs..lg` (shadcn shadow scale). In dark mode a lighter surface plus a 1 px edge instead of a darker shadow.
- Layers (z-index, lowest first): content, sticky bars, basket bar, dock, sheet and dialog, toast.
- Shell sizes (in `tokens.css`): top bar 56 px phone / 64 px desktop; dock `--dock-height` 4rem (64 px), `--dock-offset` 0.75rem (12 px) above the safe area, 1rem from each side, max `--dock-max-width` 27.5rem (440 px); header: the top bar uses `--shell-header-height` 4rem (64 px) and `--shell-header-height-collapsed` 3rem (48 px, sidebar-07's `h-16` / `h-12`) through `h-shell-header` and `sidebar-collapsed:h-shell-header-collapsed`; on the touch tablet rail the collapsed height is the rail width. The sidebar header needs no height class: its `p-2` plus the `size="lg"` button is already 64 px expanded, 48 px collapsed (60 px on the touch rail). The top bar is `box-content` so its 1 px border sits below the shared height and the logo, trigger and breadcrumb share one centre line; rail: on desktop shadcn's default 3rem (48 px: a 32 px icon button plus 8 px padding each side, so icons and avatars sit on one centre line); on the tablet touch rail `--rail-width` 3.75rem (60 px: a 44 px target plus the same padding); sidebar `--shell-sidebar-width` 15.5rem (248 px). The installed sidebar sets its own `--sidebar-width` and `--sidebar-width-icon` inline, so the dashboard shell passes `--sidebar-width: var(--shell-sidebar-width)` to `SidebarProvider` through `cssVars()`, plus `--sidebar-width-icon: var(--rail-width)` on tablet only.
- Motion: fast 120 ms (buttons), base 200 ms (page enter), slow 300 ms (sheets); exits 0.75 of the entrance; ease `cubic-bezier(0.2, 0, 0, 1)`. Page enter fades and rises 8 px; list stagger 40 ms on the first 6 items only; press scales to 0.98. Nothing over 400 ms. Under `prefers-reduced-motion`: opacity only, no confetti. Confetti only when a reward is ready, once.
- Light and dark for the dashboard; storefront light only.
- Motion tokens (`tokens.css`): `--duration-fast` 120 ms, `--duration-base` 200 ms, `--duration-slow` 300 ms, `--ease-standard` `cubic-bezier(0.2, 0, 0, 1)`, `--ease-spring` `cubic-bezier(0.34, 1.56, 0.64, 1)` (a small overshoot: Like Toggle heart, stamp press), `--ease-glide` `cubic-bezier(0.32, 0.72, 0, 1)` (a soft settle, no overshoot: the dock's sliding pill); utilities `duration-fast`, `duration-base`, `duration-slow`, `ease-standard`, `ease-spring`. `animate-spin-slow` (3 s turn) drives the open-shop status ring; `heart-shadow` and `heart-glow` give an icon a soft drop shadow or a brand glow; `cart-bump` pops the cart button when an item is added; `dock-indicator` is the storefront dock's sliding pill (moved by transform from `--dock-index` and `--dock-tabs`) and `dock-pop` pops the active dock icon. `glass` is the frosted surface of the storefront top bar (once scrolled) and dock (decision R6): card colour at 72 %, blur, soft edge, solid card where blur is missing. Reduced motion stops them all (globals.css).
- Layer tokens: `--z-sticky` 10, `--z-basket` 20, `--z-dock` 30, `--z-sheet` 50, `--z-toast` 60, `--z-confetti` 70; utilities `z-sticky`, `z-basket`, `z-dock`, `z-sheet`, `z-toast`, `z-confetti`.
- Reduced motion: one rule in `globals.css` sets every animation and transition to near zero and `scroll-behavior: auto`, so library parts with built-in animation calm down without editing their files.
- Motion utilities (off under reduced motion): `press-stamp` (scale 1.3 → 0.95 → 1 with a -8° turn, 300 ms), `draw-check` (on an SVG path with `pathLength="1"`, 400 ms), `reveal-clip` (View Transitions clip-path circle from a point; call `startReveal(point, update)` from `@smartapp/ui/lib/reveal-clip`, which changes at once when `document.startViewTransition` is missing).
- Receipt paper: `paper` / `paper-foreground` (`bg-paper`, `text-paper-foreground`) and `receipt-edge-top` / `receipt-edge-bottom` (torn edges). Key and pill shadows for the vendored Opensource UI parts: `shadow-key-raised`, `shadow-key-sunken`, `shadow-key-done`, `shadow-pill`, `shadow-pill-pressed`; `like-particle` (kit only).

## Variants and utilities (in `globals.css`)

Named variants instead of brackets: `keyboard-open:` (`data-keyboard="open"`), `shell-phone:` / `shell-tablet:` / `shell-desktop:` (`data-shell` on the shell root), `sidebar-collapsed:` (inside a shell whose sidebar is collapsed to icons), `tablet-rail:` (touch only: items in the collapsed sidebar on the tablet rail; outranks the sidebar's own collapsed sizes so targets stay 44 px), `pointer-coarse:`, `hover-hover:`; nav links carry `data-active`, so active styles use `data-active:`. Stepper and timeline parts carry `data-state` and `data-orientation`: `state-active:`, `state-completed:`, `state-inactive:`, `orientation-vertical:`, which compound with `group-*` (`group-state-active/step:`, `group-orientation-vertical/timeline:`). Shared utilities: `pressable` (scale 0.98, `touch-action: manipulation`), `tabular`, `pt-safe` / `pb-safe`, `pb-dock` (room for the dock plus the safe area), `dock-pill` (dock height, max width and bottom offset), `scrollbar-none`, `h-full-less-<n>` (full height minus a spacing step, for stepper and timeline lines), `max-h-vh-<n>` (max height as n% of the viewport, for scrolling sheet and dialog bodies), `progress-thin` (a 4 px progress track). Round 2 (decisions R32, R38, R41): `banner-fill` (the active banner dot fills over `--banner-delay`), `banner-zoom` and `banner-copy` (slow zoom and words rising on the active slide), `print-feed` and `print-head` (the order slip feeding out of the printer, with the paper jam), and `animate-pulse-ripple` (the Pulsating Button's ripple, three pulses). All stop under reduced motion. Toasts (T04): the toast viewport sits on `--z-toast`, above open sheets and drawers, so Undo stays reachable; below 1024 px it lifts above the storefront dock. Both are unlayered rules in `globals.css`, keyed on `data-slot`. A new one-off style becomes a utility here, not an arbitrary value.

## Contrast test

A Vitest in `packages/ui` reads `tokens.css` and checks every pair in light and dark: text 4.5:1; borders, focus rings and chart marks 3:1. It also runs `shopPalette()` on the 5 demo brand colours and the presets.
