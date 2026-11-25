# Before launch: what you need

Everything the founder has to get, set or do by hand before Smart App PH takes its first paying shop. Decisions T88 to T92.

**Where we are (2026-11-14):** the screens are done with sample data: Super Admin at `/admin`, the sign-up page, the Go live card, the Billing chat and help mode. The NestJS routes and the database tables behind them (listed in `docs/api.md`, "Sign-up and going live" and "Super Admin") come next, area by area. Until then nothing reaches Meta and no real shop is created. You can collect everything below now.

## 1. Accounts to have

| What                               | Why                                                                                             | Where                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Meta Business portfolio            | Owns the Pixel, the ad account and the Page                                                     | business.facebook.com                                                             |
| Facebook Page for Smart App PH     | Ads run from it; its Messenger link is on the sign-up page                                      | facebook.com/pages/create                                                         |
| Meta ad account                    | To run the ads                                                                                  | Business settings › Accounts › Ad accounts                                        |
| Meta Pixel (Meta calls it dataset) | One ID for the browser pixel and the Conversions API                                            | Events Manager › Connect data › Web                                               |
| GCash and Maya receiving accounts  | Where owners send ₱399                                                                          | Your phone; the name must match what you type in Setup                            |
| Terms and Privacy notice pages     | The sign-up checkbox links to them, and they must say we share hashed contact details with Meta | Your own pages, for example `webserbisyo.com/terms` and `webserbisyo.com/privacy` |

The Terms and Privacy notice should be checked by someone who knows the Data Privacy Act (RA 10173). We are not lawyers.

## 2. Meta: the 4 values

Do these in Meta Events Manager while signed in to your business portfolio.

1. **Pixel ID.** Events Manager › Connect data › Web › name it "Smart App PH" › Create. Skip the install steps (our code does it). Copy the number under the name. It is not secret.
2. **Conversions API token.** Open the pixel › Settings › Conversions API › Set up manually › Generate access token. Copy it once and keep it only in Railway (step 4). **Never paste it in chat, Slack, a doc or the repo.** If it leaks, generate a new one: the old one stops working.
3. **Test event code.** Open the pixel › Test events › Confirm your server's events › copy the code (looks like `TEST12345`). Only for testing; remove it after (step 7).
4. **Domain.** Business settings › Brand safety › Domains › Add `webserbisyo.com`. Meta shows a DNS TXT record. Tell me and I add it in Vercel (DNS changes need your yes), or add it yourself in Vercel › Domains › webserbisyo.com › DNS records. Then press Verify in Meta.

Graph API version: `v27.0` (what Meta's docs show today). Change `META_GRAPH_VERSION` when Meta retires it; nothing else changes.

## 3. Your ads

Use the sign-up page as the ad's link, with the campaign name in it:

```
https://app.webserbisyo.com/signup?utm_source=facebook&utm_campaign={{campaign.name}}
```

Meta fills in `{{campaign.name}}` and adds its own click id. The page keeps both for 90 days on that phone, so Super Admin › Tracking shows which ad brings paying shops. Pick **Leads** or **Sales** as the goal; the events below are what Meta optimises on.

| Event                | When                                      | Sent from        |
| -------------------- | ----------------------------------------- | ---------------- |
| PageView             | Someone opens the sign-up page            | browser + server |
| Lead                 | Step 1 done (name, email, mobile)         | browser + server |
| CompleteRegistration | Email code done, shop made                | browser + server |
| Contact              | Tap on Ask us on Messenger                | browser + server |
| SubmitApplication    | The owner taps Ask to go live             | server           |
| StartTrial           | You approve the shop                      | server           |
| AddPaymentInfo       | The owner sends a payment                 | server           |
| Subscribe            | You approve their first payment           | server           |
| Purchase             | You approve any payment (with the amount) | server           |

A payment you record by hand goes to Meta as "other" (not from the website). Browser and server send the same event id, so Meta counts each once.

## 4. Where each value goes

| Name                     | App       | Put it in                                | Secret? | Value                                                       |
| ------------------------ | --------- | ---------------------------------------- | ------- | ----------------------------------------------------------- |
| `VITE_META_PIXEL_ID`     | dashboard | Vercel › dashboard project › Environment | no      | Pixel ID from step 2.1                                      |
| `VITE_MESSENGER_URL`     | dashboard | Vercel › dashboard project › Environment | no      | `https://m.me/<your page name>`                             |
| `META_PIXEL_ID`          | api       | Railway › api service › Variables        | no      | same Pixel ID                                               |
| `META_CAPI_TOKEN`        | api       | Railway › api service › Variables        | **yes** | token from step 2.2                                         |
| `META_TEST_EVENT_CODE`   | api       | Railway › api service › Variables        | no      | code from step 2.3, only while testing                      |
| `META_GRAPH_VERSION`     | api       | Railway › api service › Variables        | no      | `v27.0`                                                     |
| `SUPPORT_SESSION_SECRET` | api       | Railway › api service › Variables        | **yes** | run `openssl rand -hex 32` in Terminal and paste the result |
| `ADMIN_EMAIL`            | api       | your laptop's `apps/api/.env.local` only | no      | the email you log in with                                   |

The names are already in `apps/dashboard/.env.example` and `apps/api/.env.example`. Never commit a `.env.local`.

## 5. Make yourself Super Admin

1. Sign up (or log in once) on the dashboard with your own email.
2. On your laptop, add `ADMIN_EMAIL=you@example.com` (your email) to `apps/api/.env.local`.
3. Run `pnpm --filter @smartapp/api seed:demo`. It prints `you@example.com: Super Admin`.
4. Log out and log in again. You land on `/admin`. Anyone else who opens `/admin` sees Not found.

## 6. Super Admin › Setup

Open `/admin/setup` and fill in:

- Monthly price: ₱399. Free trial days: 14. 6 months, 1 free: on (₱1,995).
- Account name, GCash number and Maya number exactly as the apps show them, so owners trust the name they see.
- Messenger link: your Page's `m.me` link.

## 7. Test before the first ad

1. Super Admin › Tracking: turn **Test mode** on and press **Send a test event**. In Meta Events Manager › Test events you should see it within a minute.
2. Open the sign-up page in a private window with the ad link from step 3 and sign up a test shop yourself. You should see PageView, Lead and CompleteRegistration in Test events, once each.
3. In Super Admin, approve the test shop (StartTrial), then pay ₱399 from its Plan page and approve it (AddPaymentInfo, Subscribe, Purchase).
4. Turn Test mode off, remove `META_TEST_EVENT_CODE` from Railway, close the test shop and delete it.

## 8. Still needed before the first paying shop

These are from earlier decisions and are not done yet:

- ~~The tables for shops' stages, leads, plan payments, the Billing chat, activity, help sessions and Meta events.~~ Done 2026-11-17 (decision T96): all 53 tables are in `supabase/migrations/`. They reach the dev database by themselves once you add the 3 secrets in section 9.
- A separate live database (today there is only the dev one).
- The NestJS routes in `docs/api.md` for sign-up, Super Admin and tracking, and the job that sends Meta events and retries failed ones.
- Emails from `codes@mail.webserbisyo.com` through Resend: the sign-up code, "your shop is live", reminders and payment answers (Super Admin › Setup lists them).
- The job that deletes payment photos after 30 days.
- Forgot password (decision T108): Supabase › Authentication › Emails › **Reset password**. Replace the link with the code: put `{{ .Token }}` in the message (for example "Your code is {{ .Token }}"), then Save. Without it the owner gets a link and the `/forgot` page has no code to type.

## 9. Let GitHub update the dev database (decision T96, D9)

After every push to `main`, once the checks and the 99 database tests pass, GitHub applies any new migration to the **dev** database (Smart App PH MVP FINAL). It never touches a live database. Until you add these 3 secrets the step says "skipping" and nothing happens.

1. Supabase › your account menu (top right) › **Account preferences** › **Access Tokens** › **Generate new token**. Name it `github-dev-migrations`. Copy it once.
2. Supabase › project **Smart App PH MVP FINAL** › **Project Settings** › **Database** › **Database password**. If you no longer have it, press **Reset database password**, copy the new one and keep it in your password manager.
3. GitHub › `webserbisyo/Smart-App-PH---FINAL-2026` › **Settings** › **Secrets and variables** › **Actions** › **New repository secret**, three times:
   - `SUPABASE_ACCESS_TOKEN` = the token from step 1
   - `SUPABASE_DB_PASSWORD` = the password from step 2
   - `SUPABASE_DEV_PROJECT_REF` = `kthocqljhgybgstdjhaa`
4. GitHub › **Actions** › the latest **Check** run on `main` › **Re-run all jobs**. The job "Apply migrations to the dev database" lists the migrations it applies. Tell me when it is green and I check the tables with the Supabase connector (look only).

Never paste the token or the password in chat, a doc or the repo. If one leaks, make a new one and replace the secret.

## 10. Domains (decision T105, do this in Launch phase 8)

Each shop opens at `<slug>.webserbisyo.com`; `shop.webserbisyo.com/<slug>` is the backup. `webserbisyo.com` already uses Vercel's nameservers, so Vercel makes the certificates by itself.

1. Vercel › the live **storefront** project › **Settings** › **Domains** › **Add**: `*.webserbisyo.com`, then **Add** again: `shop.webserbisyo.com`.
2. Vercel › the live **dashboard** project › **Settings** › **Domains** › **Add**: `app.webserbisyo.com`.
3. Railway › api service › **Settings** › **Networking** › **Custom domain**: `api.webserbisyo.com`. Railway shows the DNS records to add; add them in Vercel › **Domains** › `webserbisyo.com` › **DNS records**.
4. Close rsvp: Vercel › the rsvp project › **Settings** › **Domains** › remove `rsvp.webserbisyo.com` and `*.rsvp.webserbisyo.com`. Then remove any DNS records left for `rsvp` under `webserbisyo.com` › **DNS records**.
5. Open `kanto-smash.webserbisyo.com` and `shop.webserbisyo.com/kanto-smash` on your phone: both must show the same shop.

Every DNS change needs your yes; I can do steps 1, 2 and 4 with the Vercel connector once you say yes.

## 11. Staging setup after launch phases 1 to 3 (decision T116)

Phases 1 to 3 are built and merged. The founder does these steps later, in this order, once all the code is in. Until then everything runs on a laptop or in CI. Never paste a key, token or password in chat, a doc or the repo.

1. **Resend:** create the account, add the domain `mail.webserbisyo.com` and say yes to its DNS records (Vercel › Domains › `webserbisyo.com` › DNS records).
2. **Supabase dev › Authentication › Emails:**
   - SMTP Settings: turn on custom SMTP and use Resend (host `smtp.resend.com`, port 465, user `resend`, password = a Resend API key), sender `codes@mail.webserbisyo.com`.
   - Rate Limits: emails sent per hour = 100.
   - Email OTP: length 6 digits, expires in 600 seconds.
   - Templates: show only the code (`{{ .Token }}`), with no link. Do the same for Reset password (section 8).
3. **Supabase dev › Project Settings:**
   - JWT Keys: if it still shows the legacy secret, switch to the new signing keys.
   - API Keys: create a **secret key** (`sb_secret_...`) named `staging`. Paste it only into Railway (step 5).
4. **IP address forwarding (`sb-forwarded-for`):** Supabase dev › Authentication › Rate Limits › **IP Address Forwarding** › on. This makes login limits count each phone, not Railway's one address.
5. **Railway:** sign up for Hobby (about $5 a month), then New project › Deploy from GitHub repo › `webserbisyo/Smart-App-PH---FINAL-2026`, region Singapore. The env list (names only; values come from Supabase and your password manager):
   - `APP_ENV` = `staging`, `TRUST_PROXY_HOPS` = `1`, `DB_POOL_MAX` = `5`
   - `SUPABASE_URL` = the dev project URL, `SUPABASE_SECRET_KEY` = the key from step 3
   - `DATABASE_URL` = Supabase dev › Connect › Transaction pooler (port 6543), without `sslmode`
   - `DATABASE_CA_CERT` = Supabase dev › Database settings › SSL Configuration › Download certificate
   - `CORS_ORIGINS` = `https://staging-app.webserbisyo.com`
   - `ADMIN_EMAIL` = your login email; leave the `META_*` values empty
6. **DNS:** say yes to `api-staging.webserbisyo.com` (Railway) and `staging-app.webserbisyo.com` (the dashboard on Vercel). Claude adds them with the Vercel connector after your yes.
7. **Last:** Supabase dev › Data API › off. The apps never call Supabase from the browser (decision T34), so nothing breaks.

**Then we test together on staging:** log in from an iPhone in Safari, and set up one food shop and one retail shop from sign-up to an edited storefront, on a phone and a laptop.

## 12. Staging setup after launch phases 4 to 6 (decision T117)

Phases 4 to 6 are built (PR #49). Do these after section 11, in this order. Never paste a key, token or password in chat, a doc or the repo.

1. **Push keys (one pair for every shop):** on your laptop, in `apps/api`, run `node -e "import('web-push').then(w => console.log(w.generateVAPIDKeys()))"`. Put the two values only into Railway (step 4). Keep a copy in your password manager: a new pair means every phone must turn alerts on again.
2. **Resend API key for the owner's emails:** Resend › API Keys › Create (sending access, domain `mail.webserbisyo.com`). Paste it only into Railway (step 4).
3. **Supabase dev › Authentication › Emails › Templates:** members log in with a 6-digit code too. In **Magic Link** and **Confirm signup**, show only the code (`{{ .Token }}`), with no link, like the templates in section 11.
4. **Railway › api › Variables:** add
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (step 1) and `VAPID_SUBJECT` = `mailto:codes@mail.webserbisyo.com`
   - `RESEND_API_KEY` (step 2) and `EMAIL_FROM` = `Smart App PH <alerts@mail.webserbisyo.com>`
   - `DASHBOARD_URL` = `https://staging-app.webserbisyo.com` (links in the owner's pushes and emails)
   - `STOREFRONT_URL` = the storefront's staging address (cached pages refresh, and "Start with samples" reads the sample photos from it)
   - `STOREFRONT_REVALIDATE_SECRET` and `SERVER_READ_SECRET`: run `openssl rand -hex 32` twice, one value each
   - `SHOP_DOMAIN` = `webserbisyo.com`
   - `ADMIN_EMAIL` stays your login email: an owner's "Delete account" request is emailed there.
5. **Vercel › storefront project › Environment (staging):** `NEXT_PUBLIC_DATA_SOURCE` = `api`, `NEXT_PUBLIC_API_URL` = `https://api-staging.webserbisyo.com`, `NEXT_PUBLIC_SHOP_DOMAIN` = `webserbisyo.com`, and the same `SERVER_READ_SECRET` and `STOREFRONT_REVALIDATE_SECRET` as Railway.
6. **Vercel › dashboard project › Environment (staging):** `VITE_DATA_SOURCE` = `api`, `VITE_API_URL` = `https://api-staging.webserbisyo.com`.

The demo links (`smartapp-demo-*.vercel.app`) keep sample data: change nothing there.

**Then we test together on staging:** acceptance 1 to 4 (`A-mvp.md` section 5) with a real iPhone and Android phone: place an order, send a payment photo, accept it on the dashboard, get the pushes, join as a member and earn a stamp, send one News, and download an export.

## 13. Phases 7 to 9: your list (proposed)

The full by-hand list for phases 7 (Meta, payments, Super Admin), 8 (live) and 9 (selling) is in `blueprints/phases-7-9.md` section 11, in order. It moves here once you approve that plan.
