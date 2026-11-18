---
name: smartapp-ui-check
description: How to check UI work in Smart App PH before calling it done: brand guard, contrast tests, the JS budget and the CI UI scan that opens every route at phone, tablet and desktop sizes in light and dark. Use it at the end of any task that changed a page, component, style, token or route in apps/dashboard, apps/storefront or packages/ui, and whenever the UI scan in CI fails.
---

# Checking Smart App PH UI

"It builds" is not "it looks right". A green build has shipped a brown banner in dark mode and a navy card that vanished on a navy page. These checks exist so a person is never the first to find that.

The founder's laptop is slow, so the heavy checks run in GitHub Actions or a cloud session. Run the light checks, push, and read what CI reports.

## 1. Local (fast)

```
pnpm format:check
pnpm check
```

`pnpm check` includes `tooling/brand-guard.test.ts` (raw colours, hex, `oklch` transparent mixes), the ESLint walls (arbitrary values, inline style, imports) and `packages/ui/test/tokens-contrast.test.ts` (every text pair 4.5:1, edges 3:1, surface layers in order). If the brand guard fails, its message names the file, the line and the token to use. Add `brand-guard-ignore` only when the colour is data (a phone status-bar colour, a shop's default, a kit stress sample) and say why on the same line.

Storefront change? Also `pnpm -r run build` then `pnpm --filter @smartapp/tooling budget` (300 KB per page).

## 2. CI (automatic on every push to main)

- **Check**: format, audit, typecheck, lint, unit tests, build, JS budget, and the build scan (no demo emails, `/kit`, sample-data tools or dev URLs in live bundles).
- **Storefront smoke (e2e)**: every storefront page at 390 and 1280 px.
- **UI scan**: `tooling/e2e/ui-scan.e2e.ts` builds both apps in preview mode and opens every page in `apps/dashboard/src/features/kit/route-catalog.ts` (so add new pages there) plus the five kit pages, at 360, 768 and 1280 px, the dashboard in light and dark, signed in with the sample sign-in. A page fails on JavaScript or console errors, failed requests, or sideways scroll.

## 3. Reading the results

Pass or fail, the UI scan uploads the **ui-scan-report** artifact: `report.md` plus a screenshot of every page. Download it from the run's page on GitHub (Summary → Artifacts), or with `gh run download <run-id> -n ui-scan-report`.

Hard problems must be fixed. Soft findings (text covered by another layer, tap targets under 24 px) need judgement: fix them if a real person would be blocked, otherwise say so in your report. Open the screenshots of the screens you touched; the scan can't tell you that something is ugly or confusing.

There are no pixel baselines: the screenshots are for looking at, not for comparing.

## 4. Looking yourself

Open the screen in light and dark at 360 px and 1280 px, with a food shop (Kanto Smash) and a retail shop (Tala Apparel). Use the Preview panel to step through empty, error, slow, offline and closed. 0 console errors and 0 React warnings.

## 5. Running the scan on a fast machine

```
VITE_APP_ENV=preview VITE_DATA_SOURCE=mock VITE_SHOW_KIT=true pnpm --filter @smartapp/dashboard build
NEXT_PUBLIC_APP_ENV=preview NEXT_PUBLIC_DATA_SOURCE=mock pnpm --filter @smartapp/storefront build
pnpm --filter @smartapp/tooling exec playwright install chromium
pnpm ui-scan
```

The dashboard build also needs the `VITE_*` addresses from `.env.example`; placeholders are fine on sample data. On macOS 12 add `PLAYWRIGHT_CHANNEL=chrome`.
