# Components registry

The single list of UI parts we have. Check here before building anything. Updated in the same commit as every install or new reuse; a test in `packages/ui` fails if a file in `packages/ui/src/components` is missing from this table.

## Libraries (chosen)

| Library | Use for | Install |
| --- | --- | --- |
| shadcn/ui on Base UI (style `base-nova`) | Primitives and blocks (button, input, dialog, sheet, sidebar, login...) | `pnpm dlx shadcn@latest add <name>` |
| ReUI | Data grid, file upload, stepper, timeline, richer cards | `pnpm dlx shadcn@latest add @reui/<name>` |
| DiceUI | Cropper, banner, rating, sortable, mask input, QR code | `pnpm dlx shadcn@latest add @diceui/<name>` |
| Magic UI | Small delights only (number ticker, confetti, shine border, dot pattern) | `pnpm dlx shadcn@latest add @magicui/<name>` |

Icons: lucide. Charts: shadcn chart (Recharts), lazy-loaded.

## Where files go

- Primitives: `packages/ui/src/components/` (shared by both apps).
- Blocks (login, sign-up, dashboard sections): the app that uses them, `src/components/blocks/`. Run the CLI from that app folder.
- Our compositions (only when 3 or more screens need the same arrangement): `packages/ui/src/compositions/`, with the founder's OK.

## Installed

| Component | Library | Path | Used in | Added |
| --- | --- | --- | --- | --- |
| _(empty until T01)_ | | | | |

## Planned (install when the task needs it)

- Storefront: carousel, sheet, drawer, tabs, badge, skeleton, sonner, `@reui/use-file-upload` (+ c-file-upload examples for logo, banner, photos, proof), `@diceui/cropper`, `@diceui/banner`, `@diceui/rating`, `@diceui/qr-code`, `@magicui/dot-pattern`, `@magicui/shine-border`, `@magicui/confetti`.
- Dashboard: sidebar, breadcrumb, `@reui/data-grid`, `@reui/stepper`, `@reui/timeline`, chart, calendar, `@diceui/sortable`, `@diceui/mask-input`, `@diceui/color-picker`, `@magicui/number-ticker`.
- Both: button, input, label, field, card, dialog, alert-dialog, dropdown-menu, select, switch, checkbox, radio-group, input-otp, avatar, tooltip, empty, alert, separator, scroll-area.

## The `/kit` page

- Dashboard route `/kit`, available only when `import.meta.env.DEV` or `VITE_SHOW_KIT=true`. Not in production builds.
- One section per installed component: name, library, a live example in its main states (default, disabled, loading, error), light and dark toggle, and where it is used.
- Also shows the colour tokens (`docs/design-tokens.md`) as swatches with their names.
