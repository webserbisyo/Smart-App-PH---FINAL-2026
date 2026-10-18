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

| Component           | Library            | Path                                                 | Used in                                    | Added |
| ------------------- | ------------------ | ---------------------------------------------------- | ------------------------------------------ | ----- |
| `avatar`            | shadcn (base-nova) | `packages/ui/src/components/avatar.tsx`              | app-sidebar, account-menu, kit             | T05   |
| `badge`             | shadcn (base-nova) | `packages/ui/src/components/badge.tsx`               | bottom-dock, nav-drawer, page-header, kit  | T05   |
| `bottom-dock`       | composition        | `packages/ui/src/compositions/bottom-dock.tsx`       | dashboard shell (phone), kit               | T05   |
| `breadcrumb`        | shadcn (base-nova) | `packages/ui/src/components/breadcrumb.tsx`          | top-bar, kit                               | T05   |
| `button`            | shadcn (base-nova) | `packages/ui/src/components/button.tsx`              | login-01, signup-01, shell, kit            | T01   |
| `card`              | shadcn (base-nova) | `packages/ui/src/components/card.tsx`                | login-01, signup-01, kit                   | T01   |
| `collapsible`       | shadcn (base-nova) | `packages/ui/src/components/collapsible.tsx`         | kit (installed for sidebar-07)             | T05   |
| `dialog`            | shadcn (base-nova) | `packages/ui/src/components/dialog.tsx`              | responsive-dialog, kit                     | T05   |
| `drawer`            | shadcn (base-nova) | `packages/ui/src/components/drawer.tsx`              | nav-drawer, responsive-dialog, kit         | T05   |
| `dropdown-menu`     | shadcn (base-nova) | `packages/ui/src/components/dropdown-menu.tsx`       | account-menu, kit                          | T05   |
| `empty`             | shadcn (base-nova) | `packages/ui/src/components/empty.tsx`               | every dashboard empty page, editor, kit    | T05   |
| `field`             | shadcn (base-nova) | `packages/ui/src/components/field.tsx`               | login-01, signup-01, kit                   | T01   |
| `input`             | shadcn (base-nova) | `packages/ui/src/components/input.tsx`               | login-01, signup-01, share-shop-sheet, kit | T01   |
| `item`              | shadcn (base-nova) | `packages/ui/src/components/item.tsx`                | settings menu and list, kit                | T05   |
| `label`             | shadcn (base-nova) | `packages/ui/src/components/label.tsx`               | login-01, signup-01, kit                   | T01   |
| `nav-drawer`        | composition        | `packages/ui/src/compositions/nav-drawer.tsx`        | bottom-dock More, kit                      | T05   |
| `page-header`       | composition        | `packages/ui/src/compositions/page-header.tsx`       | every dashboard page, kit                  | T05   |
| `responsive-dialog` | composition        | `packages/ui/src/compositions/responsive-dialog.tsx` | share-shop-sheet, kit                      | T05   |
| `separator`         | shadcn (base-nova) | `packages/ui/src/components/separator.tsx`           | login-01, signup-01, top-bar, kit          | T01   |
| `sheet`             | shadcn (base-nova) | `packages/ui/src/components/sheet.tsx`               | tablet menu, sidebar, kit                  | T05   |
| `sidebar`           | shadcn (base-nova) | `packages/ui/src/components/sidebar.tsx`             | app-sidebar, kit                           | T05   |
| `skeleton`          | shadcn (base-nova) | `packages/ui/src/components/skeleton.tsx`            | sidebar, kit                               | T05   |
| `tabs`              | shadcn (base-nova) | `packages/ui/src/components/tabs.tsx`                | page-header, kit                           | T05   |
| `tooltip`           | shadcn (base-nova) | `packages/ui/src/components/tooltip.tsx`             | sidebar rail, kit                          | T05   |
| `use-form-factor`   | hook               | `packages/ui/src/hooks/use-form-factor.ts`           | app-shell, settings, kit                   | T05   |
| `use-keyboard-open` | hook               | `packages/ui/src/hooks/use-keyboard-open.ts`         | bottom-dock, kit                           | T05   |
| `use-mobile`        | hook               | `packages/ui/src/hooks/use-mobile.ts`                | sidebar, kit                               | T05   |

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
