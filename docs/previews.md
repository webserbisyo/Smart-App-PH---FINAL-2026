# Public demo links (preview builds)

Two links anyone can open, on sample data, with no database and no real sign-in (decision T100): the storefront for the five demo shops, and the owner dashboard with "Look around with sample data" on its sign-in page. Both show the **Preview** pill (bottom left, next to the side nav on a computer) to switch the scenario, the clock and who you view as. Add `?clean=1` to any address to hide the pill for screenshots, `?clean=0` to bring it back.

A preview build is not a live shop. Live builds (`APP_ENV` empty or `production`) have none of this: no Preview pill, no sample sign-in, no `/kit`, and CI checks that.

## What a preview build turns on

| Setting                        | Where      | What it does                                                                    |
| ------------------------------ | ---------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_ENV=preview`  | storefront | Preview pill (shop, view as, scenario, clock), `?mock=` `?as=` `?now=`, noindex |
| `NEXT_PUBLIC_DATA_SOURCE=mock` | storefront | Sample data in the browser (the default)                                        |
| `VITE_APP_ENV=preview`         | dashboard  | Preview pill (view as, scenario, clock), sample sign-in, noindex                |
| `VITE_DATA_SOURCE=mock`        | dashboard  | Sample data in the browser (the default)                                        |
| `VITE_SHOW_KIT=true`           | dashboard  | The five kit pages at `/kit`                                                    |

## Set it up on Vercel (founder, by hand, about 15 minutes)

Make **two new projects**. Don't reuse the old `storefront` and `dashboard` projects in the team: they belong to the old repo and carry its settings.

### 1. The storefront project

1. Vercel → **Add New… → Project** → import `webserbisyo/Smart-App-PH---FINAL-2026`.
2. **Project Name**: `smartapp-demo-storefront`.
3. **Root Directory**: click Edit → pick `apps/storefront`. Framework: Next.js (detected).
4. **Build and Output Settings**: leave the defaults (Vercel runs `turbo build` for this folder).
5. **Environment Variables** (add each):
   - `NEXT_PUBLIC_APP_ENV` = `preview`
   - `NEXT_PUBLIC_DATA_SOURCE` = `mock`
   - `ENABLE_EXPERIMENTAL_COREPACK` = `1` (so Vercel uses our pnpm 12.8.1 from `package.json`)
6. **Deploy**. Copy the address it gives you, for example `https://smartapp-demo-storefront.vercel.app`.
7. Settings → **General → Node.js Version**: `24.x`. Redeploy if it was different.

### 2. The dashboard project

1. **Add New… → Project** → the same repo again.
2. **Project Name**: `smartapp-demo-dashboard`.
3. **Root Directory**: `apps/dashboard`. Framework: Vite (detected). `apps/dashboard/vercel.json` already sends every page to the app, so links like `/orders` open directly.
4. **Environment Variables**:
   - `VITE_APP_ENV` = `preview`
   - `VITE_DATA_SOURCE` = `mock`
   - `VITE_SHOW_KIT` = `true`
   - `VITE_STOREFRONT_URL` = the storefront address from step 1.6 (kit photos and "View shop" use it)
   - `VITE_API_URL` = `https://api.webserbisyo.com` (not called on sample data; any https address works)
   - `VITE_SUPABASE_URL` = `https://example.supabase.co` and `VITE_SUPABASE_PUBLISHABLE_KEY` = `preview` (not called with the sample sign-in; real values also work, and then real sign-in works too)
   - `ENABLE_EXPERIMENTAL_COREPACK` = `1`
5. **Deploy**, then set Node.js Version `24.x` as above.

### 3. Connect the two

1. Storefront project → Settings → Environment Variables → add `NEXT_PUBLIC_DASHBOARD_URL` = the dashboard address (the Editor's live preview only opens inside that address).
2. Deployments → the latest → ⋯ → **Redeploy**.

### 4. Check it

- Storefront: open `<storefront address>/kanto-smash`. The Preview pill shows bottom left. Try Scenario → Closed, then Shop → Tala Apparel.
- Dashboard: open the dashboard address → **Look around with sample data**. Home opens as the Kanto Smash owner. Preview → View as → Platform admin opens `/admin`.
- Kit: `<dashboard address>/kit`, then the Dashboard, Storefront, Tokens and Routes tabs.

Every push to `main` redeploys both. Vercel's own preview links for branches work the same way.

## Before a real shop goes live

Real shops get their own projects (or the live domains `<slug>.webserbisyo.com`, `shop.webserbisyo.com` and `app.webserbisyo.com`, T105) **without** `APP_ENV=preview` and `VITE_SHOW_KIT`, with `DATA_SOURCE=api` per area as the API is wired. See `docs/launch.md`.
