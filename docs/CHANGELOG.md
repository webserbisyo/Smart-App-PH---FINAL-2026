# Changelog

One line per merged PR, newest first: `- YYYY-MM-DD T<nn> what changed (#PR)`.

- 2026-10-25 T07 menu and item sheet: category chips with scrollspy and favourites filter, search bar with debounce and clear, desktop category rail, responsive product cards with badges and quick-add, master item sheet (Drawer on phone, Dialog on desktop) with photo carousel, single/multi-axis variant pickers, min/max option groups, 120-char note, companion items, stepper quantity, and opensource-ui AddToCartButton (#16)
- 2026-10-25 T06 shop home: full 12-section layout with banner carousel and brand-panel fallback, tone-based announcements, closed/busy notices, loyalty rewards card with DiceUI circular progress, favourites and best sellers scrollers with quick-add, categories chips with Fluent icons, More/Less about text, hours table with closures, contact rows, members count pill, and smoke tests (#16)
- 2026-10-25 T04 storefront shell: shop layout with ShopTheme and per-shop metadata, top bar with open state and location bar, How and where sheet, storefront dock with the cart segment, basket drawer and 1280 px column with Undo, notify(), offline banner, platform and Not found pages, Playwright smoke tests in CI
- 2026-10-25 T02b /kit storefront patterns: the 119 ReUI c-* examples in the dashboard kit, grouped by screen with a demo-shop switcher and lazy sections, 8 ReUI primitives plus bubble and scroll-area, ReUI badge/alert mapped to our tokens (T28), named state variants and small utilities
- 2026-10-25 T02 storefront kit: 36 library parts (19 shadcn, 14 DiceUI, 3 Magic UI) and 3 vendored Opensource UI copies in packages/ui, shopPalette() and ShopTheme, motion and layer tokens, ShopImage/ShopLogo/BrandPanel placeholders, banner carousel, count-up, celebrate, /kit Storefront group
- 2026-10-25 T03b mock store, storefront adapters, deviceStorage and data hooks: activity and demo receipts from the packs, every storefront and owner-orders row of api.md, dev scenario switch (?mock, ?as, ?now), DATA_SOURCE per app
- 2026-10-25 T03a shop packs and rules: storefront, catalog, basket, order and loyalty schemas, rules for money, Manila time, hours and slots, options, delivery and maps links, order steps, stamps and phone numbers, the 5 demo shop packs plus test-blank and test-stress
- 2026-10-24 CI fix: patched fast-uri, body-parser, multer overrides and zod 4.6.6 catalog; aligned local database types with CI verification and unparked db check
- 2026-10-24 T02a demo shop images and Fluent category icons: 105 photos processed in AVIF/WebP, 52 Fluent icons, core media and icon helpers, DEMO_MEDIA manifest (#9)
- 2026-10-23 T05 dashboard shell: sidebar from sidebar-07, tablet rail, phone dock with More drawer, shared bottom-dock/nav-drawer/page-header, every MVP A page empty (#6)
- 2026-10-18 T01 monorepo, auth migration, 5 demo owners, login and sign-up, /kit, lint walls (#5)
- 2026-10-18 docs: README feature tracker, SYSTEM.md, SMART_APP_PH_BLUEPRINT.md, RESEARCH.md; decisions N1 to N11; ux.md, api.md, A-mvp.md, B-full.md aligned (#3)
- 2026-10-17 docs: restart pack moved to the root; cross-check of the old repos (UX, CSS, security and order rules), new docs/ux.md and docs/api.md
