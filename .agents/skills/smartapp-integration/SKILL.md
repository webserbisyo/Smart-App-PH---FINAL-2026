---
name: smartapp-integration
description: Systems integration and architecture rules for Smart App PH (the Systems Integration and Architecture and Integrative Programming courses applied to our three tiers, shared packages and outside services). Use it when you switch an area from mock to API, change a shape shared by core, data and api, add or change a call to Supabase Auth or Storage, Meta Conversions API or Resend, add a job, outbox or retry, or move code between packages.
---

# Smart App PH integration rules (Systems Integration and Architecture, Integrative Programming)

We join five things: two browser apps, one API, one database and a few outside services (Supabase Auth and Storage, Meta, Resend). Each join is a place where shapes drift, calls fail halfway and retries double things. This skill turns the integration and integrative programming courses (architecture styles, contracts, middleware, sync and async messaging, error handling, one language across tiers) into rules for those joins.

AGENTS.md wins over this skill (rules 3, 4 and 13 especially).

## 1. The architecture in one picture

```
storefront (Next.js) ┐                        ┌─ Postgres (Supabase, RLS)
                     ├─HTTPS─► NestJS API ─pg─┤
dashboard (Vite)     ┘    (the one entry)     ├─ Supabase Auth, Storage (supabase-js, server only)
                                              └─ jobs ─► Meta Conversions API, Resend
```

- Strict three tiers: browser → NestJS → Postgres for everything, login and public storefront reads included (T34, rule 13). The API is the only integration point; apps never talk to Supabase or to each other (rule 4).
- Business rules live once: shared rules in `packages/core`, trusted money, count and stamp changes in SQL functions. NestJS validates, authorises and calls.
- No Supabase Realtime, edge functions, pg_net, pg_cron or rule-carrying triggers; live updates are polling or SSE from NestJS. Keeps a later move to another Postgres a connection-string change plus Auth and Storage adapters.

## 2. One contract, three tiers (integrative programming)

| Layer           | Owns                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `packages/core` | Zod schemas (camelCase), `as const` lists, error codes, words, rules. No React, no data fetching |
| `docs/api.md`   | every method: name, route, input, output, error codes                                            |
| `packages/data` | the adapters (mock and API) and the Query hooks; the only thing screens call                     |
| `apps/api`      | routes that parse input with the same schema and return the same output                          |
| Postgres        | snake_case tables; CHECKs mirror the core lists                                                  |

- Change order: `api.md` row → core schema → mock adapter and API adapter together → screen. Never let the two adapters disagree (rule 3).
- Map snake_case rows to camelCase shapes in one data provider per area, and parse with the schema there.
- JSON carries money as integer centavos and times as ISO strings in UTC; never `Date` objects or floats across the wire.
- The API adapter parses every response and every `ApiError` with Zod; a shape mismatch is a bug report, not a silent `undefined`.
- `@smartapp/core` builds to `dist` for Nest; Turbo builds dependencies first. In `packages/data` use `pnpm run typecheck`, not `tsc -b` (it emits into `src`).

## 3. Switching an area from mock to API

1. The tables and their pgTAP tests are in (done for all areas, T96).
2. Write the Nest module for the area (`smartapp-oop`), its routes exactly as in `api.md`, each with `@Can()` or `@Public()`.
3. Run the **same contract tests** against the mock adapter and the API adapter; both must pass.
4. Switch the area's adapter to `api` in `packages/data`; the screen does not change.
5. Run the e2e for the area's flows on the dev database; mark the area **Done** in `PROGRESS.md`.
6. The seed (`seed:demo`) loads the demo shops through the API, so it tests the API too.

Area order: login first, then shops and settings, catalog, orders and payments, members and stamps, reports (A-mvp section 3).

## 4. Calls that can fail halfway: sync vs async

- **Synchronous** (the customer waits): only what the answer needs: validate, write in one transaction, return. Target well under a second.
- **Asynchronous** (nobody waits): emails, Meta events, file clean-up. Use the **transactional outbox**: insert the message row (`notification_outbox`, `track_events`) in the same transaction as the change, and a NestJS job sends it later. The order is never lost because an email failed, and an email is never sent for an order that rolled back.
- Never call an outside service inside a database transaction.
- Retries: exponential backoff with jitter (for example 1 min, 2, 4, 8 … with a random spread), a maximum number of attempts, then `status = failed` with `last_error` for the founder to see in Super Admin. Every send is idempotent (a unique `event_id` or message id), so a retry after a timeout is safe.
- Timeouts on every outside call (a few seconds), so one slow service can't hold API workers.

## 5. Outside services

| Service              | How we call it                          | Rules                                                                                                                                                                                             |
| -------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase Auth        | `supabase-js` in `apps/api` only        | sign-up, sign-in, email codes behind NestJS routes; JWT checked with `jose`; secret key server only                                                                                               |
| Supabase Storage     | signed upload and read URLs from NestJS | the browser uploads straight to Storage with a signed URL; NestJS confirms and records `media_files`                                                                                              |
| Meta Conversions API | job from `track_events` (T90)           | the browser pixel and the server send the **same `event_id` and event name** so Meta removes the double; only hashed user data; `META_TEST_EVENT_CODE` while testing; Graph version pinned in env |
| Resend               | job from `notification_outbox`          | from `codes@mail.webserbisyo.com`; templates in our words; one send per outbox row                                                                                                                |

- Wrap each service in one provider (an adapter) so tests replace it and a provider change touches one file.
- Treat every answer as untrusted: Zod-parse it, never show its text to a person (`smartapp-security` API10).

## 6. Versioning and change

- The API and both apps deploy from the same commit; a breaking contract change ships in one PR with both sides.
- The installed storefront may run an older cached build: add fields freely, but don't rename or remove a field a live build reads until the cache has turned over; a required new input gets a default first.
- Migrations add before they remove (add column → backfill → switch code → drop later), never edit an applied one (rule 8).

## Before you say done

- [ ] `api.md`, the core schema, both adapters and the Nest route say the same thing; contract tests pass for both adapters
- [ ] Nothing in a browser app imports `@supabase/*` or calls a third party with a secret
- [ ] Outside calls go through the outbox or have a timeout; retries are idempotent and capped
- [ ] Meta events share `event_id` between pixel and server
- [ ] An older installed storefront still works with the new API

## Sources (opened 2026-11-20 unless marked)

- Meta, Handling duplicate Pixel and Conversions API events (`event_id` + event name): https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events/
- Supabase, Connecting to Postgres: https://supabase.com/docs/guides/database/connecting-to-postgres
- OWASP Multi-Tenant Security Cheat Sheet (tenant-aware async work): https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html (GitHub source)
- Transactional outbox (microservices.io) and backoff with jitter (AWS Builders' Library): course knowledge; both sites blocked from the cloud session
- Repo: `docs/blueprints/database.md` sections 1 and 6, `docs/api.md`, `docs/blueprints/foundation.md` sections 4 and 8 (read 2026-11-20)
