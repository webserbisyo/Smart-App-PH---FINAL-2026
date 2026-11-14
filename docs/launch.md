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

- The tables for shops' stages, leads, plan payments, the Billing chat, activity, help sessions and Meta events: new migration files with RLS. **You run `pnpm db:push`** after you say yes to each.
- A separate live database (today there is only the dev one).
- The NestJS routes in `docs/api.md` for sign-up, Super Admin and tracking, and the job that sends Meta events and retries failed ones.
- Emails from `codes@mail.webserbisyo.com` through Resend: the sign-up code, "your shop is live", reminders and payment answers (Super Admin › Setup lists them).
- The job that deletes payment photos after 30 days.
