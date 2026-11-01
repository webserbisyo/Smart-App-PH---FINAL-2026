# T15 Menu page (dashboard): Items, Categories, Add-ons, item editor

Copy everything below the line into Antigravity.

---

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

You are building ONE page of the Smart App PH owner dashboard: the Menu page (called "Products" for retail shops). It has the Items, Categories and Add-ons tabs plus the item editor (`/catalog`, `/catalog/categories`, `/catalog/add-ons`, `/catalog/new`, `/catalog/$itemId`). Today every one of these routes shows an `EmptyPage` placeholder.

Read first: `AGENTS.md`, `docs/blueprints/foundation.md`, `docs/ux.md` (sections 1 to 7, especially the "Menu or Products" note and section 7, Dashboard brand rules), `docs/api.md` (the "Catalog (owner)" table, the `saveSortOrder` and `createUploadUrl` rows), `docs/components.md`, `docs/design-tokens.md`, and `docs/decisions.md` (T27, T28, T34, T35, T36).

## Step 0: scan, investigate, plan, then STOP

Do not write code or install anything in this step.

1. Run `git checkout main && git pull`, then create the branch `ag/t15-menu-page`.
2. Critically scan the repo and write down what you find:
   - The `DataAdapters` pattern in `packages/data/src/adapters/` (`types.ts`, `index.tsx`, `lazy.ts`), the mock store in `packages/data/src/mocks/`, `api-client.ts` (`fetchApi`, `errorCodeOf`), `env.ts` (`DATA_SOURCES`), and the storefront hooks in `packages/data/src/hooks/storefront/` (query keys in `qk.ts`).
   - The catalog schemas in `packages/core/src/schemas/catalog.ts` and `enums.ts` (`AVAILABILITY`, `ITEM_STATUSES`), `vocab(kind)` and `words.screens.catalog` in `words.ts`, `IconKey` in `icons.ts`, and `imageSources()` in `media.ts`.
   - The 5 demo shop packs in `packages/core/src/demo/packs/` (`kanto-smash`, `aqualinis`, `tala-apparel`, `kape-juan`, `lola-remy`) and their images in `apps/storefront/public/demo/<slug>/`. Also how `resolveShop()` in `apps/dashboard/src/app/shop.ts` picks the owner's shop from `claims.demoShop`. Each demo owner account (burger, water, tala, cafe, bakery) maps to one pack.
   - How the kit loads demo photos in the dashboard (`imageSources(ref, VITE_STOREFRONT_URL)` in `features/kit/storefront-sections.tsx`).
   - Every installed part listed in "Reuse" below. Open each file and confirm its props.
3. Post a plan containing: the files you will add or change, the adapter interface (method names and Zod input and output types), the new schemas, the query keys, the component per screen, and anything that does not fit or where two docs disagree.
4. STOP and wait for my "yes". Do not continue until I answer.

## Installs (after my yes)

Run each from `packages/ui` with the pinned CLI. Never use `pnpm dlx shadcn@latest`.

1. `pnpm exec shadcn add @reui/sortable`: drag to reorder. It adds `@dnd-kit/core`, `@dnd-kit/sortable` and `@dnd-kit/utilities`. Pin exact versions with no `^` (expected: 6.3.1, 10.0.0 and 3.2.2, all older than 7 days). They must install on Node 24.14 with `engineStrict` left on. If one does not, pin an older version that does and tell me; never use `packageExtensions`.
2. `pnpm exec shadcn add @diceui/file-upload`: the photo drop area. It must add no new npm package; if it does, stop and tell me.
3. Optional: `pnpm exec shadcn add @diceui/editable` for renaming a category in place. Skip it if it adds an npm package.

Rules for installed files: they stay exactly as the CLI wrote them (T27). ReUI Sortable ships with `any` and a file-level eslint-disable. Keep it as it ships and record that in decisions as T37 (below). If the CLI rewrites anything into a form that breaks typecheck, stop and tell me; do not patch the file on your own. Add each install to `docs/components.md` and give each one a section on `/kit` in the same commit.

## Reuse (do not rebuild these)

`item`, `shop-image`, `product-card`, `reui/badge`, `switch`, `reui/frame`, `card`, `field`, `input`, `textarea`, `input-group` (search with clear), `native-select`, `reui/number-field`, `checkbox-group` (DiceUI, for picking add-on groups and "Goes well with"), `toggle-group` (filter), `reui/scrollspy` and `scroller` (category rail and chips), `reui/icon-tile`, `responsive-dialog`, `sheet`, `drawer`, `alert-dialog`, `dropdown-menu`, `skeleton`, `empty-state`, `reui/alert`, `notify` (toast), `attachment`, `progress`, `cropper` (DiceUI, square crop), `tabs` with `usePathTabs`, `page-header`, `use-online-status`, `use-coarse-pointer`, `use-reduced-motion`, and `compressImage()` from `@smartapp/data`.

Apps never import each other, so do not import the storefront item sheet. The preview is `product-card` inside a phone-sized frame in the shop's colours.

## Malinaw restyle (wrap, never edit library files)

Style by wrapping each part in feature files (`apps/dashboard/src/features/catalog/components/`) with token classes only. That means no hex, no arbitrary values, no raw palette classes, and no inline style except `cssVars()`. Base look: navy ink, one solid blue element per view, 12 px radius, Plus Jakarta Sans, the 8 pt grid, `elevation-*` (at most 2 levels on screen), motion 120/180/260 ms with `ease-enter`/`ease-exit`, transform and opacity only, and none at all with reduced motion. No glass, no count-up, no looping effects. Weights: 600 for headings, 700 only for numbers, `tabular` for money.

| Part | Look |
| --- | --- |
| Item row | 56 px square photo with a 12 px radius, name at weight 600 (2 lines at most), price right-aligned in tabular numbers ("₱120", or "from ₱120" when it has variants), status chips with icon + word + colour, a Sold out switch, and a More menu. A sold-out row fades to muted in 180 ms and its photo goes greyscale |
| Sold out and Visible switches | 44 px touch area. Sold out uses the warning tone and a ban icon; Visible uses an eye or eye-off icon. Flips in 120 ms |
| Drag | Grip icon handle. The lifted row gets `elevation-md` and a 2% scale; a dashed primary outline marks the drop spot; it settles in 180 ms. Keyboard drag with spoken updates ("Moved Adobo to position 3 of 8") |
| Photo area | A dashed 2 px drop area with a 12 px radius, up to 5 tiles, a Cover label on the first, a progress bar per tile, a Retry on failed tiles, a square crop, and drag to reorder |
| Editor sections | `reui/frame`, solid surface, `elevation-xs`, a heading at 600 with one helper line |
| Inputs | 16 px text, ₱ prefix on prices, character counters (name 80, description 300), errors that say what to do next |
| Filter chips | Pill shape with a count on each chip; the selected chip is solid navy |
| Category rail and chips | Desktop: a scrollspy rail on the left. Phone: chips that scroll sideways. The active one is primary with a sliding underline. Fluent icons in `icon-tile` |
| Sheets and dialogs | Phone: a bottom sheet with a 48 px sticky Save bar. Desktop: a dialog at `elevation-lg` |
| Save bar and toast | Slides up in 260 ms when there are edits. A "Saved" toast; quick changes (sold out, visible, reorder) get Undo |

Every restyled wrapper gets an example on `/kit`.

## Screens

Use `vocab(kind)` for every Menu/Products and dish/product word. Never compare the shop type in code. All visible text goes in `packages/core/src/words.ts`.

1. **Items tab.** Search with clear; filter chips All, Sold out, Hidden (with counts); one blue Add item button (a sticky bottom bar above the dock on phone, in the page header on desktop). Items are grouped by category in the order customers see them. Turning on Sold out asks "Back tomorrow" (`sold_out_today`, with `soldOutUntil` set to the next opening) or "Until I turn it on" (`sold_out`). An item with variants opens a sheet to pick which variants are sold out. A Reorder button shows drag handles only while active. The More menu has Edit, Duplicate, Hide from customers, Move up, Move down and Archive. Sample items show a Sample chip.
2. **Item editor** (new and edit). Sections: Photos (up to 5); Basics (name, description, category, price); Sizes and colours (up to 2 axes, a grid with price and sold out per combination); Add-ons (tick shared groups, or create one in a sheet); Goes well with (up to 4, never itself); Show as (Featured, New, Visible). Sticky Save. A leave guard on unsaved edits. Archive instead of Delete when `hasOrders`. Desktop: a 720 px form with a sticky preview column. Phone: one column.
3. **Categories tab.** Rows with icon, name and item count, drag to reorder. Tapping a row opens a sheet with the name (40 characters at most) and an icon picker from `IconKey`. Removing a category that still has items returns `category_not_empty`, worded "Move its items to another category first."
4. **Add-ons tab.** Each group shows its rule in words ("Pick 1, required" or "Pick up to 3"), its option count and "Used by N items". The edit sheet has name, min and max (`number-field`, with min ≤ max as in the schema), and option rows (name, + price, default, sold out, drag to reorder). It warns "Changes apply to all N items." and shows a small customer preview.

States on every tab: a loading skeleton in the real row shape; empty with one action (Items also offers Start with samples via the existing `ownerSamples` adapter); no search results with Clear search; an error with Try again (worded from `errorCodeOf()`, never from the message); an offline banner with switches and Save turned off; a failed save that keeps the form; long names; ₱99,999.00. 360 to 1280 px with no sideways scroll.

## Data: build it API-ready now, so NestJS is a swap and not a rewrite

1. **Contract in `packages/core`** (Zod, no React). Reuse `CategorySchema`, `ItemSchema`, `OptionGroupSchema` and `CatalogSchema`. Add:
   - `OwnerItemSchema` = `ItemSchema` + `hasOrders: boolean`
   - `ItemDraftSchema`: the save input (no server fields)
   - `OwnerOptionGroupSchema` = `OptionGroupSchema` + `usedBy: number`
   - `SortKindEnum` (`as const` array + `z.enum`): `category`, `item`, `option`
   - `UploadKindEnum` if one does not exist yet (match docs/api.md: `logo | banner | item | category | qr`)
   - new error codes `category_not_empty` and `item_has_orders` in `errors.ts`, with words in `errorWords`.

   These schemas are the API contract: NestJS will validate with the same ones later.
2. **Interface in `packages/data/src/adapters/types.ts`:** `OwnerCatalogAdapter`, with method names exactly as in docs/api.md: `listCategories`, `saveCategory`, `removeCategory`, `listItems`, `saveItem`, `setItemStatus`, `setSoldOut`, `listOptionGroups`, `saveOptionGroup`, `removeOptionGroup`, `saveSortOrder`, `createUploadUrl`. Inputs and outputs are typed with the core schemas only. Add `ownerCatalog` to `DataAdapters`. The shop is never an input: it comes from the signed-in owner (rule 12). The mock reads it from the session's `demoShop`.
3. **Mock** in `packages/data/src/mocks/`: implements every method on the existing mock store, seeded from each shop's pack. Every demo owner account (burger → kanto-smash, water → aqualinis, tala → tala-apparel, cafe → kape-juan, bakery → lola-remy) sees its own shop's real catalog, categories, add-on groups and existing photos (`demo:<slug>/items/<name>` refs, shown with `imageSources(ref, VITE_STOREFRONT_URL)`). Write no new fake products and copy no image files. Parse every return value with its schema. Mock `createUploadUrl` keeps the compressed photo in memory (object URL). It uses the existing scenario tool for slow, error and offline modes.
4. **HTTP adapter** in `packages/data/src/adapters/api/owner-catalog.ts`: the same interface built on `fetchApi(url, schema)` with `VITE_API_URL`, the HTTP verbs and paths from docs/api.md, and the owner's bearer token. No token helper exists yet, so the factory takes a `getToken(): Promise<string | null>` parameter; do not add one inside the adapter. It is not used yet. Only make it compile, plus one unit test with a stubbed `fetch` that checks paths and schema parsing. `createAdapters('api')` may stay as it is for other areas. Add a clear TODO naming where `ownerCatalog` will switch, so moving to NestJS means turning `VITE_DATA_SOURCE` to `api` for this area with no screen changes.
5. **Hooks** in `packages/data/src/hooks/owner-catalog/`: TanStack Query hooks that only call `useAdapters().ownerCatalog`, with query keys in their own `qk.ts`. Switches and reorder update instantly, roll back on error and show Undo. Screens import hooks only, never mocks or adapters (rule 3).
6. No `@supabase/*` anywhere outside `apps/api` and the 3 existing login files (rule 13, T34). Touch no database or migration.

## Tests (basic only, no Playwright, no screenshots)

- Unit tests (vitest) for: the new schemas (valid and invalid), mock adapter methods (sold out today vs until turned on, reorder, `category_not_empty`, archive when `hasOrders`, min ≤ max), the HTTP adapter with stubbed `fetch`, and the pure helpers (price label "from ₱", "Pick up to 3" wording).
- Run `pnpm check` (typecheck, lint, test) and `pnpm build`. Both must pass.
- Do NOT run Playwright or take screenshots locally; my laptop is too slow. CI runs its own smoke tests on the PR. In the PR, write "Screenshots skipped by the founder's request (laptop)".
- Open `/catalog` once in the dev server, as the burger and the tala account, and confirm 0 console errors.

## Docs and git

- `docs/components.md`: the installs and every new reuse.
- `docs/decisions.md`: add `T37 Menu page packages (founder, 2026-11-01): ReUI Sortable with @dnd-kit/core, sortable and utilities (exact versions); DiceUI File Upload (no new package); installed files kept as shipped (T27), including Sortable's own eslint-disable for any; daily cap and stock wait until after launch.`
- `docs/PROGRESS.md`: under Phase 3, `- [x] T15 Menu page (PR #n)`. `docs/CHANGELOG.md`: one line.
- Commit in small steps (installs, contract and adapters, screens, kit, docs). Push `ag/t15-menu-page`, then open the PR yourself into `main` with `gh pr create --base main` and print the link. Never push to `main`, never merge, never force-push, never run `pnpm db:push`, and never change the database.

## Done when

- [ ] All 5 demo owner accounts open their own catalog with their own photos; Tala (retail) reads "Products" and shows sizes and colours.
- [ ] Marking an item sold out takes 2 taps at 390 px, with both kinds working; Visible hides an item.
- [ ] A new item with 2 photos, one size axis and one add-on group saves and shows in the right category.
- [ ] Reorder works by drag, by keyboard, and with Move up and Move down on items, categories, add-on options and photos, and it is kept.
- [ ] Every state above can be shown with the mock scenario switches.
- [ ] No hand-written components; installed library files are unchanged; each install has a `/kit` section and a `docs/components.md` row.
- [ ] The screens use only the hooks, and the HTTP adapter compiles and is tested, so switching to NestJS needs no screen changes.
- [ ] `pnpm check` and `pnpm build` are green, with 0 console errors on `/catalog`.
- [ ] Finish with: the PR link, what changed, how to test (which account, which clicks), and what I must do by hand.
