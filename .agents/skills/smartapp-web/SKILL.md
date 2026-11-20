---
name: smartapp-web
description: Web systems and technologies rules for Smart App PH (the Web Systems and Technologies course applied to Next.js, Vite + React, TanStack Query and our NestJS REST API). Use it when you add or change an API route or adapter method, pick an HTTP method or status code, decide what renders on the server or in the browser, set caching or data refresh, touch the service worker or install flow, add share or SEO tags, or work on page speed.
---

# Smart App PH web rules (Web Systems and Technologies)

Our customers open a shop link from Facebook on prepaid data and a mid-range phone. Every byte, every round trip and every wrong cache shows up as a lost order. This skill turns the web course (HTTP, REST, client and server rendering, caching, PWAs, performance) into rules for our three apps.

AGENTS.md, `docs/api.md` and `docs/ux.md` win over this skill.

| What                          | Where                                                                    |
| ----------------------------- | ------------------------------------------------------------------------ |
| Every method screens can call | `docs/api.md` (one row per adapter method)                               |
| Shapes in and out             | Zod schemas in `packages/core/src/schemas/`                              |
| Error codes and their words   | `packages/core/src/errors.ts`, `errorWords(code)`                        |
| Query keys and hooks          | `packages/data/src/hooks/`, the one `qk` file per area                   |
| Storefront speed budget       | 300 KB gzipped JS per page (T31), Lighthouse mobile 90 (A-mvp section 5) |

## 1. HTTP: methods and status codes

| Method   | Means                   | Safe? | Idempotent?    | Our use                                                                      |
| -------- | ----------------------- | ----- | -------------- | ---------------------------------------------------------------------------- |
| `GET`    | read                    | yes   | yes            | lists, a shop, an order by token. Never changes data                         |
| `POST`   | create or run an action | no    | **no**         | place order, add stamp, send proof. Carries a `clientKey`                    |
| `PUT`    | replace a whole thing   | no    | yes            | each settings group saved whole (`PUT /owner/settings/payments`), sort order |
| `PATCH`  | change some fields      | no    | not by default | small field changes, when `api.md` says so                                   |
| `DELETE` | remove                  | no    | yes            | delete an unused file; archiving is a status change, not a delete            |

- A `GET` never writes, not even a "seen" flag; `seen_at` is a `POST`/`PATCH` the screen sends.
- A retried `POST` must not do the thing twice: send a `clientKey` (uuid made on the phone before the first try) and the database answers the first result for a repeat (`database.md` section 5). This is the same idea as the IETF Idempotency-Key header.
- Status codes: `200` read or changed, `201` created, `204` nothing to return, `400` bad input (`invalid_input` with `fieldErrors`), `401` not signed in, `403` signed in but not allowed, **`404` for another shop's anything** (rule 12, never 403), `409` conflict (`invalid_transition`, `duplicate_reference`), `429` too many (`rate_limited`, with `Retry-After`), `500` only for the unexpected (`unknown`).
- Every failure body is `ApiError { status, code, message, fieldErrors? }` from the one global Nest filter. Screens word errors from `code`, never from `message` (rule 7).

## 2. REST shape

- Owner routes under `/owner/...` take the shop from `tenant_members`; public storefront routes under `/s/:slug/...`; Super Admin under `/admin/...`. The URL never chooses the shop for an owner (rule 12).
- Nouns in paths, verbs only for actions that aren't a field change (`POST /owner/orders/:id/recall`).
- Lists are paged by cursor (`smartapp-algorithms`), return what the screen shows, and never the whole table.
- Money in integer centavos, times as ISO strings in UTC; formatting happens in core (`formatPeso`, `formatManila`).
- Change `docs/api.md` first, then the mock adapter and the API adapter together (rule 3).

## 3. Rendering: server first on the storefront

- Next.js App Router: components are **Server Components by default**. Add `'use client'` only for state, event handlers, effects or browser APIs (`localStorage`, `navigator.geolocation`), and push it as far down the tree as possible.
- Server-render the shop frame and first paint (R50). Anything that reads `useSearchParams` sits in its own small `Suspense` with a server fallback, or it pulls the whole frame into the browser.
- Load heavy or rare parts after first paint or on touch (`next/dynamic`, `React.lazy`) behind a light stand-in (R49). Keep mock-only text in its own small export.
- The dashboard is a Vite single-page app: code-split by route (TanStack Router lazy routes); the shell loads first.

## 4. Data on the client: TanStack Query

- Every screen reads through a `useX` hook from `@smartapp/data`; never `fetch` in a component.
- Defaults refetch stale data on mount, focus and reconnect, and retry failed queries 3 times. Set `staleTime` per kind of data: near-static (shop look, plan) minutes; live (order board) short, with `refetchInterval` polling while visible; never `staleTime: 'static'` for anything an owner can change.
- After a write, invalidate the exact keys from `qk` (or set the cache from the response); never reload the page.
- Use optimistic updates only where Undo exists (stamp, order step), and roll back on error.
- Live updates are polling or SSE from NestJS; no Supabase Realtime (rule 13).

## 5. Caching and offline (PWA)

- The storefront is one installable Next.js app with Serwist (T13): app shell precached, shop pages stale-while-revalidate, the installed app opens the saved copy at once and refreshes in the background (T6, R47).
- Stock, prices, open/closed and the quote are always fetched fresh before Place order; checkout never trusts a cached price.
- Never cache an owner or member response in a shared cache; private data gets `Cache-Control: private, no-store` from NestJS. Public shop reads may be cached by Next with revalidation.
- Offline: the basket and checkout details stay on the phone; Place order waits for the connection and re-quotes (N2). Show "Last updated" on anything served from cache (S30).
- Web push is for order status only, asked on the tap (N36).

## 6. Performance budget (Core Web Vitals)

| Metric                   | Good (75th percentile of page loads) | Our target                                    |
| ------------------------ | ------------------------------------ | --------------------------------------------- |
| LCP (main content shown) | 2.5 s or less                        | shop home and menu on a mid-range phone       |
| INP (tap to response)    | 200 ms or less                       | every button, especially Add and Place order  |
| CLS (layout jumping)     | 0.1 or less                          | images and banners always reserve their space |

- 300 KB gzipped JS per storefront page (`pnpm --filter @smartapp/tooling budget`), Lighthouse mobile performance 90+ on home and menu.
- Images: WebP from `ShopImage`/`imageUrl()`, width and height set, `loading="lazy"` below the fold, the first banner eager. Photos are shrunk on the phone before upload (T65).
- Fonts self-hosted (Fontsource), one pair per shop, `font-display: swap`.

## 7. Share and search

- Each shop page sets its title, description and Open Graph image (Next `generateMetadata`), because shop links are shared on Facebook and Messenger.
- One canonical URL per shop page (`shop.webserbisyo.com/<slug>`); system pages and receipts are `noindex`.

## 8. Browser security basics

- HTTPS only; `helmet` on the API; CORS allow-list from env, never `*` with credentials.
- No secrets in client bundles: only `NEXT_PUBLIC_*` / `VITE_*` values that are safe to publish; each app checks its env with Zod at start (rule 9).
- See `smartapp-security` for the full list.

## Before you say done

- [ ] Method, status code and error code match section 1; a retried `POST` is safe
- [ ] `docs/api.md`, the mock adapter and the API adapter changed together
- [ ] Storefront parts are server-rendered unless they need the browser; heavy parts load after first paint
- [ ] `staleTime` and invalidation are set on purpose; nothing private is cached shared
- [ ] JS budget passes; images reserve their space; no new layout shift

## Sources (opened 2026-11-20 unless marked)

- MDN, Idempotent: https://developer.mozilla.org/en-US/docs/Glossary/Idempotent (read from the mdn/content GitHub source)
- IETF draft, The Idempotency-Key HTTP Header Field: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ (read from its GitHub source)
- Next.js, Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- TanStack Query, Important Defaults: https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults (read from its GitHub source)
- Google, web-vitals library (thresholds LCP 2.5 s, INP 200 ms, CLS 0.1): https://github.com/GoogleChrome/web-vitals
- HTTP semantics (RFC 9110) status codes: course knowledge; rfc-editor.org was blocked from the cloud session
