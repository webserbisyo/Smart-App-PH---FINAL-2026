---
name: smartapp-security
description: Security rules for Smart App PH (the Network Security and information assurance courses applied to our NestJS API, Supabase Auth and Storage, and many shops in one database). Use it when you add or change an API route, guard, login or code flow, upload or download, signed link, rate limit, log line, env secret, CORS or header setting, anything that reads another shop's or a customer's data, or anything the Super Admin or help mode can do.
---

# Smart App PH security rules (Network Security)

Many small shops share one API and one database. The worst bug we can ship is one shop seeing another shop's orders or customers; the second worst is a stranger placing fake orders until a shop gives up. This skill maps the OWASP API Security Top 10 (2023) and the OWASP multi-tenant guidance onto our stack.

AGENTS.md wins over this skill (rules 9, 12 and 13 especially). `smartapp-data` section 8 covers the database side.

## 1. One shop can never reach another (API1 Broken Object Level Authorization)

- The shop comes **only** from `tenant_members` for the signed-in owner, or from the slug or order-token lookup for the storefront. A shop id in the URL, body or a header is a selector to check, never proof (rule 12).
- Every request runs in one transaction with `set local role app_api` and `set_config('app.tenant_id', $tenant, true)`; RLS is the second wall. The request role is never a superuser or `BYPASSRLS` role; the Supabase secret key is used only for Auth admin and Storage links.
- Being in the right shop is not enough: also check the caller may act on **this** object (a member reads only their own orders; an owner can't approve their own plan payment).
- Another shop's thing answers **404 Not found**, never 403 (rule 12). Ids are uuids, but we never rely on them being hard to guess.
- Every tenant table has a pgTAP test proving another shop reads nothing; every new route has an API test with a second shop's token.
- Cache keys and Storage paths include the tenant (`<tenant_id>/<kind>/<uuid>.<ext>`); check the prefix exactly (`tenant/`, with the slash).

## 2. Login and codes (API2 Broken Authentication)

- Login goes through NestJS; Supabase Auth is the engine behind it (T34). The API verifies Supabase JWTs with `jose` against the project JWKS and checks `iss`, `aud` and `exp`.
- One message for every failed login, never which part was wrong (`invalid_login`, rule 12).
- 6-digit email codes: 10-minute expiry (`code_expired`), resend after 60 s, at most 5 codes an hour (`rate_limited`); a wrong code clears the boxes (N35). Paste and autofill allowed (`smartapp-hci`).
- Before live: leaked-password protection on, custom SMTP, Data API off, "automatically expose new tables" off (database.md section 11).

## 3. Only the right fields (API3 Broken Object Property Level Authorization)

- Input: parse with the shared Zod schema, unknown keys stripped. Never spread a request body into an update (`{...body}`); name each column written.
- Output: return the screen's schema, not the row. Private fields (`owner_note`, a stamp entry's `private_note`, other customers' contacts, tokens) never reach a customer response.
- Money, counts, stamps and statuses are never written from the browser; SQL functions compute them (A-mvp section 4).

## 4. Limits (API4 Unrestricted Resource Consumption, API6 Sensitive Business Flows)

- Public routes get rate limits before they go live (`@nestjs/throttler`, approved in T104; version chosen at install). Answer `429` with `Retry-After` and `rate_limited`.
- Our business limits (A-mvp section 4): at most 3 unpaid orders per phone per 30 minutes, 30 orders per shop per minute, at most 3 proofs per order, manual stamps at most 3 per member per Manila day. Include the shop in the limit key, and keep a global limit too.
- Body limit 100 kB; uploads only through a signed upload URL for the exact size; lists always paged.
- Count limits with atomic updates in the database when two API copies run.

## 5. Who may call what (API5 Broken Function Level Authorization)

- Every route has `@Public()` or `@Can()`; a test fails if one has neither (foundation section 8).
- Guards in order: Auth (who) → Tenant (which shop) → Permission (may do this). Super Admin routes need the platform admin flag (`app_metadata.platform_admin`) and use the `app_admin` role.
- Help mode (Open as owner) lasts 60 minutes, and every action in it is written to `audit_log` (T91, D8).

## 6. Uploads and files

- Private buckets (`proofs`, `plan-proofs`) are read only through 5-minute signed links made after checking the order belongs to the caller's shop.
- Allow-list the kinds and types we expect (WebP or JPEG images, size from the signed URL); don't trust the file name or `Content-Type`; check the file signature when confirming; never serve uploads as HTML.
- Paths are made by the API (`<tenant_id>/<kind>/<uuid>.<ext>`); a user string never becomes part of a path.
- Proof photos are deleted after 30 days (the payment row stays); unconfirmed uploads after an hour (database.md section 6).

## 7. Settings, inventory and outside calls (API7, API8, API9, API10)

- **SSRF (API7)**: the API never fetches a URL a user typed. A pasted Google Maps link is parsed for its coordinates as text, never opened. Outbound calls go to fixed hosts (Meta Graph, Resend).
- **Misconfiguration (API8)**: `helmet`; CORS allow-list from env with credentials, never `*`; production errors never include stack traces; Zod-checked env at start; the Supabase Data API off.
- **Inventory (API9)**: `docs/api.md` lists every route. A route not in `api.md` is not shipped; remove dead routes.
- **Unsafe consumption (API10)**: treat Meta and Resend answers as untrusted: timeouts, Zod-parse the response, retry with backoff from the outbox, never pass their text to a screen.

## 8. Secrets

- Never read, print or commit `.env*` files or keys; only `.env.example` (rule 9). Secrets live in Railway, Vercel and GitHub secrets.
- Browser bundles hold only publishable values (`NEXT_PUBLIC_*`, `VITE_*`); the build scan in CI fails on known secret patterns.
- A leaked key is replaced at once (new key, update the secret, revoke the old).

## 9. Logs and privacy (Data Privacy Act, RA 10173)

- Log security events (failed logins, refused cross-shop reads, rate limits, help-mode actions) with the tenant id and request id.
- Never log names, phones, emails, addresses, order tokens, session or access tokens, passwords, payment details or connection strings (OWASP logging cheat sheet). Mask or hash if an id is needed.
- Collect only what the order needs; erasure blanks the member and their orders' contact snapshot; leads go after 180 days (D6); a breach is reported to the NPC within 72 hours (plan in `launch.md`). Not legal advice: have it checked before launch.

## Before you say done

- [ ] The shop comes from the server, never the request; a second shop's token gets 404 in a test
- [ ] Route has `@Public()` or `@Can()`; Super Admin routes check the platform flag
- [ ] Input parsed and stripped by Zod; output uses the screen's schema; no private fields leak
- [ ] Limits exist for anything a stranger can repeat (orders, codes, proofs, stamps)
- [ ] Files: signed, sized, typed, tenant-pathed; private reads are short signed links
- [ ] No customer data or secrets in logs, errors or bundles

## Sources (opened 2026-11-20 unless marked)

- OWASP API Security Top 10 (2023): https://owasp.org/API-Security/editions/2023/en/0x11-t10/ (read from its GitHub source)
- OWASP Multi-Tenant Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html (GitHub source)
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html (GitHub source)
- OWASP Logging Cheat Sheet ("Data to exclude"): https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html (GitHub source)
- NestJS, Rate limiting: https://docs.nestjs.com/security/rate-limiting
- Supabase, Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Data Privacy Act rules: secondary sources only (privacy.gov.ph blocked the cloud session, 2026-11-15); unverified
