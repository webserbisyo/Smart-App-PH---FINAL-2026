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

Run each from `packages/ui` with the pinned CLI (`pnpm exec shadcn add ...`), never `pnpm dlx shadcn@latest`. Every npm package gets an exact version (no `^`), must be at least 7 days old, and must install on Node 24.14 with `engineStrict` on. If one doesn't, pin an older version that does and tell me. Never use `packageExtensions`. If any install adds an npm package not listed here, stop and tell me.

Required:

| Install | npm packages it may add (exact) |
| --- | --- |
| `@reui/sortable` | `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2 |
| `@reui/data-grid`, `@reui/data-grid-table`, `@reui/data-grid-table-dnd-rows`, `@reui/data-grid-column-header`, `@reui/data-grid-column-visibility`, `@reui/data-grid-scroll-area` (shadcn `select` and `popover` come with them) | `@tanstack/react-table` 9.3.1, `@tanstack/react-virtual` 3.14.22 (not 3.14.24: too new), `@dnd-kit/modifiers` 9.0.0 |
| `@reui/use-file-upload` | none |
| `@reui/file-type` | none |
| `@reui/emoji-picker` | none |
| `@diceui/action-bar` | none |
| `@diceui/badge-overflow` | none |
| `@diceui/stat` | none |
| `button-group` (shadcn) | none |

Dev only: `@tanstack/react-query-devtools` 5.104.1, an exact dashboard devDependency matching `@tanstack/react-query` 5.104.1. Tooling only: `emojibase-data` 17.0.0, an exact `@smartapp/tooling` devDependency (the version the ReUI picker reads).

Optional, only if they add no npm package: `@diceui/editable` (rename a category in place), `@diceui/swap` (view toggle icon), shadcn `kbd` (desktop shortcuts / and N), shadcn `context-menu` (right-click a row).

Do NOT install: DiceUI `file-upload` (replaced by ReUI `use-file-upload`), ReUI `filters` (date-fns and cascader), DiceUI `faceted` (cmdk), DiceUI `tour` (@floating-ui), any pattern that needs `sonner` (use our `notify`), or Magic UI effects.

Rules for installed files: they stay exactly as the CLI wrote them (T27). Several ship with `any` and their own eslint-disable (Sortable, Data Grid, File Type, Emoji Picker); keep them as shipped and record it in T37. If the CLI output breaks typecheck, stop and tell me; don't patch on your own. Use ReUI patterns as references only (`c-file-upload-7` and `-8` image upload with sorting, `c-sortable-5` and `-7`, `c-data-grid-7` and `-14` selection and drag rows, `c-table-11` product table, `c-toggle-group-8` view switch, `c-empty-15` no products, `c-emoji-picker-5` custom emoji tab, `c-file-type-8` upload with progress). Rebuild them in our feature files with our parts; never import an example. Each install gets a `docs/components.md` row and a `/kit` section in the same commit.

## Reuse (do not rebuild these)

`item`, `shop-image`, `product-card`, `reui/badge`, `switch`, `reui/frame`, `card`, `field`, `input`, `textarea`, `input-group` (search with clear), `native-select`, `reui/number-field`, `checkbox-group` (DiceUI, for picking add-on groups and "Goes well with"), `toggle-group` (filter), `reui/scrollspy` and `scroller` (category rail and chips), `reui/icon-tile`, `responsive-dialog`, `sheet`, `drawer`, `alert-dialog`, `dropdown-menu`, `skeleton`, `empty-state`, `reui/alert`, `notify` (toast), `attachment`, `progress`, `cropper` (DiceUI, square crop), `tabs` with `usePathTabs`, `page-header`, `use-online-status`, `use-coarse-pointer`, `use-reduced-motion`, and `compressImage()` from `@smartapp/data`, `avatar-group` ("used by" thumbnails), `tooltip` (every icon button).

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
| View toggle and actions | `toggle-group` with List, Grid and Table icons. Action icons are lucide (Pencil, Copy, Eye or EyeOff, Ban, Archive, Trash2) in a `button-group`, 44 px, each with a `tooltip`. Delete uses the destructive tone and only shows when the item has never been ordered |
| Grid card | Photo 4:3 with a 12 px radius and a gentle zoom on hover (transform only, off with reduced motion), name, price, chips, action strip at the bottom |
| Data grid | Navy header row at weight 500, 56 px rows, tabular prices on the right, a soft primary tint on ticked rows, sticky header, column picker |
| Action bar | Solid navy bar at `elevation-lg`, slides up in 260 ms, shows "3 selected" and the bulk actions |
| File-type badge | Neutral tones only (no brand colour per format), shows the type and size, e.g. "PNG 4.2 MB, becomes 180 KB" |
| Emoji picker | Inside our popover with a 12 px radius and Plus Jakarta Sans labels; the custom tab shows the shop's uploaded icons |
| Stat tiles | Plain numbers at weight 700 (no count-up); each tile taps to filter |
| Save bar and toast | Slides up in 260 ms when there are edits. A "Saved" toast; quick changes (sold out, visible, reorder) get Undo |

Every restyled wrapper gets an example on `/kit`.

## Screens

Use `vocab(kind)` for every Menu/Products and dish/product word. Never compare the shop type in code. All visible text goes in `packages/core/src/words.ts`.

1. **Items tab.** A `stat` row on top (items, sold out, hidden; each taps to filter). A view toggle for List (phone default), Grid (desktop default) and Table (desktop), remembered on the device. Table = ReUI data grid: tick box, photo, name, category, price, add-ons (`badge-overflow`), Visible, Sold out, actions; sortable columns; column picker; drag rows to reorder. Every card and row has the action icons (Edit, Duplicate, Hide or Show, Sold out, Archive, Delete only if never ordered, with a confirm). On phone the less-used actions sit in the More menu. Bulk: ticking rows (or a long press in List) slides up the `action-bar` with Sold out today, Back on, Hide, Show, Move to category and Archive, each with Undo. Search with clear; filter chips All, Sold out, Hidden (with counts); one blue Add item button (a sticky bottom bar above the dock on phone, in the page header on desktop). Items are grouped by category in the order customers see them. Turning on Sold out asks "Back tomorrow" (`sold_out_today`, with `soldOutUntil` set to the next opening) or "Until I turn it on" (`sold_out`). An item with variants opens a sheet to pick which variants are sold out. A Reorder button shows drag handles only while active. The More menu has Edit, Duplicate, Hide from customers, Move up, Move down and Archive. Sample items show a Sample chip.
2. **Item editor** (new and edit). Sections: Photos (up to 5, through `use-file-upload`: accept JPG, PNG and WEBP, plus HEIC when the browser can open it (else say "Save it as JPG and try again"); refuse files over 15 MB before compression with a clear message; compress on the phone with `compressImage()`; a `file-type` badge with the size before and after; a progress bar per tile; Retry per tile; drag to reorder; the first photo is the cover; a square crop with `cropper`); Basics (name, description, category, price); Sizes and colours (up to 2 axes, a grid with price and sold out per combination); Add-ons (tick shared groups, or create one in a sheet); Goes well with (up to 4, never itself); Show as (Featured, New, Visible). Sticky Save. A leave guard on unsaved edits. Archive instead of Delete when `hasOrders`. Desktop: a 720 px form with a sticky preview column. Phone: one column.
3. **Categories tab.** Rows with icon, name and item count, drag to reorder. Tapping a row opens a sheet with the name (40 characters at most) and an icon dialog with 3 tabs: **Suggested** (the Fluent set in the shop's chosen style: Flat, Color or 3D), **Any emoji** (ReUI `emoji-picker`; the picked emoji is drawn as its Fluent Flat file when we have it, else as the phone's own emoji), and **Upload your own** (square crop, saved as a 128 px WebP through `createUploadUrl` kind `category`; uploaded icons also show in the picker's custom tab). Removing a category that still has items returns `category_not_empty`, worded "Move its items to another category first."
4. **Add-ons tab.** Groups are cards. The rule is picked with presets in a `toggle-group` (Pick 1 required, Pick 1 optional, Pick any, Custom), and only Custom shows the min and max number fields. Groups can be duplicated. "Used by" shows item thumbnails (`avatar-group`) and opens the list. Each group shows its rule in words ("Pick 1, required" or "Pick up to 3"), its option count and "Used by N items". The edit sheet has name, min and max (`number-field`, with min ≤ max as in the schema), and option rows (name, + price, default, sold out, drag to reorder). It warns "Changes apply to all N items." and shows a small customer preview.

States on every tab: a loading skeleton in the real row shape; empty with one action (Items also offers Start with samples via the existing `ownerSamples` adapter); no search results with Clear search; an error with Try again (worded from `errorCodeOf()`, never from the message); an offline banner with switches and Save turned off; a failed save that keeps the form; long names; ₱99,999.00. 360 to 1280 px with no sideways scroll.

## Data: build it API-ready now, so NestJS is a swap and not a rewrite

1. **Contract in `packages/core`** (Zod, no React). Reuse `CategorySchema`, `ItemSchema`, `OptionGroupSchema` and `CatalogSchema`. Add:
   - `OwnerItemSchema` = `ItemSchema` + `hasOrders: boolean`
   - `ItemDraftSchema`: the save input (no server fields)
   - `OwnerOptionGroupSchema` = `OptionGroupSchema` + `usedBy: number`
   - `SortKindEnum` (`as const` array + `z.enum`): `category`, `item`, `option`
   - `UploadKindEnum` if one does not exist yet (match docs/api.md: `logo | banner | item | category | qr`)
   - `CategoryIconSchema`: a discriminated union of `{ kind: 'fluent', key: IconKey, style: 'flat' | 'color' | '3d' }`, `{ kind: 'emoji', char: string }` and `{ kind: 'image', ref: MediaRef }`. `CategorySchema.icon` uses it. Existing packs keep working (map today's keys to `{ kind: 'fluent', style: 'flat' }`). Update the storefront's category chips and `shop-image` fallback to draw all 3 kinds; this is the only storefront change, and it is required because customers see category icons
   - new error codes `category_not_empty` and `item_has_orders` in `errors.ts`, with words in `errorWords`.

   These schemas are the API contract: NestJS will validate with the same ones later.
2. **Interface in `packages/data/src/adapters/types.ts`:** `OwnerCatalogAdapter`, with method names exactly as in docs/api.md: `listCategories`, `saveCategory`, `removeCategory`, `listItems`, `saveItem`, `setItemStatus`, `setSoldOut`, `listOptionGroups`, `saveOptionGroup`, `removeOptionGroup`, `saveSortOrder`, `createUploadUrl`. Inputs and outputs are typed with the core schemas only. Add `ownerCatalog` to `DataAdapters`. The shop is never an input: it comes from the signed-in owner (rule 12). The mock reads it from the session's `demoShop`.
3. **Mock** in `packages/data/src/mocks/`: implements every method on the existing mock store, seeded from each shop's pack. Every demo owner account (burger → kanto-smash, water → aqualinis, tala → tala-apparel, cafe → kape-juan, bakery → lola-remy) sees its own shop's real catalog, categories, add-on groups and existing photos (`demo:<slug>/items/<name>` refs, shown with `imageSources(ref, VITE_STOREFRONT_URL)`). Write no new fake products and copy no image files. Parse every return value with its schema. Mock `createUploadUrl` keeps the compressed photo in memory (object URL). It uses the existing scenario tool for slow, error and offline modes.
4. **HTTP adapter** in `packages/data/src/adapters/api/owner-catalog.ts`: the same interface built on `fetchApi(url, schema)` with `VITE_API_URL`, the HTTP verbs and paths from docs/api.md, and the owner's bearer token. No token helper exists yet, so the factory takes a `getToken(): Promise<string | null>` parameter; do not add one inside the adapter. It is not used yet. Only make it compile, plus one unit test with a stubbed `fetch` that checks paths and schema parsing. `createAdapters('api')` may stay as it is for other areas. Add a clear TODO naming where `ownerCatalog` will switch, so moving to NestJS means turning `VITE_DATA_SOURCE` to `api` for this area with no screen changes.
5. **Hooks** in `packages/data/src/hooks/owner-catalog/`: TanStack Query hooks that only call `useAdapters().ownerCatalog`, with query keys in their own `qk.ts`. Switches and reorder update instantly, roll back on error and show Undo. Screens import hooks only, never mocks or adapters (rule 3).
6. No `@supabase/*` anywhere outside `apps/api` and the 3 existing login files (rule 13, T34). Touch no database or migration.

## Icons tooling

Extend `tooling/scripts/fluent-icons.ts` (same pattern as today; keep the MIT licence note):

- Grow the curated set from 52 to about 200 food and retail keys in `ICON_KEYS`, in 3 styles: Flat SVG, Color SVG and 3D (converted to WebP 128 px, like `fluent-art.ts`). Put them in `apps/storefront/public/icons/fluent/<style>/`.
- Also copy the full Fluent Flat SVG set into `apps/storefront/public/icons/fluent/all/`, named by Unicode codepoint, so any picked emoji draws in Fluent. Tell me the total size; if it's over 10 MB, stop and ask.
- Copy the `emojibase-data` 17.0.0 English files the picker needs into `apps/dashboard/public/emojibase/` and pass `dataUrl` to the picker, so no phone calls jsDelivr.
- The dashboard loads Fluent files from `VITE_STOREFRONT_URL`, like the demo photos.
- Noto, Twemoji, OpenMoji, Phosphor and Tabler are out (licence or rule 6).

## Dev tools (dev only)

- TanStack Query Devtools in the dashboard: `React.lazy(() => import('@tanstack/react-query-devtools'))` rendered only when `import.meta.env.DEV`. After `pnpm build`, search the built files for `ReactQueryDevtools` and confirm it's not there.
- A small dev-only panel in the dashboard for the existing mock scenario switches (slow, error, empty, offline), reusing `setMockScenario`, also behind `import.meta.env.DEV`.

## Tests (basic only, no Playwright, no screenshots)

- Unit tests (vitest) for: the new schemas (valid and invalid), mock adapter methods (sold out today vs until turned on, reorder, `category_not_empty`, archive when `hasOrders`, min ≤ max), the HTTP adapter with stubbed `fetch`, and the pure helpers (price label "from ₱", "Pick up to 3" wording), `CategoryIconSchema` (all 3 kinds, plus old packs still parsing), the bulk actions in the mock, and the photo checks (type and max MB).
- Run `pnpm check` (typecheck, lint, test) and `pnpm build`. Both must pass.
- Do NOT run Playwright or take screenshots locally; my laptop is too slow. CI runs its own smoke tests on the PR. In the PR, write "Screenshots skipped by the founder's request (laptop)".
- Open `/catalog` once in the dev server, as the burger and the tala account, and confirm 0 console errors.

## Docs and git

- `docs/components.md`: the installs and every new reuse.
- `docs/decisions.md`: add `T37 Menu page packages (founder, 2026-11-01): ReUI Sortable, Data Grid, use-file-upload, File Type and Emoji Picker; DiceUI Action Bar, Badge Overflow and Stat; shadcn Button Group, Select and Popover; packages @dnd-kit/core 6.3.1, sortable 10.0.0, utilities 3.2.2, modifiers 9.0.0, @tanstack/react-table 9.3.1, @tanstack/react-virtual 3.14.22, @tanstack/react-query-devtools 5.104.1 (dev), emojibase-data 17.0.0 (tooling); installed files kept as shipped (T27), including their own eslint-disable for any; category icons can be a Fluent key (Flat, Color or 3D), any emoji, or an uploaded image; daily cap and stock wait until after launch.`
- `docs/PROGRESS.md`: under Phase 3, `- [x] T15 Menu page (PR #n)`. `docs/CHANGELOG.md`: one line.
- Commit in small steps (installs, contract and adapters, screens, kit, docs). Push `ag/t15-menu-page`, then open the PR yourself into `main` with `gh pr create --base main` and print the link. Never push to `main`, never merge, never force-push, never run `pnpm db:push`, and never change the database.

## Done when

- [ ] All 5 demo owner accounts open their own catalog with their own photos; Tala (retail) reads "Products" and shows sizes and colours.
- [ ] Marking an item sold out takes 2 taps at 390 px, with both kinds working; Visible hides an item.
- [ ] List, Grid and Table views work. Every action icon (edit, duplicate, hide, sold out, archive, delete) works and has a tooltip.
- [ ] Ticking items shows the action bar; every bulk action works and has Undo.
- [ ] A new item with 2 photos (type and max-MB check, progress, type badge, crop), one size axis and one add-on group saves and shows in the right category.
- [ ] A category icon can be set from Suggested (3 styles), Any emoji, or Upload your own, and the storefront mock draws it.
- [ ] Reorder works by drag, by keyboard, and with Move up and Move down on items, categories, add-on options and photos, and it is kept.
- [ ] Every state can be shown with the dev scenario panel. Query Devtools shows in dev and is missing from the production build.
- [ ] No hand-written components; installed library files are unchanged; each install has a `/kit` section and a `docs/components.md` row.
- [ ] The screens use only the hooks, and the HTTP adapter compiles and is tested, so switching to NestJS needs no screen changes.
- [ ] `pnpm check` and `pnpm build` are green, with 0 console errors on `/catalog`. No Playwright and no screenshots.
- [ ] Finish with: the PR link, what changed, how to test (which account, which clicks), and what I must do by hand.
