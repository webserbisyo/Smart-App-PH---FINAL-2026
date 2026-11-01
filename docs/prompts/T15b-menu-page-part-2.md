# T15b Menu page, part 2: grid and table views, bulk actions, emoji and custom category icons

Paste this only after the T15a PR is merged into `main`.

Copy everything below the line into Antigravity.

---

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

You are building part 2 of the Smart App PH owner dashboard Menu page (called "Products" for retail shops). T15a already built the List view, item editor, Categories, Add-ons, the `ownerCatalog` data layer and dev tools. Part 2 adds: Grid and Table views with action icons, bulk actions, and category icons from any emoji or the owner's own upload (with the storefront showing them). Reuse everything T15a made; don't rebuild it.

Read first: `AGENTS.md`, `docs/blueprints/foundation.md`, `docs/ux.md` (sections 1 to 7, especially the "Menu or Products" note and section 7, Dashboard brand rules), `docs/api.md` (the "Catalog (owner)" table, the `saveSortOrder` and `createUploadUrl` rows), `docs/components.md`, `docs/design-tokens.md`, and `docs/decisions.md` (T27, T28, T34, T35, T36, T37).

## Step 0: scan, investigate, plan, then STOP

Do not write code or install anything in this step.

1. Run `git checkout main && git pull` (T15a must already be merged; if `/catalog` still shows an `EmptyPage`, stop and tell me), then create the branch `ag/t15b-menu-views-icons`.
2. Critically scan the repo and write down what you find:
   - The `DataAdapters` pattern in `packages/data/src/adapters/` (`types.ts`, `index.tsx`, `lazy.ts`), the mock store in `packages/data/src/mocks/`, `api-client.ts` (`fetchApi`, `errorCodeOf`), `env.ts` (`DATA_SOURCES`), and the storefront hooks in `packages/data/src/hooks/storefront/` (query keys in `qk.ts`).
   - The catalog schemas in `packages/core/src/schemas/catalog.ts` and `enums.ts` (`AVAILABILITY`, `ITEM_STATUSES`), `vocab(kind)` and `words.screens.catalog` in `words.ts`, `IconKey` in `icons.ts`, and `imageSources()` in `media.ts`.
   - The 5 demo shop packs in `packages/core/src/demo/packs/` (`kanto-smash`, `aqualinis`, `tala-apparel`, `kape-juan`, `lola-remy`) and their images in `apps/storefront/public/demo/<slug>/`. Also how `resolveShop()` in `apps/dashboard/src/app/shop.ts` picks the owner's shop from `claims.demoShop`. Each demo owner account (burger, water, tala, cafe, bakery) maps to one pack.
   - How the kit loads demo photos in the dashboard (`imageSources(ref, VITE_STOREFRONT_URL)` in `features/kit/storefront-sections.tsx`).
   - What T15a built: `features/catalog/`, the `ownerCatalog` adapter, hooks and wrappers. Reuse them; don't duplicate.
   - The storefront places that draw category icons (category chips, rail, `shop-image` fallback) and `tooling/scripts/fluent-icons.ts`.
   - Every installed part listed in "Reuse" below. Open each file and confirm its props.
3. Post a plan containing: the files you will add or change, the adapter interface (method names and Zod input and output types), the new schemas, the query keys, the component per screen, and anything that does not fit or where two docs disagree.
4. STOP and wait for my "yes". Do not continue until I answer.

## Installs (after my yes)

Run each from `packages/ui` with the pinned CLI (`pnpm exec shadcn add ...`), never `pnpm dlx shadcn@latest`. Every npm package gets an exact version (no `^`), must be at least 7 days old, and must install on Node 24.14 with `engineStrict` on. If one doesn't, pin an older version that does and tell me. Never use `packageExtensions`. If any install adds an npm package not listed here, stop and tell me. These packages are approved in decision T37.

Installed files stay exactly as the CLI wrote them (T27), including the ones that ship with `any` and their own eslint-disable. If the CLI output breaks typecheck, stop and tell me; don't patch on your own. ReUI `c-*` patterns are references only: rebuild them in our feature files, never import an example. Each install gets a `docs/components.md` row and a `/kit` section in the same commit. Do NOT install: DiceUI `file-upload`, ReUI `filters`, DiceUI `faceted` or `tour`, any pattern that needs `sonner` (use our `notify`), or Magic UI effects.

| Install                                                                                                                                                                                                                          | npm packages it may add (exact)                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `@reui/data-grid`, `@reui/data-grid-table`, `@reui/data-grid-table-dnd-rows`, `@reui/data-grid-column-header`, `@reui/data-grid-column-visibility`, `@reui/data-grid-scroll-area` (shadcn `select` and `popover` come with them) | `@tanstack/react-table` 9.3.1, `@tanstack/react-virtual` 3.14.22 (not 3.14.24: too new), `@dnd-kit/modifiers` 9.0.0 |
| `@reui/emoji-picker`                                                                                                                                                                                                             | none                                                                                                                |
| `@diceui/action-bar`                                                                                                                                                                                                             | none                                                                                                                |
| `button-group` (shadcn)                                                                                                                                                                                                          | none                                                                                                                |

Tooling only: `emojibase-data` 17.0.0, an exact `@smartapp/tooling` devDependency (the version the ReUI picker reads). Optional (no npm package): `@diceui/swap` (view toggle icon), shadcn `kbd` (desktop shortcuts / and N), shadcn `context-menu` (right-click a row).

Pattern references: `c-data-grid-7` and `-14` (selection, drag rows), `c-table-11` (product table), `c-toggle-group-8` (view switch), `c-emoji-picker-5` (custom emoji tab), `c-card-8` (image hover).

## Reuse (do not rebuild these)

`item`, `shop-image`, `product-card`, `reui/badge`, `switch`, `reui/frame`, `card`, `field`, `input`, `textarea`, `input-group` (search with clear), `native-select`, `reui/number-field`, `checkbox-group` (DiceUI, for picking add-on groups and "Goes well with"), `toggle-group` (filter), `reui/scrollspy` and `scroller` (category rail and chips), `reui/icon-tile`, `responsive-dialog`, `sheet`, `drawer`, `alert-dialog`, `dropdown-menu`, `skeleton`, `empty-state`, `reui/alert`, `notify` (toast), `attachment`, `progress`, `cropper` (DiceUI, square crop), `tabs` with `usePathTabs`, `page-header`, `use-online-status`, `use-coarse-pointer`, `use-reduced-motion`, and `compressImage()` from `@smartapp/data`, `avatar-group` ("used by" thumbnails), `tooltip` (every icon button).

Apps never import each other, so do not import the storefront item sheet. The preview is `product-card` inside a phone-sized frame in the shop's colours.

## Malinaw restyle (wrap, never edit library files)

Style by wrapping each part in feature files (`apps/dashboard/src/features/catalog/components/`) with token classes only. That means no hex, no arbitrary values, no raw palette classes, and no inline style except `cssVars()`. Base look: navy ink, one solid blue element per view, 12 px radius, Plus Jakarta Sans, the 8 pt grid, `elevation-*` (at most 2 levels on screen), motion 120/180/260 ms with `ease-enter`/`ease-exit`, transform and opacity only, and none at all with reduced motion. No glass, no count-up, no looping effects. Weights: 600 for headings, 700 only for numbers, `tabular` for money.

| Part                    | Look                                                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| View toggle and actions | `toggle-group` with List, Grid and Table icons. Action icons are lucide (Pencil, Copy, Eye or EyeOff, Ban, Archive, Trash2) in a `button-group`, 44 px, each with a `tooltip`. Delete uses the destructive tone and only shows when the item has never been ordered |
| Grid card               | Photo 4:3 with a 12 px radius and a gentle zoom on hover (transform only, off with reduced motion), name, price, chips, action strip at the bottom                                                                                                                  |
| Data grid               | Navy header row at weight 500, 56 px rows, tabular prices on the right, a soft primary tint on ticked rows, sticky header, column picker                                                                                                                            |
| Action bar              | Solid navy bar at `elevation-lg`, slides up in 260 ms, shows "3 selected" and the bulk actions                                                                                                                                                                      |
| Emoji picker            | Inside our popover with a 12 px radius and Plus Jakarta Sans labels; the custom tab shows the shop's uploaded icons                                                                                                                                                 |

Every restyled wrapper gets an example on `/kit`.

## Screens

Use `vocab(kind)` and `words.ts` for all text. Never compare the shop type in code.

1. **View toggle on Items.** List (phone default, from T15a), Grid (desktop default) and Table (desktop), remembered on the device. Grid = photo cards (4:3) with name, price, chips and an action strip. Table = ReUI data grid: tick box, photo, name, category, price, add-ons (`badge-overflow`), Visible, Sold out, actions; sortable columns; column picker; drag rows to reorder (same `saveSortOrder`). On a phone, Table is hidden and Grid uses 2 columns.
2. **Action icons** on every card and row, in a `button-group` with tooltips: Edit (Pencil), Duplicate (Copy), Hide or Show (Eye or EyeOff), Sold out (Ban, same two-choice question as T15a), Archive, and Delete (Trash2, only when never ordered, with a confirm). On phone, the less-used ones stay in the More menu.
3. **Bulk actions.** Ticking rows in Table (or a long press in List or Grid) slides up the `action-bar` with "N selected", Sold out today, Back on, Hide, Show, Move to category (`select` in a `popover`) and Archive. Each one gets Undo. Add bulk methods to the adapter interface, mock and HTTP stub only if docs/api.md has no single-item way to do it; otherwise call the single-item methods in a loop inside the hook, and say which you chose in your plan.
4. **Category icon dialog** (replaces T15a's simple picker), 3 tabs: **Suggested** (the Fluent set in the style the owner picks: Flat, Color or 3D), **Any emoji** (ReUI `emoji-picker` with `dataUrl` pointing to our own copy; the picked emoji is drawn as its Fluent Flat file when we have it, else as the phone's own emoji), and **Upload your own** (square crop with `cropper`, saved as a 128 px WebP through `createUploadUrl` kind `category`; uploaded icons also show in the picker's custom tab).

States: the same as T15a for every new view (skeleton in the real shape, empty, error with Try again, offline, long names, ₱99,999.00), 360 to 1280 px with no sideways scroll.

## Data and storefront change

- In `packages/core`: `CategoryIconSchema`, a discriminated union of `{ kind: 'fluent', key: IconKey, style: 'flat' | 'color' | '3d' }`, `{ kind: 'emoji', char: string }` and `{ kind: 'image', ref: MediaRef }`. `CategorySchema.icon` uses it. Existing packs and mock data must keep parsing (map today's keys to `{ kind: 'fluent', style: 'flat' }`).
- The storefront draws all 3 kinds wherever a category icon shows (category chips, rail, `shop-image` fallback). This is the only storefront change, and it's required because customers see category icons. Keep the storefront JS budget check green.
- Screens still use only the hooks; the HTTP adapter stub gets any new method too, with a unit test.

## Icons tooling

Extend `tooling/scripts/fluent-icons.ts` (same pattern as today; keep the MIT licence note):

- Grow the curated set from 52 to about 200 food and retail keys in `ICON_KEYS`, in 3 styles: Flat SVG, Color SVG and 3D (converted to WebP 128 px, like `fluent-art.ts`). Put them in `apps/storefront/public/icons/fluent/<style>/`.
- Also copy the full Fluent Flat SVG set into `apps/storefront/public/icons/fluent/all/`, named by Unicode codepoint, so any picked emoji draws in Fluent. Tell me the total size; if it's over 10 MB, stop and ask.
- Copy the `emojibase-data` 17.0.0 English files the picker needs into `apps/dashboard/public/emojibase/` and pass `dataUrl` to the picker, so no phone calls jsDelivr.
- The dashboard loads Fluent files from `VITE_STOREFRONT_URL`, like the demo photos.
- Noto, Twemoji, OpenMoji, Phosphor and Tabler are out (licence or rule 6).

## Tests (basic only, no Playwright, no screenshots)

- Unit tests (vitest) for: `CategoryIconSchema` (all 3 kinds, plus old packs still parsing), the bulk actions in the mock (and Undo), the emoji to Fluent file lookup, and any new HTTP adapter method with stubbed `fetch`.
- Run `pnpm check` (typecheck, lint, test) and `pnpm build`. Both must pass.
- Do NOT run Playwright or take screenshots locally; my laptop is too slow. CI runs its own smoke tests on the PR. In the PR, write "Screenshots skipped by the founder's request (laptop)".
- Open `/catalog` once in the dev server, as the burger and the tala account, and confirm 0 console errors. Also open one storefront menu page in dev and confirm the category icons still show.

## Docs and git

- `docs/components.md`: the installs and every new reuse. Decision T37 (packages) is already in `docs/decisions.md`; add a new decision only for something I approve during this task.
- `docs/PROGRESS.md`: under Phase 3, `- [x] T15b Menu page part 2: grid and table, bulk actions, category icons (PR #n)`. `docs/CHANGELOG.md`: one line.
- Commit in small steps. Push `ag/t15b-menu-views-icons`, then open the PR yourself into `main` with `gh pr create --base main` and print the link. Never push to `main`, never merge, never force-push, never run `pnpm db:push`, and never change the database.

## Done when

- [ ] List, Grid and Table views work. Every action icon (edit, duplicate, hide, sold out, archive, delete) works and has a tooltip.
- [ ] Ticking items shows the action bar; every bulk action works and has Undo.
- [ ] Table columns sort, the column picker works, and dragging rows keeps the order.
- [ ] A category icon can be set from Suggested (3 styles), Any emoji, or Upload your own, and the storefront mock draws it.
- [ ] No phone calls jsDelivr or GitHub for emoji or icons; the Fluent files total is reported (stop if over 10 MB).
- [ ] No hand-written components; installed library files are unchanged; each install has a `/kit` section and a `docs/components.md` row.
- [ ] `pnpm check` and `pnpm build` are green, with 0 console errors on `/catalog`. No Playwright and no screenshots.
- [ ] Finish with: the PR link, what changed, how to test (which account, which clicks), and what I must do by hand.
