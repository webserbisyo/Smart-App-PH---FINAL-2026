# Meta Pixel and Conversions API

How Smart App PH measures which Facebook ads bring paying shops. This is about our own ads for shop owners, not tracking inside a shop's storefront. Decisions T90 (what we send) and T104 (the safety rules in section 5). By-hand steps: `launch.md` sections 1 to 7. Routes: `api.md`, "Sign-up and going live" and "Super Admin". Table: `track_events` in `database.md` section 4.8.

Decision T118 (2026-11-26) settled the rules for manual payments; they are built (phase 7) and replace the
older text here. Design and research: `phases-7-9.md` section 4.

## 1. Status (2026-11-26)

| Item                              | Status                                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Screens                           | Sign-up page and Super Admin › Tracking on the API (`VITE_API_AREAS` includes `platform`)                                                      |
| Tables                            | `track_events` with event time, action source, who caused it, the owner's IP and browser until sent (`20261201100000_platform_tracking.sql`)   |
| NestJS routes and the sending job | Built: `apps/api/src/platform` (`track-writer.ts`, `meta-sender.ts`, `meta-graph.ts`), tested on the local database with a recording Graph API |
| What reaches Meta                 | Nothing until `META_PIXEL_ID` and `META_CAPI_TOKEN` are set on Railway and Tracking › Sending is on                                            |
| Graph API version                 | `v27.0`, set by `META_GRAPH_VERSION`                                                                                                           |

## 2. Events

| Event                | When                                              | Sent from        | Time and source                                                   |
| -------------------- | ------------------------------------------------- | ---------------- | ----------------------------------------------------------------- |
| PageView             | Someone opens the sign-up page                    | browser + server | now, `website`                                                    |
| Lead                 | Step 1 done (name, email, mobile)                 | browser + server | now, `website`                                                    |
| CompleteRegistration | Email code done, shop made                        | browser + server | now, `website`                                                    |
| Contact              | Tap on Ask us on Messenger                        | browser + server | now, `website`                                                    |
| SubmitApplication    | The owner taps Ask to go live                     | server           | now, `website`, owner's IP and browser                            |
| StartTrial           | The founder approves the shop                     | server           | the approval, `system_generated`, no IP or browser (Q3)           |
| AddPaymentInfo       | The owner sends a plan payment                    | server           | the owner's send, `website`, owner's IP and browser               |
| Subscribe            | The founder approves the first payment            | server           | **the owner's send** (Q1), `website`, owner's IP and browser (Q2) |
| Purchase             | The founder approves any payment, with the amount | server           | **the owner's send** (Q1), `website`, owner's IP and browser (Q2) |

Purchase and Subscribe are written `waiting` when the owner sends the payment, so they hold the owner's own time,
address and browser. Approve turns them `queued` with the approved amount, 11 minutes ahead (the 10-minute Undo,
Q4); Undo puts them back to `waiting`; Not approved skips them (`not_approved`). A payment recorded by hand goes
with action source `other`, caused by the founder, and no IP or browser. There is no browser Purchase.

**Never fires** (Q7, `trackingBlock`): a demo shop, a test shop (Super Admin › shop › Test shop), anything done
in help mode, and the founder's own actions as an owner. Such a row is kept as `skipped` with the reason.

## 3. How one event travels

1. The sign-up page makes an event id and fires the pixel with it. The pixel loads only on `/signup`, never for
   the founder, with Meta's automatic events and page views on route change off. After sign-up a full page load
   leaves the pixel behind, so it never sees the dashboard.
2. The same id rides the API call (`POST /signup/leads` carries the event id, `fbp`, `fbc`, ad source and page URL).
3. NestJS writes a `track_events` row (event id unique, hashes only) in the same transaction as the step.
4. The sender (`meta-sender.ts`) runs every 30 seconds: one event per request; past 7 days less an hour it is
   skipped as `too_old` (never sent with a moved time); an expired token stops sending and shows on Tracking; a
   refused event is not tried again; a timeout is tried 5 times (1, 5, 15, 60 minutes). A sent row drops its IP
   address and browser; any row drops them after 8 days; rows go after 13 months (Q13).
5. Meta keeps one copy because the browser `eventID` matches the server `event_id` and the event names match.

## 4. Ad source and privacy

- Ad link: `https://app.webserbisyo.com/signup?utm_source=facebook&utm_campaign={{campaign.name}}`. The first visit keeps utm source, campaign and Meta's click id for 90 days on that phone and sends them with the lead.
- Email and phone go to Meta hashed with SHA-256, never shown in full on our screens.
- The Terms and Privacy pages say we share hashed contact details with Meta (RA 10173; have them checked).
- The pixel ID is public. The Conversions API token lives only in Railway (`META_CAPI_TOKEN`) and never in chat, a doc or the repo. The test event code lives only in the environment and is removed after testing.

## 5. Safety rules (T104, made exact by T118)

1. **Never the founder's device.** The founder's approvals never carry the founder's IP address or browser:
   Purchase and Subscribe carry the owner's, saved when the owner sent the payment.
2. **Nothing from help mode, demo or test shops** (section 2, Never fires).
3. **Event time is the true time.** The owner's send for a payment, the approval for StartTrial. An event over 7
   days old is skipped, never sent with today's time. Super Admin shows "Meta counts this Purchase if you approve
   it in the next N days" on each payment to check.
4. **Real visitor IP address.** NestJS sets Express `trust proxy` to Railway's proxy, so `req.ip` is the address
   Railway saw. Never read the first `x-forwarded-for` value directly.
5. **One hash format.** Before hashing: email trimmed and lowercased; phone as digits only with country code 63.

## 6. Super Admin › Tracking

Sending switch, test mode with Meta's test code, Send a test event (a made-up test identity, never a real owner's data), Retry for failed events, the by-ad table (leads, signed up, live, paying) and the event list.

## 7. Testing

On the laptop database the tests use a recording Graph API (`apps/api/test/integration/platform.test.ts`). On
staging: test mode on with Meta's test code, then the steps in `launch.md` section 13.

## Sources

- Meta, Handling Duplicate Pixel and Conversions API Events (event id and event name; both sources needed): read 2026-11-20 from its developer docs
- Stays Meta plan, `docs/blueprints/meta-pixel-capi.md` section 2a in `MiguelMorales29/smart-app-ph-stays` (lessons L1 to L6 and flaws F1 to F8 of the RSVP app), read 2026-11-20
