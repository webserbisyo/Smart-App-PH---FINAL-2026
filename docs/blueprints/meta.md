# Meta Pixel and Conversions API

How Smart App PH measures which Facebook ads bring paying shops. This is about our own ads for shop owners, not tracking inside a shop's storefront. Decisions T90 (what we send) and T104 (the safety rules in section 5). By-hand steps: `launch.md` sections 1 to 7. Routes: `api.md`, "Sign-up and going live" and "Super Admin". Table: `track_events` in `database.md` section 4.8.

## 1. Status (2026-11-20)

| Item                              | Status                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| Screens                           | Sign-up page and Super Admin › Tracking built on sample data (UI approved)               |
| Tables                            | `signup_leads` and `track_events` (the outbox) in the migrations, not yet applied to dev |
| NestJS routes and the sending job | Not built (Platform area, `PROGRESS.md` 4.2)                                             |
| What reaches Meta                 | Nothing until the Platform area is Done                                                  |
| Graph API version                 | `v27.0`, set by `META_GRAPH_VERSION`                                                     |

## 2. Events

| Event                | When                                              | Sent from        |
| -------------------- | ------------------------------------------------- | ---------------- |
| PageView             | Someone opens the sign-up page                    | browser + server |
| Lead                 | Step 1 done (name, email, mobile)                 | browser + server |
| CompleteRegistration | Email code done, shop made                        | browser + server |
| Contact              | Tap on Ask us on Messenger                        | browser + server |
| SubmitApplication    | The owner taps Ask to go live                     | server           |
| StartTrial           | The founder approves the shop                     | server           |
| AddPaymentInfo       | The owner sends a plan payment                    | server           |
| Subscribe            | The founder approves the first payment            | server           |
| Purchase             | The founder approves any payment, with the amount | server           |

A payment recorded by hand goes with action source `other`. A browser may only report the first four; the rest start on the server. There is no browser Purchase.

## 3. How one event travels

1. The sign-up page makes an event id and fires the pixel with it. The pixel loads only on `/signup`.
2. The same id rides the API call (`POST /signup/leads` carries the event id, `fbp`, `fbc`, ad source and page URL).
3. NestJS writes a `track_events` row (event id unique) in the same transaction as the lead.
4. The outbox job (D5) sends it to the Conversions API every minute with retry and back-off; failures show in Tracking with Retry.
5. Meta keeps one copy because the browser `eventID` matches the server `event_id` and the event names match (Meta, "Handling Duplicate Pixel and Conversions API Events"). Meta only removes doubles when both sources sent the event.

## 4. Ad source and privacy

- Ad link: `https://app.webserbisyo.com/signup?utm_source=facebook&utm_campaign={{campaign.name}}`. The first visit keeps utm source, campaign and Meta's click id for 90 days on that phone and sends them with the lead.
- Email and phone go to Meta hashed with SHA-256, never shown in full on our screens.
- The Terms and Privacy pages say we share hashed contact details with Meta (RA 10173; have them checked).
- The pixel ID is public. The Conversions API token lives only in Railway (`META_CAPI_TOKEN`) and never in chat, a doc or the repo. The test event code lives only in the environment and is removed after testing.

## 5. Safety rules (T104, from the Stays Meta plan's lessons)

1. **Never the founder's device.** Events the founder triggers in Super Admin (StartTrial, Subscribe, Purchase) never carry the founder's own IP address or browser. They use the data saved with the shop's sign-up lead (hashed email and phone, `fbp`, `fbc`, the IP address and browser from sign-up).
2. **Nothing from help mode.** An owner action the founder does while in help mode (Open as owner) queues no Meta event. The Platform task records who triggered each event (owner, founder or job); if that needs a new column, the migration still needs the founder's yes.
3. **Event time is the action time.** Server events use the moment the action happened in our system (for example the approval), never a date typed by hand. Meta refuses events more than 7 days old, so a hand-recorded payment keeps its paid date on the payment row only.
4. **Real visitor IP address.** NestJS sets Express `trust proxy` to Railway's proxy, so `req.ip` is the address Railway saw. Never read the first `x-forwarded-for` value directly.
5. **One hash format.** Before hashing: email trimmed and lowercased; phone as digits only with country code 63 (for example `639171234567`).

## 6. Super Admin › Tracking

Sending switch, test mode with Meta's test code, Send a test event (a made-up test identity, never a real owner's data), Retry for failed events, the by-ad table (leads, signed up, live, paying) and the event list.

## 7. Build order (Platform area)

1. `POST /signup/leads` with the lead row and its event.
2. The outbox job with an advisory lock, retry and back-off.
3. Server-only events from approvals and payments, following section 5.
4. Tracking routes (`GET/PUT /admin/tracking`, retry, test).
5. Test with Meta's test code (`launch.md` section 7), then turn test mode off.

## Sources

- Meta, Handling Duplicate Pixel and Conversions API Events (event id and event name; both sources needed): read 2026-11-20 from its developer docs
- Stays Meta plan, `docs/blueprints/meta-pixel-capi.md` section 2a in `MiguelMorales29/smart-app-ph-stays` (lessons L1 to L6 and flaws F1 to F8 of the RSVP app), read 2026-11-20
