# Design tokens

One file: `packages/ui/src/styles/tokens.css` (Tailwind v4 `@theme`, OKLCH). Components use token classes (`bg-primary`, `text-success`), never hex. Each colour has a `-foreground` partner with at least 4.5:1 contrast.

## Base (shadcn names)

`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `sidebar-*`, `chart-1..5`. Start from shadcn `neutral`, then set:

| Token | Meaning | Light start | Dark start |
| --- | --- | --- | --- |
| `primary` | Main action (one filled button per screen), brand blue | `oklch(0.52 0.16 255)` | `oklch(0.70 0.14 255)` |
| `accent` | Hover and selected surfaces, neutral grey | shadcn default | shadcn default |
| `ring` | Focus ring | same as `primary` | same as `primary` |

## Meaning colours (fixed, never follow a shop's brand)

| Token | Use only for | Light start | Dark start |
| --- | --- | --- | --- |
| `success` | Paid, done, open now | `oklch(0.53 0.14 150)` | `oklch(0.72 0.17 150)` |
| `warning` | Needs attention, waiting for proof, low stock | `oklch(0.60 0.15 70)` | `oklch(0.78 0.15 75)` |
| `destructive` | Cancelled, rejected, delete | `oklch(0.58 0.21 27)` | `oklch(0.65 0.20 25)` |
| `info` | Neutral notices, in progress | `oklch(0.50 0.12 243)` | `oklch(0.72 0.12 240)` |
| `member` | Stamps, rewards, member badges (teal green) | `oklch(0.55 0.11 175)` | `oklch(0.78 0.13 172)` |
| `highlight` | Celebration only (reward ready, order placed); marigold | `oklch(0.78 0.16 72)` | `oklch(0.78 0.16 72)` |

Each meaning colour also gets `-soft` (tinted background) and `-soft-foreground` (text on it) for badges and alerts.

## Shop brand (storefront only)

- The owner picks one colour. It becomes `--shop`, `--shop-foreground`, `--shop-soft`, `--shop-soft-foreground`, set on the shop layout at runtime.
- If the contrast check fails, the foreground switches to black or white; if both fail, the colour is darkened until it passes.
- Brand colour drives the main button, tabs and highlights on the storefront only. Status and member colours never change.

## Order status tones

| Status | Tone | Icon idea (lucide) |
| --- | --- | --- |
| New, waiting for payment | `warning` | `clock` |
| Preparing, out for delivery | `info` | `chef-hat`, `bike` |
| Ready | `success` | `bell-ring` |
| Done | `muted` | `check` |
| Cancelled, rejected | `destructive` | `x-circle` |

The mapping lives once in `packages/core` (`STATUS_TONE`) and is used by every badge.

## Type, shape, motion

- Font: Plus Jakarta Sans (variable, self-hosted); numbers with `tabular-nums`. Money as `₱1,234` (no `.00` for whole pesos).
- Radius: `--radius: 0.75rem`. Shadows: shadcn defaults.
- Motion: fast 120 ms (buttons), base 200 ms (page enter), slow 300 ms (sheets). Nothing over 400 ms. Off for `prefers-reduced-motion`.
- Light and dark for the dashboard; storefront light only.
