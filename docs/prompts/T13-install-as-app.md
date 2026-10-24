<!-- prettier-ignore-start -->
Task T13: Install as an app (Serwist service worker, per-shop manifest and icons, offline page, install card, push for order status)

Read first: AGENTS.md, docs/ux.md, docs/decisions.md (T6), docs/stack-versions.md, docs/components.md, docs/prompts/ref/storefront-rules.md sections 4, 5 and 7, docs/SMART_APP_PH_BLUEPRINT.md sections 4.1, 7.12, 8.2 and 8.8, and the official Serwist docs for Next.js with Turbopack (serwist.pages.dev). Say which parts you verified in the docs and which you assumed.

FOUNDER DECISIONS USED (change before running)
 - D8 / T6: @serwist/turbopack 9.5.13 (exact) and the serwist package it needs, same version. Before installing, run a dry run and list every package it adds; if it needs anything else (or a Node newer than 24.14), stop and ask me.
 - Each shop installs as its own app: manifest per shop (name, short_name, colours, icons from public/demo/<slug>/brand or the shop's uploaded logo, start_url /<slug>, scope /<slug>/, id /<slug>). One service worker for the whole storefront.
 - Offline in A = saved menu, basket, checkout fill and saved receipts; Place order stays off offline; nothing is sent in the background (no background sync).
 - Push is only for order status ("Order #042 is ready"). In mock mode the subscription is saved on the phone and a dev button sends a test notification; real sending comes with the API.
 - Lighthouse 12 has no PWA score: installability is checked in Chrome DevTools (Application → Manifest) and the e2e test.

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

GOAL
A customer can add their favourite shop to the home screen from the receipt or the menu, open it like an app with the shop's icon and colours, and still see the menu and their last receipt with no signal.

0. BEFORE YOU CODE
 - Branch ag/t13-install-as-app from the latest main (after T12). Node 24.14.0. Post a short plan (packages from the dry run, files, caching table) and wait for my OK. Never touch dashboard shell styling.

1. SERVICE WORKER (apps/storefront)
 - Set up @serwist/turbopack the way its docs say for Next 16 (route that builds the worker, SerwistProvider in the root layout, src/app/sw.ts). Registered at scope "/" so every /<slug>/ app shares it; if the docs need a Service-Worker-Allowed header for that, add it in next.config and say so.
 - Off in development unless SERWIST_DEV=1 (so hot reload stays sane); on in production builds.
 - Caching table (write it in the PR body):
   - App shell, fonts, Fluent icons: precache.
   - Product, banner and brand images (/demo/**, later the storage host): CacheFirst, 200 entries, 30 days.
   - Shop page HTML (Home, Menu): NetworkFirst with a 3 s timeout, falls back to the cached copy, then the offline page.
   - Checkout, quotes, receipt /o/*, /image, proof uploads, join, auth, account, preview and API answers: NetworkOnly (decision T6) (the receipt offline copy comes from deviceStorage, T10).
   - Never cache API writes, proofs or anything with a token in the URL.
 - Update flow: a new worker waits; a small toast "New version ready · Refresh" (notify()) applies it; never reload by itself while a form has input.

2. MANIFEST AND ICONS PER SHOP
 - /[shop]/manifest.webmanifest route (server, cached per shop): name, short_name (12 chars, from the pack or trimmed name), description, start_url, scope, id, display standalone, orientation portrait, theme_color = shop-10, background_color = shop-30 (light), icons 192, 512 and maskable 512 from brand/ (shop without a logo → icons generated from initials on the brand colour with next/og at build time or on request, cached).
 - [shop]/layout metadata links the manifest and apple-touch-icon 180; apple-mobile-web-app-title; status bar style default. No iOS startup images in A (background colour is enough).
 - Unknown, pending or suspended shop → 404 for the manifest.

3. OFFLINE PAGE
 - /~offline (static, precached): c-empty-9 pattern with the last shop's name (read from deviceStorage on the client), "You're offline", "Your basket is saved" + links to that shop's Menu and Orders. Light theme.

3b. SPLASH IN STANDALONE MODE
 - Once per session when opened from the home screen: shop logo (or initials) on the shop colour, at most 600 ms, then the page; skipped under reduced motion and when the page is already painted. Never delays LCP in a normal browser tab.

4. INSTALL CARD (wires the T10 card; features/install)
 - Shown after joining (T12 done screen) or after the first order (receipt), never on a first visit before either, never when already installed (display-mode standalone), dismiss remembered 30 days per shop.
 - Android / desktop Chrome: beforeinstallprompt → Install button. iPhone Safari: c-stepper-13 pattern steps "Tap Share", "Add to Home Screen", "Tap Add" with lucide icons. Other browsers: hidden.
 - Installed (appinstalled or standalone): toast once "Kanto Smash is on your home screen".

5. PUSH FOR ORDER STATUS
 - Notify me (T10 switch) asks permission only on tap, subscribes through the worker and calls subscribePush (mock stores it). Denied → "Notifications are off in your browser settings".
 - sw.ts push handler shows "Order #042 is ready" with the shop icon; click opens /<slug>/o/<token>. Dev only: the Demo owner panel gets "Send test notification".
 - iPhone: push only works when installed (iOS 16.4+); the switch says "Add to home screen first to get updates" in Safari.

6. TESTS
 - e2e on the production build: /kanto-smash/manifest.webmanifest is valid JSON with the right start_url, scope and icons that load (200, right size); the worker registers and controls the page after reload; offline (setOffline) → Menu still renders from cache, checkout shows the offline reason, an unknown page shows /~offline; a receipt opened before going offline shows its saved copy.
 - Unit: install card visibility rules (joined, first order, installed, dismissed, platform); short_name trimming.

7. DOCS
 - docs/stack-versions.md row for serwist and @serwist/turbopack. components.md "Used in". docs/decisions.md: T26 One Serwist service worker for the whole storefront; each shop has its own manifest (scope /<slug>/) so it installs as its own app. N36 The install card shows after joining or after the first order, with iPhone steps in Safari. Tick T13 in PROGRESS.md, one CHANGELOG line.

DONE WHEN
 - Kanto Smash and Tala Apparel install on Android Chrome and desktop Chrome with their own name, icon and colours, open in standalone at /<slug>, and show the menu and last receipt offline; iPhone steps show in Safari; DevTools Application → Manifest shows no errors; Lighthouse mobile on /kanto-smash still Performance ≥ 90 with the worker on.

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint, pnpm build and pnpm e2e green. Never weaken eslint or tsconfig, never skip a test. No workarounds: stop and show me any error.
 - Screenshots: install card (Android-sized and iPhone steps), installed app at 390, offline menu, /~offline, DevTools Manifest panel. gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test on my phone (step by step, including how to remove the installed app), what I must do by hand.

OUT OF SCOPE: background sync, offline ordering, periodic sync, real push sending (API task), app store builds (Capacitor is for the dashboard later).
<!-- prettier-ignore-end -->
