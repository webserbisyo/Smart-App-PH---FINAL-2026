# Components registry

The single list of UI parts we have. Check here before building anything. Updated in the same commit as every install or new reuse; a test in `packages/ui` fails if a file in `packages/ui/src/components`, `src/compositions` or `src/hooks` is missing from this table.

## Libraries (chosen)

| Library                                  | Use for                                                       | Install                                |
| ---------------------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| shadcn/ui on Base UI (style `base-nova`) | Primitives and blocks                                         | `pnpm exec shadcn add <name>`          |
| ReUI                                     | Richer parts (data grid, file upload, timeline...)            | `pnpm exec shadcn add @reui/<name>`    |
| DiceUI                                   | Specialised inputs and widgets (cropper, sortable, rating...) | `pnpm exec shadcn add @diceui/<name>`  |
| Magic UI                                 | Small delights only, never on core flows                      | `pnpm exec shadcn add @magicui/<name>` |

The shadcn CLI is an exact root devDependency, so every install uses the same pinned version. Icons: lucide. Charts: shadcn chart (Recharts), lazy-loaded. Each task's prompt names the components it needs; nothing is installed ahead of time.

## Where files go

- Primitives: `packages/ui/src/components/` (shared by both apps).
- Blocks (login, sign-up, dashboard sections): run the CLI from the app folder, then move the block into the feature or shell file that owns it (dashboard: `src/features/<area>/` or `src/app/shell/`), wired to our words and data. Remove parts of a block we have not planned (such as social sign-in buttons); never leave a disabled placeholder. The Blocks table below says where each block lives.
- Our compositions (only when 3 or more screens need the same arrangement): `packages/ui/src/compositions/`, with the founder's OK.
- Registry examples and starters are reference only: never imported, and excluded from Tailwind scanning (`@source not`).

## Rules

- Before installing, check this table; reuse what is here.
- After installing: add one row per file the CLI added, then fill "Used in" as screens start using it. Remove a row only after checking nothing uses the component.
- Library variants (badge, alert, button) are mapped once to our tokens (`-soft`, `-soft-foreground`, `shop`), never per screen.
- Toasts go through one `notify()` helper (placement and timing in `docs/ux.md`).
- If the CLI can't reach a registry, stop and tell the founder; never copy a component by hand.

## Installed

| Component                | Library              | Path                                                       | Used in                                    | Added |
| ------------------------ | -------------------- | ---------------------------------------------------------- | ------------------------------------------ | ----- |
| `add-to-cart`            | Opensource UI (copy) | `packages/ui/src/vendor/opensource-ui/add-to-cart.tsx`     | kit                                        | T02   |
| `alert-dialog`           | shadcn (base-nova)   | `packages/ui/src/components/alert-dialog.tsx`              | kit                                        | T02   |
| `aspect-ratio`           | shadcn (base-nova)   | `packages/ui/src/components/aspect-ratio.tsx`              | shop-image, brand-panel, kit               | T02   |
| `attachment`             | shadcn (base-nova)   | `packages/ui/src/components/attachment.tsx`                | kit                                        | T02   |
| `avatar`                 | shadcn (base-nova)   | `packages/ui/src/components/avatar.tsx`                    | app-sidebar, account-menu, kit             | T05   |
| `badge`                  | shadcn (base-nova)   | `packages/ui/src/components/badge.tsx`                     | bottom-dock, nav-drawer, page-header, kit  | T05   |
| `banner`                 | DiceUI               | `packages/ui/src/components/banner.tsx`                    | kit                                        | T02   |
| `banner-carousel`        | composition          | `packages/ui/src/compositions/banner-carousel.tsx`         | kit                                        | T02   |
| `banner-carousel-slides` | composition          | `packages/ui/src/compositions/banner-carousel-slides.tsx`  | banner-carousel (lazy), kit                | T02   |
| `bottom-dock`            | composition          | `packages/ui/src/compositions/bottom-dock.tsx`             | dashboard shell (phone), kit               | T05   |
| `brand-panel`            | composition          | `packages/ui/src/compositions/brand-panel.tsx`             | kit                                        | T02   |
| `breadcrumb`             | shadcn (base-nova)   | `packages/ui/src/components/breadcrumb.tsx`                | top-bar, kit                               | T05   |
| `button`                 | shadcn (base-nova)   | `packages/ui/src/components/button.tsx`                    | login-01, signup-01, shell, kit            | T01   |
| `card`                   | shadcn (base-nova)   | `packages/ui/src/components/card.tsx`                      | login-01, signup-01, kit                   | T01   |
| `carousel`               | shadcn (base-nova)   | `packages/ui/src/components/carousel.tsx`                  | banner-carousel, kit                       | T02   |
| `celebrate`              | composition          | `packages/ui/src/compositions/celebrate.ts`                | kit                                        | T02   |
| `checkbox`               | shadcn (base-nova)   | `packages/ui/src/components/checkbox.tsx`                  | kit                                        | T02   |
| `checkbox-group`         | DiceUI               | `packages/ui/src/components/checkbox-group.tsx`            | kit                                        | T02   |
| `circular-progress`      | DiceUI               | `packages/ui/src/components/circular-progress.tsx`         | kit                                        | T02   |
| `client-only`            | DiceUI               | `packages/ui/src/components/client-only.tsx`               | kit                                        | T02   |
| `collapsible`            | shadcn (base-nova)   | `packages/ui/src/components/collapsible.tsx`               | kit (installed for sidebar-07)             | T05   |
| `confetti`               | Magic UI             | `packages/ui/src/components/confetti.tsx`                  | kit                                        | T02   |
| `count-up`               | composition          | `packages/ui/src/compositions/count-up.tsx`                | kit                                        | T02   |
| `dialog`                 | shadcn (base-nova)   | `packages/ui/src/components/dialog.tsx`                    | responsive-dialog, kit                     | T05   |
| `direction`              | DiceUI               | `packages/ui/src/components/direction.tsx`                 | rating, scroller (internal), kit           | T02   |
| `drawer`                 | shadcn (base-nova)   | `packages/ui/src/components/drawer.tsx`                    | nav-drawer, responsive-dialog, kit         | T05   |
| `dropdown-menu`          | shadcn (base-nova)   | `packages/ui/src/components/dropdown-menu.tsx`             | account-menu, kit                          | T05   |
| `empty`                  | shadcn (base-nova)   | `packages/ui/src/components/empty.tsx`                     | every dashboard empty page, editor, kit    | T05   |
| `field`                  | shadcn (base-nova)   | `packages/ui/src/components/field.tsx`                     | login-01, signup-01, kit                   | T01   |
| `grid-pattern`           | Magic UI             | `packages/ui/src/components/grid-pattern.tsx`              | brand-panel, kit                           | T02   |
| `hitbox`                 | DiceUI               | `packages/ui/src/components/hitbox.tsx`                    | banner-carousel, kit                       | T02   |
| `input`                  | shadcn (base-nova)   | `packages/ui/src/components/input.tsx`                     | login-01, signup-01, share-shop-sheet, kit | T01   |
| `input-group`            | shadcn (base-nova)   | `packages/ui/src/components/input-group.tsx`               | kit                                        | T02   |
| `input-otp`              | shadcn (base-nova)   | `packages/ui/src/components/input-otp.tsx`                 | kit                                        | T02   |
| `item`                   | shadcn (base-nova)   | `packages/ui/src/components/item.tsx`                      | settings menu and list, kit                | T05   |
| `label`                  | shadcn (base-nova)   | `packages/ui/src/components/label.tsx`                     | login-01, signup-01, kit                   | T01   |
| `like-toggle`            | Opensource UI (copy) | `packages/ui/src/vendor/opensource-ui/like-toggle.tsx`     | kit only                                   | T02   |
| `marker`                 | shadcn (base-nova)   | `packages/ui/src/components/marker.tsx`                    | kit                                        | T02   |
| `mask-input`             | DiceUI               | `packages/ui/src/components/mask-input.tsx`                | kit                                        | T02   |
| `message`                | shadcn (base-nova)   | `packages/ui/src/components/message.tsx`                   | kit                                        | T02   |
| `native-select`          | shadcn (base-nova)   | `packages/ui/src/components/native-select.tsx`             | kit                                        | T02   |
| `nav-drawer`             | composition          | `packages/ui/src/compositions/nav-drawer.tsx`              | bottom-dock More, kit                      | T05   |
| `number-ticker`          | Magic UI             | `packages/ui/src/components/number-ticker.tsx`             | count-up, kit                              | T02   |
| `page-header`            | composition          | `packages/ui/src/compositions/page-header.tsx`             | every dashboard page, kit                  | T05   |
| `pending`                | DiceUI               | `packages/ui/src/components/pending.tsx`                   | kit                                        | T02   |
| `progress`               | shadcn (base-nova)   | `packages/ui/src/components/progress.tsx`                  | kit                                        | T02   |
| `qr-code`                | DiceUI               | `packages/ui/src/components/qr-code.tsx`                   | kit                                        | T02   |
| `radio-group`            | shadcn (base-nova)   | `packages/ui/src/components/radio-group.tsx`               | kit                                        | T02   |
| `rating`                 | DiceUI               | `packages/ui/src/components/rating.tsx`                    | kit                                        | T02   |
| `responsive-dialog`      | composition          | `packages/ui/src/compositions/responsive-dialog.tsx`       | share-shop-sheet, kit                      | T05   |
| `scroller`               | DiceUI               | `packages/ui/src/components/scroller.tsx`                  | kit                                        | T02   |
| `separator`              | shadcn (base-nova)   | `packages/ui/src/components/separator.tsx`                 | login-01, signup-01, top-bar, kit          | T01   |
| `sheet`                  | shadcn (base-nova)   | `packages/ui/src/components/sheet.tsx`                     | tablet menu, sidebar, kit                  | T05   |
| `shop-image`             | composition          | `packages/ui/src/compositions/shop-image.tsx`              | banner-carousel, kit                       | T02   |
| `shop-logo`              | composition          | `packages/ui/src/compositions/shop-logo.tsx`               | brand-panel, kit                           | T02   |
| `shop-theme`             | composition          | `packages/ui/src/compositions/shop-theme.tsx`              | kit                                        | T02   |
| `sidebar`                | shadcn (base-nova)   | `packages/ui/src/components/sidebar.tsx`                   | app-sidebar, kit                           | T05   |
| `skeleton`               | shadcn (base-nova)   | `packages/ui/src/components/skeleton.tsx`                  | sidebar, kit                               | T05   |
| `skip-nav`               | DiceUI               | `packages/ui/src/components/skip-nav.tsx`                  | kit                                        | T02   |
| `spinner`                | shadcn (base-nova)   | `packages/ui/src/components/spinner.tsx`                   | kit                                        | T02   |
| `status`                 | DiceUI               | `packages/ui/src/components/status.tsx`                    | kit                                        | T02   |
| `switch`                 | shadcn (base-nova)   | `packages/ui/src/components/switch.tsx`                    | kit                                        | T02   |
| `table`                  | shadcn (base-nova)   | `packages/ui/src/components/table.tsx`                     | kit                                        | T02   |
| `tabs`                   | shadcn (base-nova)   | `packages/ui/src/components/tabs.tsx`                      | page-header, kit                           | T05   |
| `textarea`               | shadcn (base-nova)   | `packages/ui/src/components/textarea.tsx`                  | input-group, kit                           | T02   |
| `thermal-receipt`        | Opensource UI (copy) | `packages/ui/src/vendor/opensource-ui/thermal-receipt.tsx` | kit                                        | T02   |
| `toast`                  | shadcn (base-nova)   | `packages/ui/src/components/toast.tsx`                     | kit                                        | T02   |
| `toggle`                 | shadcn (base-nova)   | `packages/ui/src/components/toggle.tsx`                    | toggle-group, kit                          | T02   |
| `toggle-group`           | shadcn (base-nova)   | `packages/ui/src/components/toggle-group.tsx`              | kit                                        | T02   |
| `tooltip`                | shadcn (base-nova)   | `packages/ui/src/components/tooltip.tsx`                   | sidebar rail, kit                          | T05   |
| `use-form-factor`        | hook                 | `packages/ui/src/hooks/use-form-factor.ts`                 | app-shell, settings, kit                   | T05   |
| `use-keyboard-open`      | hook                 | `packages/ui/src/hooks/use-keyboard-open.ts`               | bottom-dock, kit                           | T05   |
| `use-mobile`             | hook                 | `packages/ui/src/hooks/use-mobile.ts`                      | sidebar, kit                               | T05   |
| `use-reduced-motion`     | hook                 | `packages/ui/src/hooks/use-reduced-motion.ts`              | banner-carousel, count-up, kit             | T02   |
| `visually-hidden-input`  | DiceUI               | `packages/ui/src/components/visually-hidden-input.tsx`     | rating, checkbox-group (internal), kit     | T02   |

## Vendored copies

Opensource UI parts are copied by hand from the official pages (the one founder-approved exception to "never copy by hand", decision N24) into `packages/ui/src/vendor/opensource-ui/`. Each file starts with its source URL, the date copied (2026-10-25) and "MIT, Opensource UI by Bidyut Kundu". Colours, shadows and inline styles were moved to tokens and `globals.css` utilities. Nothing auto-updates: re-copy by hand if the source changes.

| File                  | Source                                                    |
| --------------------- | --------------------------------------------------------- |
| `add-to-cart.tsx`     | https://opensourceui.in/components/add-to-cart-button     |
| `thermal-receipt.tsx` | https://opensourceui.in/components/thermal-receipt        |
| `like-toggle.tsx`     | https://opensourceui.in/components/like-button (kit only) |

## Blocks

| Block        | Command                                                             | Lives in                                                                                                                                                    | Added |
| ------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `login-01`   | `pnpm exec shadcn add login-01`                                     | `apps/dashboard/src/features/auth/login-form.tsx`                                                                                                           | T01   |
| `signup-01`  | `pnpm exec shadcn add signup-01`                                    | `apps/dashboard/src/features/auth/signup-form.tsx`                                                                                                          | T01   |
| `sidebar-07` | `pnpm exec shadcn add sidebar-07 -c apps/dashboard` (no overwrites) | `apps/dashboard/src/app/shell/app-sidebar.tsx` and `account-menu.tsx` (team switcher, nav-projects and nav-main replaced by the shop header and flat links) | T05   |

## The `/kit` page

- Dashboard route `/kit`, available only when `import.meta.env.DEV` or `VITE_SHOW_KIT=true`. Not in production builds.
- One section per installed component: name, library, a live example in its main states (default, disabled, loading, error), light and dark toggle, and where it is used.
- Also shows the colour tokens (`docs/design-tokens.md`) as swatches with their names, every `STATUS_TONE` badge, and a shop-brand switcher for the 5 demo shops with the generated palette and its contrast result.
- From the mock data task on: a "Mock data" panel with counts and Reset.
