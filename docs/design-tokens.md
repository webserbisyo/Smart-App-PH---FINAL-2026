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

## Shop brand (storefront only)

The owner picks one colour (default `#2456D3`, presets, or "use logo colour"). `shopPalette()` in core makes a 60/30/10 palette, set on the shop layout at runtime through `cssVars()`:

| Variable               | Use                                 | Rule                                                                          |
| ---------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `--shop-60`            | Page background                     | brand hue, L 0.975, C 0.012                                                   |
| `--shop-30`            | Surfaces, top bar, cards            | brand hue, L 0.995, C 0.004                                                   |
| `--shop-10`            | Main button, active tab, highlights | brand colour darkened until white text reaches 4.5:1; if it can't, black text |
| `--shop-10-foreground` | Text on `--shop-10`                 | white or black, from the check                                                |
| `--shop-10-soft`       | Chips, selected rows                | L 0.93                                                                        |
| `--shop-10-hover`      | Hover of `--shop-10`                | 10 minus 0.06 L                                                               |

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
- Shell sizes (in `tokens.css`): top bar 56 px phone / 64 px desktop; dock `--dock-height` 4rem (64 px), `--dock-offset` 0.75rem (12 px) above the safe area, 1rem from each side, max `--dock-max-width` 27.5rem (440 px); rail: on desktop shadcn's default 3rem (48 px: a 32 px icon button plus 8 px padding each side, so icons and avatars sit on one centre line); on the tablet touch rail `--rail-width` 3.75rem (60 px: a 44 px target plus the same padding); sidebar `--shell-sidebar-width` 15.5rem (248 px). The installed sidebar sets its own `--sidebar-width` and `--sidebar-width-icon` inline, so the dashboard shell passes `--sidebar-width: var(--shell-sidebar-width)` to `SidebarProvider` through `cssVars()`, plus `--sidebar-width-icon: var(--rail-width)` on tablet only.
- Motion: fast 120 ms (buttons), base 200 ms (page enter), slow 300 ms (sheets); exits 0.75 of the entrance; ease `cubic-bezier(0.2, 0, 0, 1)`. Page enter fades and rises 8 px; list stagger 40 ms on the first 6 items only; press scales to 0.98. Nothing over 400 ms. Under `prefers-reduced-motion`: opacity only, no confetti. Confetti only when a reward is ready, once.
- Light and dark for the dashboard; storefront light only.

## Variants and utilities (in `globals.css`)

Named variants instead of brackets: `keyboard-open:` (`data-keyboard="open"`), `shell-phone:` / `shell-tablet:` / `shell-desktop:` (`data-shell` on the shell root), `tablet-rail:` (items in the collapsed sidebar on the tablet rail; outranks the sidebar's own collapsed sizes so targets stay 44 px), `pointer-coarse:`, `hover-hover:`; nav links carry `data-active`, so active styles use `data-active:`. Shared utilities: `pressable` (scale 0.98, `touch-action: manipulation`), `tabular`, `pt-safe` / `pb-safe`, `pb-dock` (room for the dock plus the safe area), `dock-pill` (dock height, max width and bottom offset), `scrollbar-none`. A new one-off style becomes a utility here, not an arbitrary value.

## Contrast test

A Vitest in `packages/ui` reads `tokens.css` and checks every pair in light and dark: text 4.5:1; borders, focus rings and chart marks 3:1. It also runs `shopPalette()` on the 5 demo brand colours and the presets.
