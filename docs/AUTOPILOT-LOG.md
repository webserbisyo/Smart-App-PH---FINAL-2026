# Autopilot log

Night run started 2026-10-25 (Manila). Order: T02, T02b, T03a, T03b, T04, T06, T07, T08, T09, T10, T11, T12, T13, T14.

## Morning summary

(Written at the end of the run.)

## T02 Storefront kit (branch `ag/t02-storefront-kit`)

- PR: see the PR link in the morning summary. Status: **open, blocked** (not merged).
- Built: 19 new shadcn primitives, 14 DiceUI files (12 planned plus `direction` and `visually-hidden-input` that the CLI pulled in), 3 Magic UI parts, 3 vendored Opensource UI copies, `shopPalette()` + `contrastRatio()` in core, `ShopTheme`, shop/motion/layer/paper tokens, reduced-motion rule, `press-stamp` / `draw-check` / `reveal-clip`, `ShopImage`, `ShopLogo`, `BrandPanel`, `BannerCarousel` (lazy slides), `CountUp`, `celebrate`, `useReducedMotion`, /kit Storefront group with the shop switcher.
- Extra rules applied: installed only missing items, no `--overwrite`, answered No to every overwrite prompt (button.tsx and input.tsx were offered and skipped; `git diff` on the 17 existing component files is empty). popover, scroll-area and bubble skipped. `@diceui/circular-progress` added only `--animate-spin-around` and its `spin-around` keyframes to `globals.css`; the component already uses `motion-safe:` / `motion-reduce:animate-none`, and the global reduced-motion rule also stops it. `@types/canvas-confetti` moved to devDependencies. Counts fixed to 39 primitives / 17 installed in the T02 prompt, `ref/storefront-components.md` and `prompts/README.md`.
- Decisions from the box: D1/D2 (no c-\* here), D3/D8/D13 packages (all via the CLI except `embla-carousel-autoplay` 8.6.0 by hand), D4 vendored copies, D6 compositions, shop palette tokens (not the brand ramp). Decision numbers: the prompt's T22/T23 were taken on main, so they are **T24/T25**; N22 to N24 as planned. Later prompts' tech numbers shift by 2 (T03b T24 → T26, T04 T25 → T27, T13 T26 → T28).
- Hand-built: nothing outside the prompt. The compositions named in the T02 prompt (shop-theme, shop-image, shop-logo, brand-panel, banner-carousel + its lazy slides file, count-up, celebrate) are built only from installed parts. `useReducedMotion` (hook) and `startReveal` (lib) are small helpers that the prompt's reduced-motion and `reveal-clip` rules need.
- **Why it is blocked:** 8 files the CLI wrote fail our strict settings. Typecheck (`exactOptionalPropertyTypes`): `banner.tsx`, `checkbox-group.tsx`, `mask-input.tsx`, `pending.tsx`. Lint (React Compiler rules in `eslint-plugin-react-hooks` 7: `refs`, `set-state-in-effect`, plus one `no-useless-assignment`): `banner.tsx`, `carousel.tsx` (the official shadcn carousel), `mask-input.tsx`, `rating.tsx`, `visually-hidden-input.tsx`. The T02 prompt says: never edit the files the CLI wrote; use the scoped ESLint override only if the same pattern is already covered (it only covers type assertions); otherwise stop and show the error. The autopilot rules also forbid eslint-disable, casts and weakening config. So I did not change those files or the config.
- Tests: core palette tests (28) and ui tests (50) pass; `pnpm format:check` green; `pnpm check` fails only on the 8 files above (ui typecheck, dashboard typecheck, root lint); storefront build green and its JS is unchanged (171.0 KB gzip before and after); /kit at 390 and 1280 px (and with reduced motion): 0 console errors, 0 React warnings, no sideways scroll.

## T02b /kit library examples

- Skipped for now: it needs T02 merged (branch "after T02"; the ReUI examples reuse T02's primitives and /kit page). It will likely hit the same strict-lint issue in any ReUI primitive it pulls into `packages/ui`.

## T03a Shop packs and rules (branch `ag/t03a-shop-packs`)

- Runs from main without T02: it is core-only and does not use T02 code.
- Built: schemas (`common`, `enums`, `storefront`, `catalog`, `basket`, `order`, `loyalty`, `shop-pack`), rules (`money`, `time`, `hours`, `options`, `delivery`, `order-rules` with `STATUS_TONE`, `stamps`, `phone`), 5 shop packs plus a small builder, `test-blank` and `test-stress`, error codes from api.md plus the 7 new ones (each with words), `words.shop`.
- Decisions from the box: one TypeScript source for packs; test shops only in mock/test (the data layer gates them in T03b); km rows plus zones; no stock counts; QR Ph; one prep time; COD limit (Kanto ₱3,000); limited prizes and the pause switch; Kapé Juan prize 50 pieces (mock value); every pack item `sample: true`.
- Choices made where the docs left room (all logged here and in code comments):
  - Payment accounts follow the prompt (it says to replace the lines in demo-shops.md). Tala keeps COD and drops Maya; Kapé Juan drops the BDO bank account.
  - Kanto's Dip group differs for nuggets (choose 1) and the bucket (up to 4), so they are two groups: "Dip" and "Dips".
  - The Kapé Juan closure "next week" is a fixed date, 2026-11-01 (All Saints' Day), so the pack stays plain data.
  - "Sold out today" items have `soldOutUntil: null` in the pack; the mock store sets the next opening.
  - The Tala prize shows "18 left": with the 20% rule, 23 would still read "Only 100 pieces".
  - Midnight reads "12 MN" and noon "12 NN" (demo-shops.md uses "12:00 MN").
  - `words.storefront` was already a string, so the new storefront words live under `words.shop`.
- Tests: core 114 passing (packs parse, item counts 18/8/14/18/19, photo refs, groups, limits, blueprint section 14 states, every rule table); `pnpm format:check`, `pnpm check` and `pnpm build` green; storefront JS unchanged.
