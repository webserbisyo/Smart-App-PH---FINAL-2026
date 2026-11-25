# Phases 7 to 9: build plan (PROPOSED)

The detailed plan for launch phases 7 (Plan, billing, Super Admin and Meta), 8 (Go live) and 9 (Sell) from `launch-phases.md`. Written 2026-11-25 from `main` @ 752d3ae (phases 4 to 6 merged) after a scan of our code, a scan of the founder's RSVP app (`webserbisyo/webserbisyo-rsvp` @ 11cb846, used as a list of mistakes to avoid, never as the reference) and the official Meta Pixel and Conversions API docs. Status: **proposed**. Nothing here is built until the founder says yes to section 10. `launch-phases.md` stays the map; once approved, this file is the build spec for these three phases and wins where they differ.

As in phases 4 to 6, the founder does every by-hand step at the end, after the code is in. Section 11 is that list, in order.

## 0. Brief

**Goal.** You approve shops, take ₱399 payments by GCash or Maya, help owners and see which ad brought each paying shop, without SQL. Every Meta event fires once, from the right person, at the right time, and never from your own phone or laptop. Then the live product goes up and the first shops pay.

**Done when.** Phase 7: on staging with Meta's test code, a test shop goes from the ad link to its first approved payment and Meta's Test events shows PageView, Lead, CompleteRegistration, SubmitApplication, StartTrial, AddPaymentInfo, Subscribe and Purchase exactly once each, with the right time and amount, and nothing fires while you are in help mode or on a demo shop. Phase 8: `PROGRESS.md` 5.1 and 5.2 ticked. Phase 9: `PROGRESS.md` 5.3 ticked.

**Not in scope.** A payment gateway (payments stay manual: the owner sends a receipt, you approve). Tracking inside a shop's storefront for the shop's own ads (MVP B). Staff accounts for helpers who approve payments with you (MVP B).

## 1. Where we start (checked 2026-11-25)

- **Database.** All 7 phase 7 tables exist (`platform_settings`, `plan_payments`, `billing_messages`, `shop_activity`, `support_sessions`, `track_events`, `audit_log`), plus the Billing chat photos (step 9). `plan_payments.created_at` is the moment the owner sent the payment; there is no typed paid date anywhere.
- **API.** Sign-up saves the lead (`saveSignupLead`) and makes the shop, and Ask to go live works. `POST /track` checks the sign-up page's events and keeps nothing ("nothing is kept yet"). There is no admin module, no plan routes, no help mode, no Meta sender. `trust proxy` is set from `TRUST_PROXY_HOPS`, so `req.ip` is the phone's address. The jobs module (D5) runs timed jobs with an advisory lock.
- **Dashboard.** Super Admin (Today, Shops with side panel and Leads, Create a shop, Payments with CSV, Tracking, Setup), the Plan page and the Billing chat are built on sample data. `packages/data/src/adapters/api/platform.ts` exists and was never run against the API.
- **Rules in core.** `planStatus` works out trial, active, due, overdue and paused from `trial_ends_at` and `paid_until` (nothing stored). `planCoversUntil` extends from the paid-until day, or from today when that day has passed. Meta helpers exist: `metaEmail`, `metaPhone` (adds 63), `metaName`, `metaCity`, `fbcFromClick`, `metaEventId`, `metaEventTime`.
- **Four problems in our own setup today** (found in this scan; fixed in phase 7):
  1. **The pixel leaks into the dashboard.** The pixel loads only on `/signup`, but after sign-up the page moves to `/` inside the same app (`signup-form.tsx`, `navigate({ to: '/' })`). The pixel stays loaded, and Meta's pixel fires a PageView by itself on every in-app page change (Meta, "Tagging SPAs"). So a new owner's dashboard pages, and `/admin` if you test sign-up and then open Super Admin, send PageViews. This is the same class of mistake as the RSVP app firing from Super Admin.
  2. **Automatic events are on.** `startPixel` calls `fbq('init', id)` without turning off automatic button and page-data events, so the pixel can send events we never chose.
  3. **No browser or IP data is kept for later events.** T104 rule 1 says events you trigger use "the IP address and browser from sign-up", but `signup_leads` has no column for them.
  4. **The outbox can't tell time or source.** `track_events` has no event time, no action source and no record of who caused the event, so the sender would have to guess.

## 2. Your RSVP app: what went wrong and what we do instead

Scanned at `webserbisyo/webserbisyo-rsvp` @ 11cb846. Good parts we keep: one delivery row per event so a Purchase is sent once, `Purchase:<payment id>` style ids, and logs that never hold a raw email or phone.

| #   | What the RSVP app does (file)                                                                                                                                                                                           | Why it's wrong (Meta's rule)                                                                                               | What we do                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | The browser Purchase fires from a "payment confirmed" dialog on the client dashboard (`payment-confirmed-dialog.tsx`), which also loads when you open the client's dashboard as admin. Your browser fires the Purchase. | The event carries your IP, browser and cookies, so Meta matches the sale to you, not the client.                           | **No browser Purchase at all.** Purchase, Subscribe and StartTrial are sent by the server only. The pixel never loads outside `/signup` (section 4.4).                                                            |
| F2  | "Already fired" is remembered in the browser (localStorage). Another phone, another browser or a cleared cache fires again; a fire more than 48 hours later is not removed as a double.                                 | Meta removes doubles only when the name and id match and both arrive within 48 hours.                                      | **The database guarantees once.** The event id is made from the row id (`purchase:<payment id>`) and `track_events.event_id` is unique. A second approve, a retry or a second device can't make a second row.     |
| F3  | The Purchase time is the "paid at" you type (a date and time box that defaults to now), with no 7-day check. A backdated entry fires with yesterday's time; anything over 7 days old makes Meta reject the whole batch. | `event_time` is when the event really happened. Any event older than 7 days makes Meta refuse every event in that request. | **No typed time ever.** The time is our server clock at the moment the owner sent the payment. If you approve more than 6 days later, the event is skipped with "Too old for Meta" and nothing else is harmed.    |
| F4  | The browser fires with the time "now" while the server sends "paid at": two different times for one sale.                                                                                                               | Mismatched times weaken matching and reports.                                                                              | One sender (the server), one time.                                                                                                                                                                                |
| F5  | Purchase is sent as `website` from a made-up `/apply/success` page, with the browser and IP from the application weeks earlier.                                                                                         | `action_source` must say where it really happened; RSVP's own notes say "no fictional URL".                                | `website` only when the owner did it on our site, with that request's real page, IP and browser. A payment you record by hand is `other` with no IP or browser. StartTrial (your approval) is `system_generated`. |
| F6  | Advanced matching (email, phone, name, external id) is put in the 4th argument of `fbq('track')`.                                                                                                                       | Meta: advanced matching must be in `fbq('init')`, "or the values will not be treated as manual advanced matching values".  | The server carries the matching data. The browser only fires the four sign-up events with the shared event id (section 4.4, Q6).                                                                                  |
| F7  | `external_id` is the reference code on the server but the payment id in the browser.                                                                                                                                    | external_id must be the same value in every channel.                                                                       | `external_id` = SHA-256 of the sign-up lead id, the same on every event for that owner, browser and server.                                                                                                       |
| F8  | Phone hashed as `09…` digits with no country code, and no country sent.                                                                                                                                                 | Phone must include the country code without a leading zero; country should always be sent.                                 | `metaPhone` already gives `639…`; every event sends `country` = hash of `ph`.                                                                                                                                     |
| F9  | Lead carries the full plan price as its value; Pro shows ₱999 but ₱1,599 is sent.                                                                                                                                       | Value should be what was actually paid.                                                                                    | Only Subscribe and Purchase carry a value: the approved amount in pesos (399.00), currency PHP, read from the payment row.                                                                                        |
| F10 | Two mark-paid paths and two approve paths that drifted; bulk mark-paid fires many Purchases at once; cancel is two separate updates.                                                                                    | Two paths means two sets of rules.                                                                                         | One NestJS service for approve and record, one transaction each, the event row written in the same transaction. No bulk approve.                                                                                  |
| F11 | `fbc` is rebuilt from the click id with a new time on every event.                                                                                                                                                      | `fbc` keeps the time the click id was first seen.                                                                          | Already right: `captureAttribution` keeps the first-seen time for 90 days, and the lead stores `fbc` once.                                                                                                        |
| F12 | Login as client is signed with the Supabase service key, the end is not logged, no reason is asked.                                                                                                                     | One leaked key opens everything; no full record.                                                                           | Help mode: its own `SUPPORT_SESSION_SECRET`, a reason, a 60-minute hard end, start and end in `audit_log`, and no Meta event from anything done inside it.                                                        |

## 3. Research findings that shape the plan

V = verified in Meta's developer docs (read 2026-11-25 in a real browser) or our own code. A = assumed or a secondary source; we check it before relying on it.

| #   | Finding                                                                                                                                                                                                     | V/A                                                        | What we do                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `event_time` is the Unix time "when the actual event occurred". It can be up to 7 days old; if any event in a request is older, Meta returns an error for the whole request and processes none.             | V (Server Event params)                                    | Time = server clock at the owner's action. The sender skips anything older than 6 days 23 hours and sends **one event per request**, so one old event can't block others. |
| M2  | Meta recommends sending events as they happen, "ideally within an hour".                                                                                                                                    | V (Using the API)                                          | Owner events go within a minute. Purchase waits for your approval, so Super Admin shows payments to check first, oldest on top, with how many days Meta still counts.     |
| M3  | Doubles are removed when `event_name` and `event_id` (pixel: `eventID`, the 4th argument of `fbq('track')`) match, within 48 hours.                                                                         | V (Deduplicate page)                                       | Browser and server share one id for the four sign-up events. Server-only events need no browser twin.                                                                     |
| M4  | `action_source` must be accurate: `website`, `email`, `app`, `phone_call`, `chat`, `physical_store`, `system_generated` (for example an automatic renewal), `business_messaging`, `other`.                  | V (Server Event params)                                    | `website` for owner actions on our site, `system_generated` for StartTrial, `other` for payments you record by hand.                                                      |
| M5  | Website events need `event_source_url` and `client_user_agent`.                                                                                                                                             | V                                                          | Captured from the owner's own request at the moment of the action, kept on the event row, removed once sent.                                                              |
| M6  | Advanced matching belongs in `fbq('init', id, {...})`.                                                                                                                                                      | V (Advanced matching)                                      | Server carries matching. Optional browser matching through Events Manager's automatic advanced matching, `/signup` only (Q6).                                             |
| M7  | Phone: digits with country code, no leading zero. Email trimmed and lowercased. Country: 2-letter lowercase, hashed, always sent. `external_id` hashing recommended and the same format in every channel.   | V (Customer info params)                                   | Our `meta*` helpers plus a test table; `external_id` = hash of the lead id.                                                                                               |
| M8  | Never hash `client_ip_address`, `client_user_agent`, `fbp` or `fbc`. `fbc` = `fb.1.<ms first seen>.<fbclid>`, kept 90 days.                                                                                 | V (fbp and fbc)                                            | As today, plus a test.                                                                                                                                                    |
| M9  | In a single-page app the pixel fires PageView on every history change by itself; `fbq.disablePushState = true` stops it. `fbq('set', 'autoConfig', false, id)` stops automatic button and page-data events. | V (Tagging SPAs, Pixel advanced)                           | Both set before `init`, and leaving `/signup` after sign-up is a full page load, so the pixel is gone from the dashboard.                                                 |
| M10 | `customer_segmentation` tells Meta if the buyer is new (`new_customer_to_business`) or returning (`existing_customer_to_business`).                                                                         | V                                                          | First approved payment: new; later ones: existing.                                                                                                                        |
| M11 | `original_event_data` links a delayed event to an earlier one.                                                                                                                                              | V that it exists; A for its fields (its page did not load) | Not at launch. Try on Subscribe in test mode after launch.                                                                                                                |
| M12 | `test_event_code` sends to Test events only while testing.                                                                                                                                                  | V                                                          | Test mode in Super Admin › Tracking, on by default.                                                                                                                       |
| M13 | Ad sets need about 50 optimisation events in 7 days to leave "Learning"; below that they stay "Learning limited".                                                                                           | A (Meta Business Help, secondary)                          | Optimise ads on CompleteRegistration first; move to Purchase when Purchases pass about 50 a week (Q8).                                                                    |
| M14 | Aggregated Event Measurement's 8-event limit was reportedly removed in 2025.                                                                                                                                | A (dates conflict)                                         | Check in Events Manager when you set up; nothing in our code depends on it.                                                                                               |
| M15 | Vercel Hobby is for non-commercial use only.                                                                                                                                                                | V (Vercel terms, 11-20)                                    | Vercel Pro before the first payment (phase 8).                                                                                                                            |
| M16 | Supabase Pro includes daily backups kept 7 days; point-in-time restore is a paid add-on.                                                                                                                    | A (check the pricing page at sign-up)                      | Pro daily backups plus our own monthly restore drill in CI; no add-on at launch.                                                                                          |
| M17 | NPC Circular 2022-04: registration is required at 250+ employees or when processing sensitive personal information of 1,000+ people; others may register voluntarily.                                       | A (check the circular)                                     | Likely not required at launch; a lawyer confirms (section 11).                                                                                                            |
| M18 | Under the EOPT Act (RR 7-2024) the invoice replaces the official receipt for services.                                                                                                                      | A (check with BIR or an accountant)                        | Our "Payment received" email is a receipt note, not a BIR invoice; the invoice comes once you are registered (phase 9).                                                   |

## 4. The Meta design

### 4.1 Six rules (the "never again" list)

1. **Only the owner's own actions are measured where they happen.** Every event row records who caused it: `visitor`, `owner`, `admin` or `job`. You only ever cause StartTrial, Subscribe and Purchase, and those never carry your IP, browser or cookies.
2. **Time comes from our server clock, never a typed date.** For a payment, the time is when the owner sent it, even if you approve it the next day.
3. **One event per thing, guaranteed by the database.** The event id comes from the row it is about. A double tap, a second device, a retry or approving twice can't make a second event.
4. **Nothing from demo shops, Super Admin accounts or help mode.** Such rows are written as skipped with the reason, so Tracking shows why nothing went.
5. **Too old means skipped, never sent.** One old event never blocks the others.
6. **You can take it back for 10 minutes.** An approval's events wait 10 minutes; Undo approval in that time cancels them and the payment goes back to To check.

### 4.2 Every event

| Event                | What happens                          | Sent from        | Time (server clock)                          | Action source    | Match data                                                                            | Value       | Event id                   |
| -------------------- | ------------------------------------- | ---------------- | -------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- | ----------- | -------------------------- |
| PageView             | Someone opens `/signup`               | browser + server | page open                                    | website          | IP, browser, fbp, fbc                                                                 | none        | made by the page           |
| Contact              | Taps Ask us on Messenger on `/signup` | browser + server | the tap                                      | website          | IP, browser, fbp, fbc                                                                 | none        | made by the page           |
| Lead                 | Sign-up step 1 done                   | browser + server | the request                                  | website          | em, ph, fn, ln, country, external_id, IP, browser, fbp, fbc                           | none        | made by the page           |
| CompleteRegistration | Email code done, shop made            | browser + server | the request                                  | website          | as Lead, plus ct (the shop's city)                                                    | none        | made by the page           |
| SubmitApplication    | Owner taps Ask to go live             | server           | the request                                  | website          | as CompleteRegistration, the request's IP and browser, page = Home                    | none        | `apply:<shop id>`          |
| StartTrial           | You approve the shop                  | server           | your approval (when the trial really starts) | system_generated | em, ph, fn, ln, ct, country, external_id, fbp, fbc from sign-up; **no IP or browser** | none        | `trial:<shop id>`          |
| AddPaymentInfo       | Owner sends a plan payment            | server           | the send                                     | website          | as SubmitApplication, page = Plan                                                     | none        | `paymentinfo:<payment id>` |
| Subscribe            | You approve the shop's first payment  | server           | **when the owner sent it**                   | website          | the IP, browser and page **saved from the owner's send**                              | amount, PHP | `subscribe:<payment id>`   |
| Purchase             | You approve any payment               | server           | **when the owner sent it**                   | website          | as Subscribe; `customer_segmentation` new on the first, existing after                | amount, PHP | `purchase:<payment id>`    |
| Purchase (by hand)   | You record a bank or cash payment     | server           | when you record it                           | other            | em, ph, fn, ln, ct, country, external_id, fbp, fbc; no IP or browser                  | amount, PHP | `purchase:<payment id>`    |

How a payment travels, so nothing is guessed later:

1. The owner sends a payment on the Plan page. In one transaction NestJS writes the `plan_payments` row, an AddPaymentInfo event (`queued`) and a Purchase event (`waiting`), both with the owner's IP, browser, page and the send time. If it is the shop's first payment, a Subscribe event (`waiting`) too.
2. You approve. The waiting events become `queued` with `send_after` = now + 10 minutes. Undo approval in those 10 minutes turns them back to `waiting` and the payment back to pending.
3. You mark it Not approved. The waiting events become `skipped` ("Payment not approved").
4. The sender job (every minute) sends each queued event once `send_after` has passed. If the event time is more than 6 days 23 hours old, it is `skipped` ("Too old for Meta").
5. Once sent (or skipped), the raw IP and browser are removed from the row. Only hashes, `fbp`, `fbc` and the result stay.

### 4.3 Who never fires

The check runs in one core function (`trackingBlock`), used by every place that writes an event, with tests:

- a demo shop (`tenants.is_demo`) or a reserved sample slug;
- any request while help mode is on (owner actions you do as the owner);
- a signed-in Super Admin (platform admin) or the `ADMIN_EMAIL` account, on any route, including `/signup`;
- a shop you marked as a test in Super Admin (`tenants.is_test`, Q7), which also keeps it out of Today's money and funnel;
- everything while Tracking's sending switch is off: events stay queued and age out after 7 days.

### 4.4 The pixel on `/signup`

1. Before `init`: `fbq.disablePushState = true` and `fbq('set', 'autoConfig', false, pixelId)`.
2. The pixel does not load at all when the visitor is signed in as Super Admin, or on the `smartapp-demo-*.vercel.app` demo links (no `VITE_META_PIXEL_ID` there).
3. After sign-up, leaving `/signup` is a full page load (`window.location.assign('/')`), so no pixel code stays in the dashboard.
4. The four sign-up events fire with the same id the server gets (as today).
5. Events Manager › Settings › Traffic permissions: allow only `webserbisyo.com` (A: the setting exists; checked during your setup), so a copy of our page elsewhere can't send to your pixel.

### 4.5 The sender

- One event per Graph API request (`POST https://graph.facebook.com/v27.0/<pixel id>/events`). At our volume this is a few hundred calls a day at most, and a bad event can't sink a batch.
- Retry with back-off (1, 2, 4, 8 … minutes, up to 1 hour) on timeouts and 5xx, at most 10 tries and never past the 7-day line.
- Meta's "invalid parameter" answers are not retried: `failed` with "Rejected by Meta" and Meta's trace id, shown in Tracking.
- An expired or wrong token stops all sending, shows a red card on Super Admin › Today and emails you once. Events wait (and age out after 7 days).
- The token is only in Railway. It is never logged, and the request body is never logged (hashes only in the event row).

## 5. Phase 7: Plan, billing, Super Admin and Meta

| Task | What                                                                                                                                                                                                                                                                                                                                                                                                                    | Target                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 7.1  | **Migration (needs your yes, Q5).** `track_events`: `event_time`, `action_source`, `caused_by` (visitor, owner, admin, job), `plan_payment_id`, `client_ip`, `client_ua`, `fbtrace_id`; status `waiting`; problems `too_old`, `not_approved`, `demo_shop`, `test_shop`, `help_mode`, `admin`. `tenants.is_test` (a shop you mark as a test: no Meta events, left out of Today's money and funnel). With database tests. | One new file; 99+ DB tests green                                         |
| 7.2  | **Owner plan routes:** `getPlan`, `submitPlanPayment` (writes the event rows of 4.2), `sendPlanNote`, `sendPlanPhoto`, `markPlanChatSeen`; the duplicate reference check across all shops (`reference_norm`); help mode locks payments.                                                                                                                                                                                 | api.md "Settings" plan rows; integration tests                           |
| 7.3  | **Super Admin routes** (`@Can('platform:admin')`, every write also writes `audit_log` in the same transaction): Today, Shops, shop detail, Leads, approve go-live (StartTrial), review payment (approve or Not approved with reasons), **Undo approval (10 minutes)**, record payment, extra days, reminder, notes, close, reopen, delete (closed shops only, name typed), Create a shop, Payments with CSV, Setup.     | api.md "Super Admin" table; Not found for anyone else                    |
| 7.4  | **Help mode:** start with a reason, a signed cookie with `SUPPORT_SESSION_SECRET`, 60 minutes then it ends by itself, start and end in `audit_log` and the Billing chat, locked actions (`support_locked`), every audit row in the session carries the session id, no Meta events.                                                                                                                                      | Integration tests for each locked action                                 |
| 7.5  | **Billing in time:** a daily job at 9:00 Manila sends reminders once each (Q9) by email and a Billing line, and records `reminded_at`. The plan state stays computed by `planStatus`; nothing is stored, so it can't drift. A paused shop's storefront takes no orders (checked in place order with the same rule).                                                                                                     | Unit tests on dates around midnight Manila; job test                     |
| 7.6  | **Meta outbox and sender:** `trackingBlock`, the writer, the sender job of 4.5, `/track` keeping the sign-up events, Tracking routes (`getTracking`, `setTracking`, retry, Send a test event with a made-up identity).                                                                                                                                                                                                  | A fake Graph API in tests checks every payload field against section 4.2 |
| 7.7  | **Pixel fixes** (4.4).                                                                                                                                                                                                                                                                                                                                                                                                  | e2e: no `fbevents.js` request after sign-up, none on `/admin`            |
| 7.8  | **Emails through Resend's API** (the `EmailSender` from phase 5): shop is live, trial ends in 3 days, plan due, overdue, paused, payment approved (with a receipt note), payment not approved (with the reasons), help mode started.                                                                                                                                                                                    | Words in `words.ts`; a test per email                                    |
| 7.9  | **Clean-up jobs:** leads not signed up after 180 days (D6); plan payment photos per T107; raw IP and browser on event rows once sent or skipped; event rows after 13 months (Q13).                                                                                                                                                                                                                                      | Job tests                                                                |
| 7.10 | **"Never fires" tests:** you approve from your laptop (no IP or browser of yours in the payload); help mode; demo shop; approve twice; two devices; Undo within 10 minutes; approve on day 8 (skipped, nothing sent); token expired (sending stops).                                                                                                                                                                    | All green in CI                                                          |
| 7.11 | **Switch the Platform area to the API** (`VITE_API_AREAS`), screens unchanged.                                                                                                                                                                                                                                                                                                                                          | 0 console errors at 390 and 1280 px; screenshots                         |

**Done when.** The "Done when" of section 0 for phase 7, first on the laptop database in CI (fake Graph API), then on staging with Meta's test code (section 11, phase 7 steps).

## 6. Phase 8: Go live

| Task | What                                                                                                                                                                                                                                                                              | Who                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 8.1  | **Live migrations by a button only you can press** (Q14): a GitHub workflow "Apply migrations to live" that runs only from `main`, waits for your approval in a `production` environment, then applies new migrations. Settles conflict 3 of `launch-phases.md`.                  | Claude builds; you press             |
| 8.2  | **Live deploys wait for green checks** (Q15): Railway and Vercel deploy live only after the GitHub checks pass, so pushing to `main` stays (T104) without a red build reaching shops. Settles conflict 4. (A: both settings exist; checked when we set them.)                     | Claude sets with you                 |
| 8.3  | **Restore drill in CI**: once a month, dump the live database's structure and row counts into a private artifact, restore it into a throwaway local database and compare counts. Written down in `launch.md`.                                                                     | Claude builds                        |
| 8.4  | **Security pass**: OWASP API Top 10 walk-through of every route, cross-shop tests (exist), rate limits, CSP and security headers on both Vercel projects, no customer data in logs (log scan test), secrets rotated from staging values.                                          | Claude                               |
| 8.5  | **Super Admin 2-step login** (Q16): an authenticator-app code for platform admins only (Supabase Auth MFA behind NestJS). Super Admin can open every shop, so it deserves the strongest lock.                                                                                     | Claude builds; you set up your phone |
| 8.6  | **Watching**: an uptime check on `api.webserbisyo.com/health` and both sites that emails you (a free monitor, no code), Railway logs, and a daily 8:00 Manila "all good" summary email from the API (jobs ran, events sent, failures). Error tracking with a package later (Q17). | Claude + you                         |
| 8.7  | **Speed and load**: Lighthouse 90+ on a mid-range Android profile, 300 KB per page, and a k6 load test run from the cloud against staging (about 100 customers at once, 30 orders a minute in one shop). k6 runs as a container, not a repo package.                              | Claude                               |
| 8.8  | **Legal pages**: Terms, Privacy notice (says we share hashed contact details with Meta), a per-shop privacy notice template (the shop owns its customers' data; we process it for them) and a data processing agreement every shop accepts at Go live; a 72-hour breach plan.     | Claude drafts; a lawyer checks       |
| 8.9  | **Acceptance 1 to 8** (`A-mvp.md` section 5) on your Android and iPhone on the live setup with a shop marked as a test, which is then closed and deleted.                                                                                                                         | You + Claude                         |

**Done when.** Every line of `PROGRESS.md` 5.1 and 5.2 is ticked.

## 7. Phase 9: Sell

| Task | What                                                                                                                                                                       | Who                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 9.1  | **Pilot**: one food shop and one retail shop, set up with you (self sign-up from the ad link, or Create a shop plus help mode), straight to the 14-day trial (Q18).        | You                       |
| 9.2  | **Sales kit (code)**: a printable shop QR poster from Settings › Share (A4 and A6), and a "Try a sample shop" link list for Messenger replies.                             | Claude                    |
| 9.3  | **Sales kit (words)**: a 60-second walkthrough script, the Messenger reply script and an FAQ (price, trial, how payment works, data).                                      | Claude drafts, you record |
| 9.4  | **Ads**: one campaign, ad link with the campaign name (`launch.md` section 3), optimise on CompleteRegistration first (Q8), a small daily budget for 2 weeks, then review. | You                       |
| 9.5  | **Weekly funnel review** (Mondays, 30 minutes): Super Admin › Today funnel (leads, signed up, asked, live, paying) by ad, plus cost per paying shop from Ads Manager.      | You + Claude              |
| 9.6  | **Feedback list** feeding MVP B (POS, staff, inventory), kept in the Start here doc.                                                                                       | Claude                    |
| 9.7  | **Business papers**: DTI business name, BIR registration and invoices, and a GCash or Maya account that fits business receipts (A: personal wallet limits).                | You                       |

**Done when.** `PROGRESS.md` 5.3: a pilot shop takes real orders on the live database and its first ₱399 payment is approved, and Purchase shows once in Events Manager.

## 8. Order and timing

1. **PR A: billing, Super Admin and help mode** (7.1 to 7.5, 7.8, 7.9, 7.11 for those screens).
2. **PR B: Meta** (7.6, 7.7, 7.10) on top of A. Two PRs keep each review small and let billing work even if Meta setup waits.
3. **PR C: go-live code** (8.1 to 8.7 code parts) while you buy and set up the live accounts.
4. Your by-hand steps (section 11) after each PR, then the staging test together, then live.

You want the first paying shop in December, and the domain renews on Dec 19 (auto-renew on). Phase 7 code is the biggest piece; phase 8's code is small; most of phase 8 and 9 is your setup and selling.

## 9. Database cross-check

- No new table. One migration for 7.1 (Q5).
- `plan_payments.created_at` = when the owner sent it: the Purchase time. Never editable.
- `signup_leads` stays without IP or browser: they live on each event row only until it is sent (privacy: raw IP kept days, not months).
- Indexes: `track_events (status, send_after)` for the sender; `plan_payments (status, created_at)` for To check.

## 10. Decisions for you

| #   | Question                                             | Recommendation                                                                                                                                                                                  |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | What time does a Purchase carry?                     | **When the owner sent the payment** (server clock), even if you approve later. Updates T104 rule 3 ("event time is the action time") to name the owner's action.                                |
| Q2  | Whose IP and browser go with Purchase and Subscribe? | **The owner's, saved from their own send request**, with `website` and the Plan page. Updates T104 rule 1 (which said "from sign-up"). A payment you record by hand stays `other`.              |
| Q3  | StartTrial                                           | At your approval, `system_generated`, no IP or browser.                                                                                                                                         |
| Q4  | Undo approval for 10 minutes                         | Yes. Events wait 10 minutes; Undo puts the payment back to To check and cancels them.                                                                                                           |
| Q5  | The one migration in 7.1                             | Yes (needed for everything above).                                                                                                                                                              |
| Q6  | Browser matching on `/signup`                        | Leave the server to carry matching; turn on Events Manager's automatic advanced matching for email and phone only, and check "matched parameters" in Test events.                               |
| Q7  | Who never fires                                      | Demo shops, Super Admin accounts, help mode, shops you mark as a test (4.3). Shops you create for an owner do send Purchase (Meta only credits an ad that owner actually saw).                  |
| Q8  | What the ads optimise on                             | CompleteRegistration until Purchases pass about 50 a week, then Purchase.                                                                                                                       |
| Q9  | When reminders go out                                | Trial: 3 days before and on the last day. Paid plan: 7 days before (due), on the end day, 3 days into grace, and the day it pauses. Email plus a Billing line, each once.                       |
| Q10 | How a payment extends the plan                       | From the paid-until day, also during the 7-day grace (today `planCoversUntil` starts from today once the day has passed, which gives the grace days free). From the approval day after a pause. |
| Q11 | What a paused shop can do                            | The owner sees everything, can export and pay; no new orders. The storefront shows the menu with "Not taking orders right now" (no plan wording to customers).                                  |
| Q12 | Refunds                                              | None by default. Before approval use Not approved. After approval you refund outside the app and add a Billing note; Meta is not changed.                                                       |
| Q13 | How long event rows stay                             | 13 months (a year of reports); raw IP and browser only until sent.                                                                                                                              |
| Q14 | How migrations reach live                            | The `production` workflow only you can approve (8.1).                                                                                                                                           |
| Q15 | Branch protection vs push to `main`                  | Keep push to `main`; live deploys wait for green checks (8.2).                                                                                                                                  |
| Q16 | Super Admin 2-step login                             | Yes, for platform admins only.                                                                                                                                                                  |
| Q17 | Error tracking                                       | Uptime monitor and the daily summary email at launch; an error tracking package (needs your yes) after the pilot.                                                                               |
| Q18 | Pilot terms                                          | Straight to the 14-day trial, no free month, so the ₱399 price is tested from day one. Help mode stays free.                                                                                    |

## 11. By hand: your full list

Never paste a key, token or password in chat, a doc or the repo. Do these after the code for that phase is merged, in this order. Sections 11 and 12 of `launch.md` (staging from phases 1 to 6) come first.

### After phase 7 (on staging)

1. **Meta Business portfolio, Facebook Page, ad account** (`launch.md` section 1) if not yet made.
2. **Pixel ID**: Events Manager › Connect data › Web › "Smart App PH" › copy the ID (`launch.md` 2.1).
3. **Pixel settings** in Events Manager: Automatic events (track without code) **off**; Automatic advanced matching **on** for email and phone only (Q6); Traffic permissions: allow only `webserbisyo.com`.
4. **Conversions API token** (`launch.md` 2.2), only into Railway.
5. **Test event code** (`launch.md` 2.3), only into Railway.
6. **Domain verification** of `webserbisyo.com` in Business settings › Brand safety › Domains; say yes to the TXT record and I add it in Vercel.
7. **Railway staging › Variables**: `META_PIXEL_ID`, `META_CAPI_TOKEN`, `META_TEST_EVENT_CODE`, `META_GRAPH_VERSION` = `v27.0`, `SUPPORT_SESSION_SECRET` (`openssl rand -hex 32`).
8. **Vercel staging dashboard › Environment**: `VITE_META_PIXEL_ID`, `VITE_MESSENGER_URL`.
9. **GCash and Maya receiving accounts**, then Super Admin › Setup (`launch.md` section 6).
10. **Make yourself Super Admin** on staging (`launch.md` section 5).
11. **Test together** (`launch.md` section 7, updated). Don't mark this shop as a test: on staging, test mode already sends everything to Test events only. Private window, ad link, sign up a test shop, Ask to go live, approve, pay ₱399, approve, check each event once in Test events; then open the shop in help mode and send a payment (locked) and check nothing new appears; then test mode off and remove `META_TEST_EVENT_CODE`.

### After phase 8 (live)

1. **Supabase**: new project "Smart App PH LIVE", Singapore, **Pro** (about $25 a month). Settings as D7: custom SMTP through Resend, email confirmation on, 6-digit codes for 600 seconds, leaked-password protection, IP address forwarding, a secret key for Railway, auto-expose new tables off, and Data API off last.
2. **GitHub**: Settings › Environments › `production` › Required reviewers: you; add its 3 secrets (live access token, live database password, live project ref). Then Actions › "Apply migrations to live" › Run › Approve.
3. **Railway**: a production service (the plan size we pick together from staging's use), every variable from `launch.md` sections 11 and 12 and above with live values, a **new** push key pair and new secrets (never staging's), and "wait for checks" on.
4. **Vercel Pro** (about $20 a month): live storefront and dashboard projects (the demo projects stay as they are), their env, "wait for checks" on.
5. **Domains** (`launch.md` section 10) with your DNS yes, and remove the old rsvp domains.
6. **Resend**: confirm `mail.webserbisyo.com` is verified; plan the $20 plan before the third busy shop.
7. **Uptime monitor**: a free account, three checks (API health, `app.`, one shop).
8. **2-step login** on your phone's authenticator app for your Super Admin account (Q16).
9. **Lawyer** checks Terms, Privacy notice, the shop privacy template and the shop data agreement (RA 10173), and whether NPC registration is needed.
10. **Watch the restore drill** run once and read its result.
11. **Acceptance 1 to 8** on your Android and iPhone with me.

### Phase 9 (selling)

1. DTI business name, BIR registration and invoices (ask an accountant about EOPT invoices for a monthly service).
2. A GCash or Maya account that fits business receipts; check its monthly receiving limit.
3. Pick two pilot shops (one food, one retail) and book their setup calls.
4. Ads: payment method on the ad account, one campaign with the ad link, the optimisation event from Q8, a small daily budget.
5. Record the walkthrough video from the script.
6. Every Monday: 30 minutes on the funnel with me.

## 12. Docs to align once approved

`meta.md` (sections 2, 3, 5 rewritten from section 4 here), `launch.md` (new section 13 from section 11 here; sections 3 and 7 updated), `launch-phases.md` (phases 7 to 9 point here; "Still to settle" answered), `api.md` (Undo approval route, plan route notes), `database.md` (`track_events` changes), `decisions.md` (T118 with your answers), `PROGRESS.md`, `CHANGELOG.md`.

## 13. Risks

| Risk                                                                   | What we do                                                                                          |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| You approve a payment 7+ days late, so Meta never sees that Purchase.  | To check sorts oldest first with "Meta counts for N more days"; the daily summary email lists them. |
| Low volume keeps ads in "Learning limited".                            | Optimise on CompleteRegistration first (Q8).                                                        |
| The token is revoked or expires.                                       | Sending stops, a red card on Today and one email; events wait up to 7 days.                         |
| A personal GCash wallet hits its limit or is flagged for business use. | A business-fit account before the pilot (phase 9 step 2).                                           |
| You are the only person who approves.                                  | Reminders and grace days give a week of slack; staff approvers are MVP B.                           |
| A privacy complaint about Meta sharing.                                | Terms and Privacy say it; only hashes go; leads deleted after 180 days; raw IP kept days only.      |
| Help mode misuse or a stolen admin login.                              | 2-step login, a reason, 60 minutes, everything in `audit_log`.                                      |

## Sources

- Meta for Developers, read 2026-11-25 in a real browser: Conversions API "Server Event Parameters", "Customer Information Parameters", "Custom Data Parameters", "fbp and fbc Parameters", "Handling Duplicate Pixel and Conversions API Events", "Using the Conversions API", "Best Practices", "Payload Helper"; Meta Pixel "Advanced Matching", "Tagging SPAs", "Pixel Reference", "Conversion Tracking".
- `webserbisyo/webserbisyo-rsvp` @ 11cb846: `src/lib/meta/capi.ts`, `send-meta-capi-purchase.ts`, `purchase-event-time.ts`, `meta-capi-delivery.ts`, `admin-workflow/payments.ts`, `clients.ts`, `components/dashboard/billing/payment-confirmed-dialog.tsx`, `app/(dashboard)/dashboard/layout.tsx`.
- Our code @ 752d3ae: `apps/dashboard/src/app/meta-pixel.ts`, `features/auth/signup-form.tsx`, `apps/api/src/shop/*`, `packages/core/src/rules/{platform,settings}.ts`, `supabase/migrations/20261117160000_admin_billing_tracking.sql`, `20261121120000_billing_chat_photos.sql`.
- Secondary (A): Meta Business Help on the learning phase; reports on Aggregated Event Measurement; NPC Circular 2022-04; BIR RR 7-2024; Supabase and Railway pricing pages (check at sign-up).
