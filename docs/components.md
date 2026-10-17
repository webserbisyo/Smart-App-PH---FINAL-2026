# Components registry

The single list of UI parts we have. Check here before building anything. Updated in the same commit as every install or new reuse; a test in `packages/ui` fails if a file in `packages/ui/src/components` is missing from this table.

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
- Blocks (login, sign-up, dashboard sections): the app that uses them, `src/components/blocks/`. Run the CLI from that app folder. Remove parts of a block we have not planned (such as social sign-in buttons); never leave a disabled placeholder.
- Our compositions (only when 3 or more screens need the same arrangement): `packages/ui/src/compositions/`, with the founder's OK.
- Registry examples and starters are reference only: never imported, and excluded from Tailwind scanning (`@source not`).

## Rules

- Before installing, check this table; reuse what is here.
- After installing: add one row per file the CLI added, then fill "Used in" as screens start using it. Remove a row only after checking nothing uses the component.
- Library variants (badge, alert, button) are mapped once to our tokens (`-soft`, `-soft-foreground`, `shop`), never per screen.
- Toasts go through one `notify()` helper (placement and timing in `docs/ux.md`).
- If the CLI can't reach a registry, stop and tell the founder; never copy a component by hand.

## Installed

| Component   | Library            | Path                                       | Used in                  | Added |
| ----------- | ------------------ | ------------------------------------------ | ------------------------ | ----- |
| `button`    | shadcn (base-nova) | `packages/ui/src/components/button.tsx`    | login-01, signup-01, kit | T01   |
| `card`      | shadcn (base-nova) | `packages/ui/src/components/card.tsx`      | login-01, signup-01, kit | T01   |
| `field`     | shadcn (base-nova) | `packages/ui/src/components/field.tsx`     | login-01, signup-01, kit | T01   |
| `input`     | shadcn (base-nova) | `packages/ui/src/components/input.tsx`     | login-01, signup-01, kit | T01   |
| `label`     | shadcn (base-nova) | `packages/ui/src/components/label.tsx`     | login-01, signup-01, kit | T01   |
| `separator` | shadcn (base-nova) | `packages/ui/src/components/separator.tsx` | login-01, signup-01, kit | T01   |

## The `/kit` page

- Dashboard route `/kit`, available only when `import.meta.env.DEV` or `VITE_SHOW_KIT=true`. Not in production builds.
- One section per installed component: name, library, a live example in its main states (default, disabled, loading, error), light and dark toggle, and where it is used.
- Also shows the colour tokens (`docs/design-tokens.md`) as swatches with their names, every `STATUS_TONE` badge, and a shop-brand switcher for the 5 demo shops with the generated palette and its contrast result.
- From the mock data task on: a "Mock data" panel with counts and Reset.
