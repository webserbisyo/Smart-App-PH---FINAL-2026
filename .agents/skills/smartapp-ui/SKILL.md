---
name: smartapp-ui
description: Smart App PH brand and component rules for any UI work in this repo. Use this skill before you build or change a page, sheet, form, dialog, banner, badge or any React component in apps/dashboard, apps/storefront or packages/ui; before installing a shadcn, ReUI, DiceUI or Magic UI component; and whenever you pick a colour, size, radius, icon or dark-mode style. Use it even for "small" UI tweaks, because most brand breaks start as small tweaks.
---

# Smart App PH UI

Every screen should look like one product, in light and dark, on a 360 px phone and a 1280 px desktop, for a food shop and a retail shop. That only works if every colour, size and component comes from one shared system instead of being decided again on each page. This skill says where that system lives; the documents it links are the source of truth, so read them instead of guessing.

| What                               | Where                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Colour, type, radius, motion       | `packages/ui/src/styles/tokens.css` (values), `docs/design-tokens.md` (meaning)                        |
| Tailwind names for the tokens      | `packages/ui/src/styles/globals.css` (`@theme inline`, the one stylesheet)                             |
| Installed components, compositions | `docs/components.md` (Use for / Don't, edits log)                                                      |
| Screen rules                       | `docs/ux.md` (responsive plan, states, accessibility, section 7 brand rules)                           |
| Decisions behind it                | `docs/decisions.md`: T35 brand, T36 stamp card, T56 stage colours, T64 dark mode, T97 layered surfaces |
| Live examples                      | `/kit` in the dashboard: Base, Dashboard, Storefront, Tokens, Routes (T98)                             |
| Words on screen                    | the `smartapp-ui-writing` skill and `packages/core/src/words.ts`                                       |
| Checking your work                 | the `smartapp-ui-check` skill                                                                          |

## The two looks

- **Dashboard look** (owner dashboard, admin, sign-in): brand blue `primary` (#0047FF), mint `member` for stamps and rewards only, neutral layered surfaces (T97), Plus Jakarta Sans. Light, Dark and System (T64). Tokens sit under `:root[data-app='dashboard']`, so installed parts take the brand with no extra classes.
- **Shop look** (storefront): each owner's one colour through `ShopTheme` and the `shop-60 / shop-30 / shop-10` tokens, light or dark shop surface. `shopPalette()` in core keeps every pair readable, so never reject or hand-adjust an owner's colour in a page. The dashboard's light/dark switch never reaches the storefront.

Work out which look your screen uses before writing anything: the token names differ (`bg-primary` against `bg-shop-10`).

## Dashboard surfaces come in layers

Depth comes from stepping through neutral layers, not from navy fills or heavy shadows (T97):

| Layer                     | Token           | Light                            | Dark               |
| ------------------------- | --------------- | -------------------------------- | ------------------ |
| Side nav (base)           | `bg-sidebar`    | light grey #F1F3F9               | darkest #14171D    |
| Page                      | `bg-background` | off-white #F9FAFD                | #1B1E24            |
| Card, panel               | `bg-card`       | white (brightest)                | #23262D            |
| Menu, popover, sheet      | `bg-popover`    | white, with `shadow-md` + border | #2C3039 (lightest) |
| Quiet fill (chips, hover) | `bg-muted`      | #EDF0F6                          | #2A2E36            |

Put each surface on the layer below it in this table. Never put a surface on the same colour as what is behind it (a `bg-card` box inside a `bg-card` panel): it disappears in one mode. When two surfaces must share a colour, separate them with `border-border` or use `bg-muted` for the inner one. Dark text is off-white `foreground`, never pure white; no pure black anywhere.

## Building a screen: the order

1. **Find the frame.** Dashboard pages render inside the app shell (`apps/dashboard/src/app/shell`, page header, dock on phones); storefront pages inside `ShopShell`. Don't build page chrome inside a feature. `/kit/routes` lists every page.
2. **Reuse a composition** from `packages/ui/src/compositions`: `PageHeader`, `EmptyState`, `ResponsiveDialog`, `ResponsiveSheet`, `BottomDock`, `StorefrontDock`, `NavDrawer`, `ShopTheme`, `StampCard`, `ProductCard`, `notify()`. Shared dashboard pieces live in `apps/dashboard/src/app/` (features never import each other).
3. **Then an installed component** from `packages/ui/src/components` (list in `docs/components.md`).
4. **Missing piece?** Install it with the shadcn CLI (next section). If no library on our list has it, stop and tell the founder before hand-writing anything (AGENTS rule 1).
5. **Cover every state**: loading skeleton, empty with one action, error with Try again, offline, closed shop, long Filipino names and addresses, big ₱ amounts. The Preview panel (bottom left, dev and preview builds) switches the sample-data scenario (`?mock=`), the clock (`?now=`) and who you view as, so you can see each one.

## Installing a component

Installed components are written for every app on the internet, so some arrive with their own colours.

1. Check `docs/components.md` first; it may be installed under another name.
2. Install from the repo root with the pinned CLI: `pnpm exec shadcn add <name>` (registries `@reui`, `@diceui`, `@magicui`). If it fails, stop and report; never copy a component by hand.
3. Don't rewrite the installed file (AGENTS rule 1). Map its look through our tokens or wrap it. If it ships raw colours (`bg-yellow-950`, `text-white`), list it under "Installed parts that ship raw colours" in `docs/components.md` and override at the use site with tokens.
4. Add a row to `docs/components.md` and a section on the right kit page (Base for shared parts, Dashboard or Storefront for app parts), and look at it in light and dark.

## Colour: tokens, not values

Raw palette classes (`bg-red-500`), hex, `rgb()`, arbitrary values (`p-[13px]`) and inline `style` ignore dark mode and the shop's palette. `tooling/brand-guard.test.ts` and the ESLint walls fail on them. The only inline style is a CSS variable through `cssVars()` (shop colours, progress).

| You want                 | Use                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Page, card, popover, nav | `bg-background`, `bg-card`, `bg-popover`, `bg-sidebar`                                |
| Text, quiet text         | `text-foreground`, `text-muted-foreground`                                            |
| Main action              | `Button` default (`bg-primary text-primary-foreground`), one per view                 |
| Lines and inputs         | `border-border`, `border-input`, `border-border-strong`, focus `ring-ring`            |
| Status                   | icon + word + `bg-success-soft text-success-text` (or warning, destructive, info)     |
| Order stage (dashboard)  | the classes in `apps/dashboard/src/app/orders/stage.ts` (`stage-*`, T56)              |
| Stamps, rewards, members | `member` (mint) and the `StampCard` composition                                       |
| Storefront brand         | `bg-shop-60`, `bg-shop-30`, `bg-shop-10 text-shop-10-foreground`, `text-shop-10-text` |

Status always has an icon, a word and a colour. Mint is decoration for loyalty and never means success. The logo gradient (`brand-gradient`) only on the logo, the login band, the loyalty strip and the reward moment.

Translucent layers: mix in `srgb` or `oklab`, never `oklch` (the transparent side has hue 0 and pulls toward red).

## Size, type and motion

- Radius from `--radius` (12 px dashboard) through `rounded-lg` and friends.
- Touch targets 44 px; inputs use 16 px text so iOS does not zoom.
- Money and counts use `tabular`; prices in the text colour, never the brand colour.
- Motion under 400 ms with the duration tokens, transform and opacity only, off for `prefers-reduced-motion`. Animate in answer to an action, not to decorate.
- Keep a visible focus ring on everything clickable.
- Storefront pages stay under the 300 KB JS budget (`pnpm --filter @smartapp/tooling budget`): lazy-load anything heavy, and give mock-only text its own small export.

## Habits that make a screen look generated

Avoid unless the screen has a real reason: ALL-CAPS labels, a small label above every heading, numbered markers on content that is not a sequence, every section in an identical card, hover animations on every card, one word of a headline in another colour, "Coming soon". If a border, badge or divider doesn't tell the person something, leave it out.

## Before you say it is done

Follow `smartapp-ui-check`: `pnpm check` passes (includes the brand guard), you looked at the screen in light and dark at 360 px and 1280 px with a food and a retail shop, and the CI UI scan is green.
