<!-- prettier-ignore-start -->
Task T02: Storefront library parts, shop palette, motion tokens and image placeholders

Read first: AGENTS.md, docs/blueprints/foundation.md, docs/ux.md, docs/design-tokens.md, docs/components.md, docs/prompts/ref/storefront-components.md (sections 1, 2 and 4), docs/prompts/ref/storefront-rules.md section 1.

FOUNDER DECISIONS USED (change before running)
 - D1/D2: ReUI c-* examples are NOT installed here; they go to the dashboard /kit in T02b. This task installs only primitives.
 - D3/D8/D13: approved packages (exact versions, only through the shadcn CLI unless named): embla-carousel-react, embla-carousel-autoplay 8.6.0 (added by hand to packages/ui; the carousel composition needs it), input-otp, qrcode + @types/qrcode, canvas-confetti + types, motion (Number Ticker only), @base-ui/utils, @diceui/checkbox-group. Anything else the CLI wants to add: stop and ask.
 - D4: Opensource UI Add to Cart, Thermal Receipt and Like Toggle are approved copy-paste (the one exception to "never copy by hand").
 - D6: the compositions in ref/storefront-components.md section 4 are approved (built only from installed parts).
 - D7: no image compression package; compressImage() uses the browser canvas (built in T10).
 - Storefront colours use the existing shop palette in docs/design-tokens.md (--shop-60, --shop-30, --shop-10...), not the --brand-50..900 ramp from the research report.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

GOAL
Every library part the storefront needs is installed once in packages/ui and shown on /kit; a shop's one brand colour becomes a readable palette; motion is calm and switches off for reduced motion; and every image spot has a designed placeholder, so a shop with no photos still looks finished.

0. BEFORE YOU CODE
 - Branch ag/t02-storefront-kit from the latest main (after T02a is merged). Node 24.14.0. Post a short plan (files, steps, every package the CLI will add) and wait for my OK.
 - Never touch the dashboard sidebar, rail, top bar or dock styling. bottom-dock.tsx output for the dashboard must not change (its tests stay green).

1. DRY RUNS FIRST (report the output before installing)
 - pnpm exec shadcn add carousel -c packages/ui --dry-run
 - pnpm exec shadcn add @diceui/qr-code -c packages/ui --dry-run
 - pnpm exec shadcn add @magicui/confetti -c packages/ui --dry-run
 - Check: files land in packages/ui/src/components (or hooks/lib), imports use @smartapp/ui/..., `cn` comes from 'cn', no "IconPlaceholder", "@/registry/" or "app/(create)". If the Magic UI registry URL in components.json fails, check https://magicui.design/docs/installation for the current one and tell me before changing it.

2. INSTALL (exact commands in ref/storefront-components.md section 2)
 - shadcn primitives (34 in the list; the CLI skips the ones already installed): `pnpm exec shadcn add ... -c packages/ui`. Answer No to every overwrite.
 - DiceUI 12, Magic UI 3: same file, same target.
 - Add embla-carousel-autoplay 8.6.0 (exact) to packages/ui dependencies.
 - Run `pnpm view <pkg> engines license` for every new package and paste the result in the PR. Any engines range that excludes Node 24.14: stop.
 - Never edit the files the CLI wrote; wrap or compose them. If a file breaks our lint (casts, hex), use the existing scoped ESLint override for shadcn files only if the same pattern is already covered; otherwise stop and show me the error.

3. OPENSOURCE UI COPIES (packages/ui/src/vendor/opensource-ui/)
 - add-to-cart.tsx, thermal-receipt.tsx, like-toggle.tsx copied from the pages in ref/storefront-components.md section 2. First line: source URL, date copied, "MIT, Opensource UI by Bidyut Kundu".
 - Replace their cn helper with our `cn`, hard-coded colours with tokens (emerald → success, brand → shop-10), add motion-reduce: variants. No new packages (they need clsx, tailwind-merge and lucide-react; we use cn and lucide).
 - If a page can't be opened, stop and tell me; never rebuild it from memory.

4. SHOP PALETTE AND TOKENS
 - packages/core/src/rules/palette.ts: `shopPalette(hex)` → { shop60, shop30, shop10, shop10Foreground, shop10Soft, shop10Hover } as OKLCH strings, following docs/design-tokens.md "Shop brand" exactly (darken until white text reaches 4.5:1, else black text). Pure maths, no package. `contrastRatio(a, b)`.
 - packages/ui: `ShopTheme` (a server-safe component) sets those values as CSS variables through cssVars() on a wrapper. Tailwind utilities through @theme inline: bg-shop-60, bg-shop-30, bg-shop-10, text-shop-10-foreground, bg-shop-10-soft, hover:bg-shop-10-hover. Keep the existing bg-shop/text-shop utilities working.
 - tokens.css + design-tokens.md: motion (--duration-fast 120ms, --duration-base 200ms, --duration-slow 300ms, --ease-standard cubic-bezier(0.2, 0, 0, 1)) and layers (--z-sticky, --z-basket, --z-dock, --z-sheet, --z-toast, --z-confetti) as Tailwind theme values, so classes like z-dock exist.
 - globals.css: one reduced-motion rule (animations and transitions to near zero, scroll-behavior auto) so library parts with built-in animation (DiceUI status ping, banner slide, skeleton shimmer, spinners) calm down without editing their files. Motion utilities for later tasks: `press-stamp` (scale 1.3 → 0.95 → 1, rotate -8°, 300 ms), `draw-check` (SVG stroke-dashoffset, 400 ms), `reveal-clip` (View Transitions clip-path circle from a point, with an instant fallback when document.startViewTransition is missing). All are off under reduced motion.
 - Tests: tokens-contrast.test.ts runs shopPalette on the 5 demo brand colours (ref/demo-menus.md) and 6 presets including a very light yellow and a very dark navy; every text pair passes 4.5:1.

5. WRAPPERS FOR MOTION-HEAVY PARTS (packages/ui/src/compositions)
 - `celebrate.ts`: lazy `import('canvas-confetti')` only when called; always passes disableForReducedMotion: true; two presets: `stampBurst(origin)` (about 20 particles, small spread) and `rewardReady()` (side cannons, once).
 - `count-up.tsx`: wraps Magic UI Number Ticker, loaded with next/dynamic-safe React.lazy, renders the final number with tabular-nums under reduced motion or before it loads.
 - `banner-carousel.tsx`: carousel + autoplay plugin. Props: slides (ShopImage refs + alt), seconds (default 5). First slide renders as a plain image (priority) and the carousel code loads after it; one slide = no carousel code at all. Autoplay stops on touch, hover, focus and when off-screen (IntersectionObserver), never runs under reduced motion; dots (44 px hit area via Hitbox) and swipe; aria-roledescription="carousel", each slide "1 of 3".

6. PLACEHOLDERS (the "still looks finished" rule)
 - packages/ui/src/compositions/shop-image.tsx: props { src: ImageSources | null, alt, ratio: '1:1' | '4:3' | '21:9' | '16:9', fallbackIcon?: IconKey, fallbackText?: string, sizes }. Photo with <picture> (AVIF then WebP), explicit width/height, lazy unless priority. No photo or a load error → a bg-shop-10-soft tile of the same ratio with the Fluent icon centred (fallbackIcon) or the initials of fallbackText, never a broken image or empty box. Loading → skeleton of the same ratio.
 - shop-logo.tsx: square avatar (pattern c-avatar-4) with initials on bg-shop-10 / text-shop-10-foreground when there is no logo (pattern c-avatar-14).
 - brand-panel.tsx: banner fallback for a shop with no banners: shop name, tagline and logo on bg-shop-30 with the Magic UI grid pattern at low opacity.
 - Each gets a /kit section showing photo, missing photo, broken URL and loading, for kanto-smash (dark red) and aqualinis (blue).

7. /kit (dashboard, dev only, as today)
 - One section per new primitive and composition, in their main states. Add a "Storefront" group with the shop-brand switcher already planned in components.md, applying ShopTheme to the section.
 - The storefront has no /kit route.

8. DOCS
 - docs/components.md: one row per installed file and composition (Library: shadcn, ReUI, DiceUI, Magic UI, Opensource UI (copy), composition), with "Used in" = kit for now. Add a "Vendored copies" note: Opensource UI files, source URL, date; nothing auto-updates.
 - docs/design-tokens.md: shop palette utilities, motion and layer tokens, motion utilities.
 - docs/decisions.md: T22 Storefront library parts install into packages/ui; registry examples (c-*) live only in the dashboard /kit (dev only) and are never imported by an app screen. T23 Approved packages for the storefront kit: embla-carousel-react, embla-carousel-autoplay, input-otp, qrcode, canvas-confetti, motion (Rewards only), @base-ui/utils, @diceui/checkbox-group. N22 Every image spot uses ShopImage: photo, else a shop-coloured tile with a Fluent icon, else initials. N23 Banner carousel: first slide static, carousel code after it, owner sets seconds (default 5), pauses on touch, hover, focus and off-screen, no autoplay under reduced motion, no carousel code for one banner. N24 Opensource UI Add to Cart, Thermal Receipt and Like Toggle (kit only) are vendored copies in packages/ui/src/vendor.
 - Tick T02 in PROGRESS.md, one CHANGELOG line.

DONE WHEN
 - Every part in ref/storefront-components.md sections 1 and 2 (except the c-* examples) is installed, in components.md and on /kit.
 - shopPalette passes contrast for all 5 demo shops and the presets.
 - ShopImage shows a finished tile for a missing or broken image at every ratio.
 - Storefront first-load JS is unchanged by this task (none of the new parts is imported by a storefront page yet): paste the `pnpm --filter @smartapp/storefront build` route table before and after.

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint and pnpm build green. Never weaken eslint or tsconfig, never skip a test, never bypass minimumReleaseAge. No workarounds: if something fails, stop and show me the error.
 - Open /kit at 390 and 1280 px: 0 console errors, 0 React warnings, no sideways scroll; check reduced motion with Chrome DevTools Rendering → "prefers-reduced-motion: reduce".
 - Screenshots of the new /kit sections at 390 and 1280 in the PR. gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test, what I must do by hand.

OUT OF SCOPE: ReUI c-* examples (T02b), mock data (T03), storefront pages and shell (T04+), dark mode for the storefront (P4), changing bottom-dock, nav-drawer or page-header behaviour, any database work.
<!-- prettier-ignore-end -->
