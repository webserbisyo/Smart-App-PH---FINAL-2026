# Phases 1 to 3: build plan (APPROVED, BUILT)

The detailed plan for launch phases 1 (Ground), 2 (Accounts) and 3 (Shop setup) from `launch-phases.md`. Written 2026-11-25 from `main` @ 0a3273b after research in the official docs. Status: **approved** (decision T116) and **built** on PR #48 (see Status below). `launch-phases.md` stays the map; this file is the build spec for these three phases. Where they differ, this file wins once approved.

## Status (2026-11-25, PR #48)

Built and tested against local Supabase in CI (141 database tests, 25 API unit tests, 25 API integration tests):

- **Phase 1:** Drizzle over `pg` with one transaction per request (`set local role`, shop and user settings), the pulled schema mirror with a drift check, guards (`@Public()` or `@Can()` on every route, shop from `tenant_members`, CSRF header and Origin), the Postgres error map, health with the database, rate limits, `JobsService.runLocked`, the per-area data switch, API integration tests in CI.
- **Phase 2:** reserved links, sign-up (lead, Supabase sign-up, 6-digit code, `registerShop` in one transaction), cookie login with refresh, forgot password, sign out everywhere, finish-your-shop for an owner who left after the code; the dashboard calls NestJS only (no `@supabase` outside `apps/api`).
- **Phase 3:** six Storage buckets, two-step uploads with the real size and type checked at confirm, hourly and nightly cleanup jobs, every Settings section, profile and notifications, Storage meter, files and delete, the Editor draft with version check, Publish, Discard and the preview link, Undo on Zustand and Zundo.

Left, and why:

- **Needs the founder (section 8):** Railway staging, DNS for `api-staging.` and `staging-app.`, the dev Supabase settings (Resend SMTP, code template and expiry, secret key, JWT signing keys, `sb-forwarded-for`, Data API off). The "Done when" checks on staging (iPhone Safari login, a food and a retail shop set up from a phone and a laptop) wait for these.
- **Later phases by design:** plan and Billing chat (7), exports, downloads, cleanups and the account delete request (4 to 6), member codes (6). Their screens stay on sample data.
- **The dev database** gets the two new migrations when this PR merges to `main` (CI applies them to dev only, D9).

## 0. Brief

**Goal.** An owner signs up, logs in and sets up a whole shop (facts, hours, ordering, delivery, payments, photos, look) on the **dev** database, through NestJS, from a phone and a laptop. The sample-data demo keeps working for previews and the video shoot.

**Done when.** All three phases' "Done when" lines (section 6) pass. CI is green on `main`. The dev database answers every Settings and Editor call. The Vercel demo links still show the 5 sample shops.

**Not in scope.** Menu, storefront reads, orders, members, billing and Super Admin (phases 4 to 7). The live database (phase 8). New screens: phases 1 to 3 wire screens that already exist.

## 1. Where we start (checked 2026-11-25)

- **Dev database:** live. CI applied all 11 waiting migrations on 2026-11-24 (run 45506418991). It now has 55 tables, row security on every one, and 12 migrations (checked read-only with the Supabase connector).
- **CI:** red on one job. 4 storefront smoke tests fail: "privacy notice: footer, checkout and join link to it" and "basket: delivery resolves valid Google Maps link", each on phone and desktop. They passed at ef78d31, before PRs #46 and #47.
- **API:** NestJS 12.1.2 (ESM), TypeScript 6.0.3, Zod 4.6.6.
  - Already there: `/health`, `/me` and a test route; a global `AuthGuard` that checks the Supabase token with `jose` against the JWKS; `@Public()` and `@Can()`; a Standard Schema validation pipe; one error filter.
  - Gaps: `@Can('x')` takes any string and is never checked against a role. No shop lookup. No database connection. The route test only looks at `AppController`.
- **Data layer:** `packages/data` has an API adapter file for every area (untested) next to the mock ones. `DATA_SOURCE` is `mock` or `api` for the whole app, and `api` still throws. `packages/data/src/auth.ts` still talks to Supabase from the browser (T34 says it must not).
- **Sample data:** mocks load lazily. The sign-up tour (`SampleDataProvider`) always uses the sample shops, even in a live build (T108). Preview builds (`VITE_APP_ENV=preview`) show the Preview pill and "Look around with sample data" (T100).

## 2. Research findings that change the plan

V = verified in current official docs or our own runs. A = assumed or community source; we test it before relying on it.

| #   | Finding                                                                                                                                                                                                                            | V/A                                                                                        | What we do                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Railway has no outbound IPv6, and Supabase's direct database host is IPv6-only. Railway must use the Supavisor pooler.                                                                                                             | A (Supabase docs say "use the pooler without IPv6"; the Railway part is community answers) | The API connects to the **transaction pooler** (port 6543). We test it on Railway staging in phase 2.                                                                                                                                                             |
| R2  | In transaction mode, every setting must be transaction-local, and named prepared statements are not supported. With `node-postgres`, never give a query a `name`.                                                                  | V (Supabase prepared-statements guide)                                                     | Every request runs in one transaction that starts with `set_config(..., true)` and `set local role app_api`. We never use Drizzle `.prepare('name')`.                                                                                                             |
| R3  | Session advisory locks don't survive transaction pooling: the next statement can land on another connection.                                                                                                                       | V (Postgres semantics plus R2)                                                             | Jobs use `pg_try_advisory_xact_lock` inside a transaction, never `pg_advisory_lock`. This changes D5's wording.                                                                                                                                                   |
| R4  | Connecting as `postgres` skips row security. Only `set local role app_api` turns it on.                                                                                                                                            | V (Drizzle RLS docs, Supabase)                                                             | One `db.tx()` helper is the only way to reach the database (ESLint blocks the raw pool elsewhere). A test fails if a query runs without the role. A dedicated login role with no rights of its own comes in phase 8 (Q11).                                        |
| R5  | NestJS order: middleware, guards, interceptors, pipes, handler, interceptors on the way out; filters only on errors. Shutdown hooks are off until `enableShutdownHooks()`.                                                         | V (NestJS request lifecycle, lifecycle events)                                             | Guards: login, then shop, then permission. Then an interceptor opens the request transaction. `main.ts` turns on shutdown hooks and closes the pool last.                                                                                                         |
| R6  | Request-scoped providers rebuild their whole chain on every request. Holding "the current transaction" is better done with AsyncLocalStorage, which `nestjs-cls` wraps, and it has an official Drizzle adapter.                    | V for the adapter docs, A for the cost claim                                               | Use `nestjs-cls` plus `@nestjs-cls/transactional` and its Drizzle adapter (Q6, new packages).                                                                                                                                                                     |
| R7  | Railway's default drain time is 0 seconds, so a deploy can kill requests in flight.                                                                                                                                                | A (community)                                                                              | Set `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30` and a `/health` check.                                                                                                                                                                                               |
| R8  | `vercel.app` is on the Public Suffix List, so every `*.vercel.app` project is its own site. Safari blocks cookies between different sites.                                                                                         | V (Vercel guide, WebKit tracking prevention)                                               | A login cookie only works when the dashboard and the API share our domain: `app.` plus `api.webserbisyo.com`, and for staging `staging-app.` plus `api-staging.webserbisyo.com` (Q3, Q4). The `vercel.app` demo links stay on sample data, so they need no login. |
| R9  | Supabase is retiring the legacy `anon` and `service_role` keys by the end of 2026. The new secret key (`sb_secret_...`) is for servers only. Token checks should use the asymmetric JWT signing keys (JWKS).                       | V (Supabase API keys and signing keys docs)                                                | NestJS uses `SUPABASE_SECRET_KEY`. Our guard already uses JWKS; the dev project must be switched to asymmetric signing keys (by hand, section 8).                                                                                                                 |
| R10 | Supabase Auth rate-limits by caller IP. When NestJS calls it, every owner shares Railway's IP. With a secret key and the `sb-forwarded-for` header (switched on through the Management API), Auth limits by the real visitor's IP. | V (Supabase Auth rate limits docs)                                                         | Send `sb-forwarded-for` from NestJS (after Express `trust proxy` gives the right IP) and switch the setting on (section 8).                                                                                                                                       |
| R11 | The built-in email sender allows 2 emails an hour. Custom SMTP starts at 30 an hour and can be raised. The code length is 6 to 10 digits; the template must use `{{ .Token }}`.                                                    | V (Supabase SMTP and rate limit docs)                                                      | Resend as custom SMTP on dev in phase 2. Raise the limit. Template shows the code only, with no link.                                                                                                                                                             |
| R12 | A signed upload URL lives 2 hours and **cannot carry a size limit**. Only the bucket's `file_size_limit` and `allowed_mime_types` limit an upload.                                                                                 | V (supabase-js reference)                                                                  | Our api.md promise "signed upload URL for exactly that size" can't be kept at upload time. We keep it at **confirm**: NestJS reads the real size and type, refuses and deletes a wrong file, then counts it. api.md gains `confirmUpload`.                        |
| R13 | Public buckets cache well on the CDN. Signed links (private buckets) miss the cache. Cache length comes from `cacheControl` at upload (default 1 hour).                                                                            | V (Supabase Smart CDN docs)                                                                | `menu`, `look`, `qr` and `profile` are public with a new file path on every change, so we cache them for 1 year. `proofs` and `plan-proofs` stay private with 5-minute links.                                                                                     |
| R14 | Buckets can be created in SQL (`insert into storage.buckets`).                                                                                                                                                                     | V for `id`, `name`, `public`; A for the limit columns' exact SQL types                     | One migration creates the 6 buckets (conflict 1); we check the column types on the local database first.                                                                                                                                                          |
| R15 | Supabase is turning "automatically expose new tables" off for all projects (enforced 2026-10-30). The whole Data API can be switched off.                                                                                          | V (Supabase changelog)                                                                     | Switch the Data API off on dev once the browser no longer calls Supabase (end of phase 2).                                                                                                                                                                        |
| R16 | Zundo: `partialize` picks what goes into history, `limit` caps it, `equality` skips no-change steps, `handleSet` can throttle (slider drags).                                                                                      | V (zundo README)                                                                           | The Editor store keeps only `content` in history, a limit of 100, deep equality and a throttle for drags.                                                                                                                                                         |
| R17 | NestJS 12 validates with any Standard Schema (Zod 4 included).                                                                                                                                                                     | V (NestJS 12 migration guide)                                                              | Keep our pipe; no `class-validator`.                                                                                                                                                                                                                              |
| R18 | Throttler behind a proxy: set Express `trust proxy` to the hop count, never `true`, or anyone can fake their IP.                                                                                                                   | V (NestJS rate limiting docs)                                                              | `app.set('trust proxy', 1)` for Railway (tested in phase 2), in-memory store (one instance).                                                                                                                                                                      |
| R19 | Passport is optional in NestJS. Supabase Auth does the sign-in and `jose` checks the token, so Passport would only add a wrapper.                                                                                                  | V (our code), our view                                                                     | No Passport. `AuthService` is our one provider that knows Supabase, so swapping the provider later is one module.                                                                                                                                                 |

## 3. How we use NestJS (the patterns every module follows)

- **One module per area,** mirroring `api.md`:
  - `DbModule` (global): pool, Drizzle, transaction helper.
  - `AuthModule`: `AuthService` plus the Supabase provider, guards, `/auth`.
  - `ShopModule`: `/owner/shop`, slugs, onboarding.
  - `SettingsModule`, `UploadsModule`, `EditorModule`, `JobsModule`, `HealthModule`.
  - Modules talk only through exported providers, never through each other's files (same rule as dashboard features).
- **Dependency injection:** controllers stay thin (read input, call one service method, return the core schema). Services hold the rules. Anything outside our code (Supabase Auth, Storage, Resend later) sits behind an injection token with an interface (`AUTH_PROVIDER`, `FILE_STORE`), so tests swap in fakes and a vendor change touches one file (`smartapp-oop`).
- **Scopes:** every provider stays a singleton. Request data (user, shop, transaction) lives in CLS, not in request-scoped providers (R6).
- **Decorators:**
  - `@Public()`.
  - `@Can(permission)`, which takes only a closed list: `PERMISSIONS` as `const` plus a Zod enum in core.
  - `@CurrentUser()` and `@CurrentShop()` param decorators that read CLS.
  - A route test that finds every controller through `DiscoveryService`, not a hand list.
- **Guards, in order:**
  - `AuthGuard`: the token, from the cookie or Bearer.
  - `ShopGuard`: `tenant_members` lookup in a short transaction as `app_api` with `app.user_id`. A missing shop answers `not_found` (rule 12).
  - `CanGuard`: the role allows the permission.
  - Then the `TransactionInterceptor` runs the handler inside one transaction with `app.user_id`, `app.tenant_id` and `set local role app_api`.
- **Errors:** one filter. Postgres codes map to our closed codes:
  - unique (23505) by constraint name, e.g. `tenants_slug_key` to `slug_taken`;
  - check (23514) to `invalid_input`;
  - foreign key (23503) to `not_found`;
  - serialization (40001) is retried once;
  - our SQL guard functions raise with the code in `hint`.
  - Unknown becomes `unknown` and is logged without customer data.
- **Config:** one Zod env schema (already there), extended with `DATABASE_URL`, `SUPABASE_SECRET_KEY`, `APP_ENV`, `COOKIE_*`, `TRUST_PROXY_HOPS`.
- **Lifecycle:** `enableShutdownHooks()`; stop jobs in `beforeApplicationShutdown`; end the pool in `onApplicationShutdown`.
- **Limits:** 100 kB JSON body; throttler on by default, stricter on `/auth/*` and `/signup/*`.
- **Health:** Terminus check that runs `select 1`.
- **Testing:**
  - Unit: Vitest with SWC.
  - Integration: supertest against the local Supabase that CI already starts in the `db` job, with Mailpit catching email codes.
  - A contract test runs the same cases against the mock and the API adapter for every method we wire.

## 4. Database cross-check (phases 2 and 3 tables against Zod, api.md and screens)

| #   | Mismatch                                                                                                                                                                                               | Fix (phase)                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| X1  | Shop link: `OwnerSettings.slug` is Zod 1 to 40 with no pattern; the database needs 3 to 40, lowercase words joined by `-`.                                                                             | One `ShopSlugSchema` in core with the same pattern; used by sign-up, Settings and the API (2).                                                                                 |
| X2  | Reserved links: core has `['demo', 'samples']`; the database has 27 words but **not `demo`**. T105 adds `stays`, `rsvp`, `docs`, `dev`, `staging`.                                                     | Migration adds `demo`, `stays`, `rsvp`, `docs`, `dev`, `staging`, `api-staging`, `staging-app`. The database list is the only source; core keeps only what the mocks need (2). |
| X3  | `ShopContact` text has no maximum in Zod; the database caps address 200, Facebook 200, Google review 300, Messenger 100, phone 20. A long value would come back as `unknown` instead of a field error. | Zod maxima mirror the CHECKs (3).                                                                                                                                              |
| X4  | `PaymentAccount.id` is any string up to 40 (mock ids like `gcash-1`); the database uses uuid.                                                                                                          | `IdSchema` (uuid); mocks get uuids (3).                                                                                                                                        |
| X5  | Delivery rows: Zod uses km with decimals; the database uses whole metres.                                                                                                                              | The API turns km into metres and back (2.5 km = 2500 m); a test covers rounding (3).                                                                                           |
| X6  | `NotificationPrefs.email` is required in Zod; `tenant_members.notify_email` can be empty.                                                                                                              | The API answers the account email when it's empty (3).                                                                                                                         |
| X7  | api.md has `createUploadUrl` but no confirm step, while database.md counts a file "only after NestJS confirms".                                                                                        | Add `confirmUpload` (POST `/owner/uploads/:id/confirm`) to api.md, core, mock and API (3).                                                                                     |
| X8  | No migration creates the 6 buckets (conflict 1).                                                                                                                                                       | Migration with buckets, `public` flags, size limits and image types (3).                                                                                                       |
| X9  | Opening hours must close after they open, so 6 PM to 2 AM needs two ranges (6 PM to midnight, then midnight to 2 AM next day).                                                                         | Keep for launch; Settings' hint already splits it (3, check the words).                                                                                                        |
| X10 | "Start with samples" is listed in phase 3, but it copies the catalog, which arrives in phase 4.                                                                                                        | Move it to phase 4 (launch-phases.md).                                                                                                                                         |
| X11 | Creating a shop must also make its `shop_settings` and `storefront_content` rows and link the sign-up lead, all in one transaction, with the price taken from `platform_settings`.                     | One service method in one transaction, plus a test (2).                                                                                                                        |
| X12 | Owner avatar photos sit in `media_files`, which needs a shop. A Super Admin with no shop can't have a photo.                                                                                           | Fine for launch (the Super Admin uses a face); noted for phase 7.                                                                                                              |

No table is missing for phases 1 to 3. The new migrations are X2 (reserved links), X8 (buckets) and, if the founder says yes to Q11 later, a login role in phase 8.

## 5. Sample data for previews and the video shoot

**Founder's idea:** a separate branch with the sample data. **Recommendation:** no separate branch. A branch that never merges drifts: every fix has to be made twice, and within weeks the demo no longer looks like the real app. We already have the switch we need: the **build settings** decide which data a build uses.

| Build   | Where                                                                                    | Data                                                          | Who sees it                         |
| ------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------- |
| Demo    | `smartapp-demo-storefront.vercel.app`, `smartapp-demo-dashboard.vercel.app` (live today) | Sample shops, forever (`DATA_SOURCE=mock`, `APP_ENV=preview`) | You, prospects, the **video shoot** |
| Staging | `staging-app.webserbisyo.com` + `api-staging.webserbisyo.com`                            | Dev database through NestJS (`DATA_SOURCE=api`)               | You and Claude, testing real data   |
| Live    | `app.webserbisyo.com`, `<slug>.webserbisyo.com`                                          | Live database (phase 8)                                       | Paying shops                        |

- All three build from `main`. The demo keeps working as phases 2 and 3 switch areas to the API, because the demo build never uses the API.
- **Per-area switch.** While phases are half done, staging needs "auth, shop and settings from the API, everything else still sample". `createAdapters` gets a list of wired areas. A **live** build refuses to start if any area is still on samples, so a live shop can never see fake data.
- **Kept in live on purpose:** the sign-up tour's sample shops (T108). They're labelled samples and never mix with real data.
- **Freezing a video look:** if a later change might alter a scene mid-shoot, we tag the commit (`video-2026-12`) and point the demo projects at that tag in Vercel until the shoot is done. That's a pointer, not a branch to maintain.
- **Real-backend demo later (optional):** `seed:demo` can load the 5 sample shops into the dev database, for a video of real data.

## 6. Tasks

Each task: one commit (or a short PR when the founder asks). After each one: `pnpm check`, build, the changed pages opened at 390 and 1280 px, one line in `PROGRESS.md` and `CHANGELOG.md`.

### Phase 1. Ground (target: 2 to 3 days)

1. **CI green.** Fix the 4 failing storefront smoke tests (most likely changed links or markup from T114 and T115). Make the dev-migration job **fail** (not skip) on `main` when a secret is missing (conflict 8).
2. **Packages.** Exact versions, each at least 7 days old:
   - Approved: `drizzle-orm`, `pg`, `drizzle-kit` (dev), `@types/pg` (dev), `@nestjs/throttler`, `@nestjs/schedule`.
   - Q6: `nestjs-cls`, `@nestjs-cls/transactional`, `@nestjs-cls/transactional-adapter-drizzle-orm`.
3. **DbModule.**
   - Pool to the pooler URL (SSL on, a small max), plus Drizzle.
   - The schema is pulled from the database with `drizzle-kit pull` into `apps/api/src/db/schema.ts` and committed. SQL migrations stay the source of truth (Q9), and CI fails if a pull differs.
   - `db.tx()` is the only way in.
4. **Guards and permissions.**
   - `PERMISSIONS` in core.
   - `ShopGuard` and `CanGuard`, `@CurrentUser()` and `@CurrentShop()`.
   - The route test discovers every controller.
5. **TransactionInterceptor** with `set_config` and `set local role app_api`; a test proves a query outside it fails.
6. **Errors:** Postgres-to-code map, with tests for unique, check, foreign key and raised codes.
7. **App base:**
   - `main.ts`: shutdown hooks, 100 kB limit, `trust proxy`, CORS list from env with credentials, helmet.
   - Health with the database check.
   - Throttler default.
8. **JobsModule** with `runLocked(name, fn)` (transaction advisory lock, R3) and one harmless heartbeat job with a test.
9. **Tests:** API integration tests run in CI's `db` job against local Supabase. The cross-shop test: shop A's owner reads shop B's settings and gets Not found.
10. **Per-area data switch** in `packages/data` (section 5), with a test that a live build refuses mock areas.
11. **Docs:**
    - `A-mvp.md` section 3 aligned to `PROGRESS.md` (conflict 7).
    - D5 wording fixed (R3).
    - `foundation.md` stack register: new packages.

**Done when:**

- CI is all green on `main`.
- `/health` reports the database.
- The route test covers every controller.
- The cross-shop and "no role, no data" tests pass.
- The demo links still show sample shops.

### Phase 2. Accounts (target: 4 to 6 days)

1. **Reserved links migration** (X2) and `ShopSlugSchema` (X1).
2. **AuthModule.**
   - `AuthService` interface; Supabase provider using `SUPABASE_SECRET_KEY` with no browser session (`persistSession: false`); `sb-forwarded-for` (R10).
   - Routes from api.md: sign-in, sign-out, session, password code and reset, sign-out everywhere, customer codes (plumbing for phase 6).
   - One error for every failed login (rule 12).
3. **Session (Q3).**
   - httpOnly, Secure, SameSite=Lax cookies set by `api.` (host-only, no Domain, so shop pages never receive them): a short access cookie plus a refresh cookie that rotates.
   - Writes need our own header plus an allowed Origin (CSRF guard).
   - Owner and member sessions use different cookie names.
4. **Sign-up.**
   - Step 1 saves the lead; Supabase sign-up; the 6-digit code; then `registerShop`.
   - `registerShop` runs one transaction (X11): shop, member, settings and content rows, lead link, price from `platform_settings`.
   - `getMyShop`, `isSlugFree`, `getOnboarding`.
5. **Supabase leaves the browser.**
   - API adapters for auth, shop and onboarding; dashboard login, sign-up and forgot password use them.
   - Delete `packages/data/src/auth.ts` and its ESLint exception.
   - Data API off on dev (section 8).
6. **Throttling:** `/auth/*` 5 a minute per IP, `/signup/*` 10 a minute per IP (Supabase also enforces 60 s per email).
7. **Railway staging:**
   - API deploy from `main`, Singapore, pooler URL, `/health` check, draining 30 s, `api-staging.webserbisyo.com`.
   - A staging dashboard build at `staging-app.webserbisyo.com` with `DATA_SOURCE=api`, using the area list from section 5.
8. **Tests:**
   - Sign-up, login, wrong password, reset and logout against local Supabase (Mailpit gives the code).
   - Contract tests for every auth and shop method.
   - Safari check on a real iPhone: login survives a reload.

**Done when:**

- On staging, a new owner signs up with a real emailed code, logs in, resets the password and logs out, on an iPhone (Safari) and a laptop.
- No `@supabase` import outside `apps/api`.
- Another shop's id answers Not found.

### Phase 3. Shop setup (target: 5 to 7 days)

1. **Buckets migration** (X8, R14), with cache rules from R13.
2. **Uploads:**
   - `createUploadUrl` makes an unconfirmed `media_files` row and a path `<shop>/<kind>/<uuid>.<ext>`.
   - `confirmUpload` (X7) checks the real size and type, counts the file, and refuses `storage_full`.
   - An hourly job removes files not confirmed within an hour (via the Storage API, R3 lock).
   - Phone side: the existing shrink step, with the HEIC message already there.
3. **Settings routes** from api.md:
   - Shop facts, hours and closures, ordering, delivery (X5), payments (X4) with the QR upload.
   - Profile and avatar, notifications (X6).
   - Storage summary, files list, delete and download, cleanup preview and run.
   - Plan read only.
   - Exports and plan payments wait for phases 6 and 7.
4. **Zod limits** mirror the database (X3), each with a field error test.
5. **Editor:**
   - Draft read, autosave with `baseVersion` (`draft_conflict` shows "This draft changed on another device"), Publish in one transaction, Discard, preview token.
   - Zustand and Zundo store replacing the hand-written undo (R16), with the store in `apps/dashboard/src/features/editor/`.
6. **Profile menu:** re-check with a real account (T112).
7. **Tests:**
   - Contract tests for every Settings and Editor method.
   - Upload too big, wrong type and storage full.
   - Two tabs editing (conflict).
   - Food and retail shops at 390 and 1280 px, light and dark.

**Done when:**

- A food shop and a retail shop are set up end to end on staging, from a phone and a laptop.
- The Settings and Editor areas are "Done" in `PROGRESS.md`.
- Storage shows real file sizes.
- The demo links still show sample shops.

## 7. Decisions for the founder (recommendation first)

| #   | Question                    | Recommendation                                                                    | Why                                                                                                                        |
| --- | --------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Q1  | How live migrations run     | A GitHub `production` environment that waits for your Approve click               | No laptop step; live keys stay locked (card already posted)                                                                |
| Q2  | Branch protection on `main` | None for now; live is protected by Q1                                             | Protection would block the push-to-main workflow (T104)                                                                    |
| Q3  | Where the login lives       | httpOnly cookie set by `api.`                                                     | No token readable by scripts; works in Safari on our domain (R8)                                                           |
| Q4  | Staging addresses           | `staging-app.` and `api-staging.webserbisyo.com` (DNS yes needed)                 | Follows from Q3; `vercel.app` and `railway.app` break Safari logins                                                        |
| Q5  | Sample data                 | One branch, three builds, per-area switch (section 5)                             | A separate branch drifts and doubles every fix                                                                             |
| Q6  | Request transaction helper  | `nestjs-cls` plus its transactional and Drizzle adapter (3 new packages)          | Maintained and documented; less of our own plumbing. Alternative: about 60 lines of our own AsyncLocalStorage, no packages |
| Q7  | Google sign-in              | Out of launch, to MVP B                                                           | Email code and password cover launch                                                                                       |
| Q8  | Storage buckets             | Created by a migration (phase 3)                                                  | Rule 8: no dashboard changes                                                                                               |
| Q9  | Drizzle schema              | Pulled from the database and committed; SQL stays the source                      | One source of truth, no drift                                                                                              |
| Q10 | Overnight hours             | Two ranges for launch (X9)                                                        | No schema change                                                                                                           |
| Q11 | Database login role         | `postgres` plus `set local role` now; a dedicated no-rights login role in phase 8 | A new role needs a password set by hand; the R4 tests cover the gap until then                                             |
| Q12 | "Start with samples"        | Move to phase 4 (X10)                                                             | It copies the catalog                                                                                                      |

## 8. What the founder does by hand

The full click guide, with the Railway env list, is in `docs/launch.md` (Parts A to E since 2026-11-26). The founder does it after all the code is in.

**Phase 1:** nothing. The dev secrets are in and work.

**Phase 2** (I'll send click steps when we get there):

1. Resend account; add `mail.webserbisyo.com` and say yes to its DNS records.
2. Dev Supabase › Authentication › Emails › SMTP: Resend. Rate Limits: emails per hour 100. Email OTP: 6 digits, expires in 600 s. Template: the code, no link.
3. Dev Supabase › Settings › JWT Keys: switch to the new asymmetric keys if it still shows the legacy secret. API Keys: create a **secret key** for staging (paste it only into Railway).
4. Switch on `sb-forwarded-for` (one Management API call; I'll give the exact command).
5. Railway account (Hobby, about $5 a month): new project from the GitHub repo, Singapore. I'll give the env list.
6. DNS yes for `api-staging.` and `staging-app.webserbisyo.com`.
7. At the end of phase 2: Supabase dev › Data API › off.

**Phase 3:** nothing new.

## 9. Settings for Claude's cloud sessions

Nothing to add now. Claude tests against a local Supabase in the session (Docker) and in CI, so it never needs the dev database password. Railway and Vercel deploy from GitHub by themselves. If a later step needs a new outside host, Claude will say which one and where to add it (Project settings › Cloud environment › Network access).

## 10. Risks

- **The pooler plus `set local` in practice (R1, R2).** Tested first on staging in phase 2 with the cross-shop test. If it fails, the fallback is the session pooler (5432).
- **Safari logins (R8).** If cookie logins misbehave on iOS, the fallback is a token in memory plus a refresh cookie, same domains.
- **Email deliverability.** A new Resend domain can land in spam. Fix: check SPF, DKIM and DMARC records, and send a test to Gmail and Yahoo.
- **Phase timing:** 11 to 16 working days in total. The founder's December target leaves little room, so phase 7 (billing) may need to start in parallel after phase 2.

## Sources

- NestJS:
  - [Request lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
  - [Lifecycle events and shutdown](https://docs.nestjs.com/fundamentals/lifecycle-events)
  - [Rate limiting](https://docs.nestjs.com/security/rate-limiting)
  - [Migration guide (v12)](https://docs.nestjs.com/migration-guide)
- nestjs-cls: [Drizzle adapter](https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional/drizzle-orm-adapter)
- Drizzle: [Row-Level Security](https://orm.drizzle.team/docs/rls)
- Supabase:
  - [Prepared statements and the pooler](https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL)
  - [IPv4 and IPv6](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP)
  - [API keys](https://supabase.com/docs/guides/getting-started/api-keys)
  - [JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys)
  - [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
  - [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
  - [Passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless)
  - [createSignedUploadUrl](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
  - [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn)
  - [Creating buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets)
  - [Tables not exposed by default](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
  - [Personal access tokens](https://supabase.com/docs/guides/platform/personal-access-tokens)
  - [Managing environments](https://supabase.com/docs/guides/deployment/managing-environments)
- GitHub: [Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- Vercel: [Cookies on vercel.app](https://vercel.com/guides/can-i-set-a-cookie-from-my-vercel-project-subdomain-to-vercel-app)
- WebKit: [Tracking prevention](https://webkit.org/tracking-prevention/)
- Railway (community answers, unverified): [Supabase from Railway](https://station.railway.com/questions/supabase-error-connect-enetunreach-9efd356d), [draining seconds](https://station.railway.com/questions/railway-deployment-draining-seconds-and-b76587af)
- Zundo: [README](https://github.com/charkour/zundo)
