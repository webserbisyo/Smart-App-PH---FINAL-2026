<!-- prettier-ignore-start -->
Task T02a: Demo shop images and category icons (run on the founder's Mac)

Read first: AGENTS.md, docs/blueprints/foundation.md, docs/demo-shops.md, docs/prompts/ref/demo-images.md (the answer key), docs/prompts/ref/demo-menus.md, docs/prompts/ref/storefront-components.md section 5 (Fluent icons).

FOUNDER DECISIONS USED (change before running)
 - D8: sharp 0.35.5 is approved as a dev dependency of tooling only (image script). No other new package.
 - D12: the "halo" folder is Halo Dessert Bar, MVP B only (Demo Shop Assets A9). Never copy it into the repo.
 - D5: Fluent Emoji Flat SVGs (MIT) are approved as static files.
 - Output names use one pattern `<name>-<width>.<ext>` (banners get `-1600` too), so imageUrl() has no special cases.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.
(This task has no UI components. It writes one script, one data file and static images.)

GOAL
Every demo photo the founder generated sits in the right shop folder with a clear name and the approved sizes, a typed manifest in core says which file belongs to which item, and anything that can't be matched is listed for the founder instead of guessed.

0. BEFORE YOU CODE
 - Branch ag/t02a-demo-assets from the latest main. Node stays 24.14.0; never upgrade Node or pnpm.
 - The images are in .github/assets/ on this Mac (uncommitted): aquawebp, halo, kanto smash, kape juan, panaderya ni lols webp, tala webp. Never commit .github/assets. Add `.github/assets/` to .gitignore in this PR.
 - Post a short plan (files, steps) and wait for my OK.

1. INVENTORY
 - List every file in .github/assets/** with folder, size in KB and pixel size. Count per folder.
 - Folder to shop: aquawebp → aqualinis, kanto smash → kanto-smash, kape juan → kape-juan, panaderya ni lols webp → lola-remy, tala webp → tala-apparel, halo → skip (MVP B).

2. IDENTIFY (look at every image; no Playwright or browser needed, open the files directly)
 - For each image decide its entry in docs/prompts/ref/demo-images.md: logo, banner-1..3, prize, or an item key (for example classic-smash). Match on what the picture shows ("Looks like" column) and the shop's style (Kanto: black counter and red neon; AquaLinis: white and aqua studio; Tala: sand paper backdrop; Kapé Juan: walnut café table; Lola Remy: bilao on narra wood).
 - Write tooling/assets/demo-image-map.json: one row per source file { source, shop, kind: "logo"|"banner"|"item"|"prize", key, confidence: "high"|"low", note }. Banners: tell banner 1, 2 and 3 apart by their titles in the answer key.
 - Rules: two images for the same key → keep both rows with confidence "low" and ask me which one; anything you can't match → kind "unknown"; never invent a key that is not in the answer key.
 - STOP: post a table to me (source file → shop → key, plus every "low" and "unknown" row, plus every answer-key entry that has no image). Wait for my OK or corrections before step 3.

3. CONVERT (tooling/scripts/demo-images.ts, run with `pnpm --filter @smartapp/tooling demo:images`)
 - Add sharp 0.35.5 (exact) to tooling devDependencies only. If sharp fails to install or load on this Mac (Intel, macOS 12), stop and report the error; do not try another image tool.
 - Reads demo-image-map.json; only rows with confidence "high" (or ones I confirmed) are processed. Idempotent: running twice gives the same files.
 - Writes into apps/storefront/public/demo/<shop>/:
   items/<key>-640.avif, -640.webp, -320.avif, -320.webp (square cover crop, centred)
   items/prize-640 / -320 (avif, webp) for Tala and Kapé Juan
   banners/banner-<n>-1600 and -800 (avif, webp), 16:9 cover crop
   brand/logo-256 and -128 (avif, webp); brand/icon-192.png, icon-512.png, icon-maskable-512.png (logo at 80% on the brand colour from ref/demo-menus.md), apple-touch-icon.png (180, no transparency); brand/og.jpg 1200 × 630 from banner 1
 - Budgets (fail the script, don't silently lower quality below 50): product 640 WebP ≤ 45 KB, banner 1600 WebP ≤ 130 KB, og.jpg ≤ 150 KB. AVIF must be smaller than its WebP. Strip metadata. Never upscale: a source smaller than the target width is an error listed for me.

4. FLUENT ICONS
 - tooling/scripts/fluent-icons.ts downloads the 52 keys (50 files) in ref/storefront-components.md section 5 from raw.githubusercontent.com into apps/storefront/public/icons/fluent/<key>.svg, plus the repo's LICENSE as apps/storefront/public/icons/fluent/LICENSE. If GitHub is blocked, stop and tell me.
 - packages/core/src/icons.ts: `ICON_KEYS` as const array + `IconKeyEnum` (Zod) + `iconPath(key)` returning `/icons/fluent/<key>.svg`. Exported from core.

5. MANIFEST AND HELPER (packages/core, no React)
 - packages/core/src/demo/media.ts: `DEMO_MEDIA` typed with a Zod schema: per shop slug { logo: boolean, banners: number (0 to 3), items: readonly key[], prize: boolean }. Generated from the files that exist (script writes it), then formatted with Prettier.
 - packages/core/src/media.ts: `MediaRef` = `demo:<slug>/<folder>/<name>` (later also storage paths); `imageUrl(ref, width, origin = '')` → `<origin>/demo/<slug>/<folder>/<name>-<width>.webp` and `imageSources(ref, origin = '')` → { avif, webp, widths } for <picture>. The storefront passes no origin; the dashboard passes VITE_STOREFRONT_URL, because the files are served by the storefront. Unknown or missing refs return null (the UI then shows the placeholder from T02).
 - Reserve the slug "demo" in packages/core/src/demo/slugs.ts so no real shop can take it.

6. TESTS
 - tooling/demo-assets.test.ts: every item, banner, logo and prize in DEMO_MEDIA has all its files on disk and within budget; no file in public/demo is missing from DEMO_MEDIA; no "halo" anywhere under apps/.
 - packages/core/test/media.test.ts: imageUrl and imageSources for an item, a banner, a logo, a missing ref (null).
 - packages/core/test/icons.test.ts: ICON_KEYS has no duplicates; iconPath format.

7. DOCS
 - docs/decisions.md: N20 Demo images live in apps/storefront/public/demo/<slug>/{items,banners,brand}, named <name>-<width>.<ext>, AVIF and WebP (products 640/320, banners 1600/800), read through imageUrl() in core; Halo Dessert Bar is MVP B only. T21 sharp is a tooling-only dev dependency for the demo image script. N21 Category icons are Fluent Emoji Flat SVGs (MIT) in apps/storefront/public/icons/fluent, keys in core.
 - docs/PROGRESS.md: add under Phase 1 "T02a Demo images and icons" and "T02b /kit library examples"; add under Phase 2 the lines T06 Shop home, T07 Menu and item sheet, T08 Basket, T09 Checkout and location, T10 Receipt, T11 My orders, T12 Rewards and account, T13 Install as an app, T14 Privacy and system pages. Tick T02a.
 - docs/CHANGELOG.md one line.

DONE WHEN
 - Every high-confidence image is converted, named and within budget; the founder confirmed the low/unknown list.
 - The PR body has three lists: converted (count per shop), missing from the answer key (no image yet), skipped (halo, unknown).
 - pnpm --filter @smartapp/tooling demo:images run twice changes nothing (git status clean after the second run).

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint and pnpm build green. Never weaken eslint or tsconfig, never skip a test, never bypass minimumReleaseAge. No workarounds: if something fails, stop and show me the error.
 - Total size of apps/storefront/public/demo in the PR body (expect about 12 to 16 MB for 105 images in 4 files each).
 - gh pr create --base main with the template filled; print the link. Finish with: PR link, what changed, how to test, what I must do by hand (delete .github/assets after I check the list).

OUT OF SCOPE: screens, the ShopImage placeholder (T02), mock data and the expanded menus in code (T03), Halo Dessert Bar, wordmarks, video, any database or Supabase Storage upload.
<!-- prettier-ignore-end -->
