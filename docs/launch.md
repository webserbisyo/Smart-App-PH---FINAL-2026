# Launch guide: every step you do by hand

Phases 1 to 9 are built and merged (T116, T117, T118). The code is done. What is left is what only you can do: accounts, keys, settings, domains, tests on real phones, and selling. This page is the one list, in order. Do the parts top to bottom; each part says when it is done.

**Rules for every step**

- Never paste a key, token or password in chat, a doc, a screenshot or the repo. They go only where the step says (Railway, Vercel, GitHub, your password manager).
- Keep a password manager open (1Password, Bitwarden, or your phone's). Every value marked 🔒 goes there first.
- A DNS change is something you do yourself in Vercel, or you tell me "yes, add the records for X" and I add them with the Vercel connector.
- If a screen looks different from what is written here, the app moved a button. Look for the same word nearby, or send me a screenshot (with no keys on it).

**Addresses we use**

| Address                       | What                                                          | Part |
| ----------------------------- | ------------------------------------------------------------- | ---- |
| `staging-app.webserbisyo.com` | Dashboard on staging (test copy, dev database)                | D    |
| `staging.webserbisyo.com`     | Storefront on staging; shops open at `/kanto-smash` and so on | D    |
| `api-staging.webserbisyo.com` | NestJS API on staging (Railway)                               | C    |
| `app.webserbisyo.com`         | Live dashboard                                                | G    |
| `<slug>.webserbisyo.com`      | Each live shop (main link)                                    | G    |
| `shop.webserbisyo.com/<slug>` | Each live shop (backup link)                                  | G    |
| `api.webserbisyo.com`         | Live API (Railway)                                            | G    |
| `demo.webserbisyo.com`        | The five sample shops on sample data (for selling)            | G    |
| `mail.webserbisyo.com`        | Where our emails come from (Resend)                           | B    |

**Money each month:** Railway Hobby about $5 (staging and live can share it at first), Supabase Pro about $25 (live only), Vercel Pro about $20 (when you take paying shops), Resend free (100 emails a day) until the third busy shop, the domain $12 a year. Check each price on its own pricing page when you sign up.

**Time:** Parts A to E about one afternoon. Part F one hour. Part G one afternoon. Part H is ongoing.

---

## Part A. Let GitHub update the dev database (15 minutes)

The 56 tables are in `supabase/migrations/`, but the dev database (Smart App PH MVP FINAL) does not have them yet. After you add three secrets, every push to `main` applies new migrations to dev by itself. It never touches a live database.

1. Open supabase.com and sign in. Click your avatar (top right) › **Account preferences** › **Access Tokens** › **Generate new token**. Name: `github-migrations`. Expiry: the longest offered. Copy it 🔒.
2. Open the project **Smart App PH MVP FINAL** › **Project Settings** (gear, bottom left) › **Database**. Under **Database password** press **Reset database password**, then **Generate a password**, copy it 🔒, press **Reset password**.
3. Open github.com › `webserbisyo/Smart-App-PH---FINAL-2026` › **Settings** (top tabs) › left side **Secrets and variables** › **Actions** › green **New repository secret**. Add three, one at a time (Name, then Secret, then **Add secret**):
   - `SUPABASE_ACCESS_TOKEN` = the token from step 1
   - `SUPABASE_DB_PASSWORD` = the password from step 2
   - `SUPABASE_DEV_PROJECT_REF` = `kthocqljhgybgstdjhaa`
4. GitHub › **Actions** (top tabs) › left side **Check** › the newest run on `main` › top right **Re-run jobs** › **Re-run all jobs**.
5. Wait about 10 minutes. Open the job **Apply migrations to the dev database**: it lists each migration it applied and ends green.

**Done when** that job is green. Tell me and I check the tables (look only).

---

## Part B. Email: Resend and the dev Supabase login settings (45 minutes)

### B1. Resend account and domain

1. Open resend.com › **Sign up** (use your own email). Confirm the email Resend sends you.
2. Left side **Domains** › **Add domain**. Name: `mail.webserbisyo.com`. Region: **Tokyo (ap-northeast-1)** (closest to the Philippines). Press **Add**.
3. Resend shows a table of DNS records (usually: one **TXT** named `resend._domainkey.mail`, one **MX** named `send.mail`, one **TXT** named `send.mail`). Keep this tab open.
4. In a new tab open vercel.com › your team **Web Serbisyo's projects** › top **Domains** › `webserbisyo.com` › **DNS Records** section. For each row in Resend press **Add** (or fill the form at the top):
   - **Name**: copy the Resend "Name" exactly but **without** `.webserbisyo.com` at the end (for example `resend._domainkey.mail`).
   - **Type**: the same type as Resend (TXT or MX).
   - **Value**: copy-paste Resend's value. For MX, Vercel asks **Priority** separately: use Resend's priority (usually `10`) and put only the host name in Value.
   - TTL: leave the default. **Add**.
   - Or tell me "yes, add the Resend records" and paste only the **Name, Type, Priority and Value** columns (these are not secret).
5. Also add this one in Vercel (it helps Gmail trust our mail): Name `_dmarc.mail`, Type **TXT**, Value `v=DMARC1; p=none;`.
6. Back in Resend › **Domains** › `mail.webserbisyo.com` › **Verify DNS records**. It usually turns **Verified** within 15 minutes (it can take up to 72 hours).

### B2. Two Resend API keys

1. Resend › left side **API Keys** › **Create API key**.
   - Name `supabase-dev-smtp`, Permission **Sending access**, Domain `mail.webserbisyo.com` › **Add**. Copy it 🔒 (Resend shows it only once).
2. Again: name `railway-staging`, **Sending access**, `mail.webserbisyo.com`. Copy it 🔒.

### B3. Dev Supabase: login emails through Resend

Open supabase.com › project **Smart App PH MVP FINAL**.

1. **Authentication** (left) › **Emails** › tab **SMTP Settings** › turn **Enable custom SMTP** on:
   - Sender email: `codes@mail.webserbisyo.com`
   - Sender name: `Smart App PH`
   - Host: `smtp.resend.com` · Port: `465` · Username: `resend` · Password: the `supabase-dev-smtp` key from B2
   - Minimum interval between emails: leave `60` › **Save changes**.
2. **Authentication** › **Rate Limits** › "Rate limit for sending emails": `100` per hour › **Save**. On the same page find **IP Address Forwarding** and turn it **on** › **Save**. (Login limits then count each phone, not Railway's one address.)
3. **Authentication** › **Sign In / Providers** › **Email** (open it):
   - **Confirm email**: on
   - **Email OTP Expiration**: `600` (seconds)
   - **Email OTP Length**: `6`
   - **Save**.
4. **Authentication** › **Emails** › tab **Templates**. Change three templates. In each, replace the whole **Message body** with the text below (keep `{{ .Token }}` exactly), then **Save**:
   - **Confirm signup**, subject `Your Smart App PH code`:
     `<p>Your code is <strong>{{ .Token }}</strong>. It works for 10 minutes.</p><p>If you did not ask for it, ignore this email.</p>`
   - **Magic Link**, subject `Your Smart App PH code`: the same body.
   - **Reset Password**, subject `Your Smart App PH reset code`:
     `<p>Your code to make a new password is <strong>{{ .Token }}</strong>. It works for 10 minutes.</p><p>If you did not ask for it, ignore this email.</p>`
     There must be no link (`{{ .ConfirmationURL }}`) left in any of the three.
5. **Authentication** › **Multi-Factor** › **TOTP (App Authenticator)**: **Enabled** › **Save**. (Super Admin asks for an authenticator code.)
6. **Authentication** › **URL Configuration** › **Site URL**: `https://staging-app.webserbisyo.com` › **Save**.

### B4. Dev Supabase: keys for the server

1. **Project Settings** › **JWT Keys**. If it says you use the **legacy JWT secret**, press **Migrate JWT secret** (or **Start using JWT signing keys**) and follow the two steps it shows. If it already shows signing keys, skip this.
2. **Project Settings** › **API Keys** › section **Secret keys** › **Add new secret key**. Name `railway-staging` › **Create**. Press the eye, copy it (starts with `sb_secret_`) 🔒.
3. Top bar of the project › **Connect** › tab **Connection String** › choose **Transaction pooler**. Copy the URI (port `6543`). Replace `[YOUR-PASSWORD]` with the password from Part A step 2. If the address ends with `?sslmode=...`, delete that part. This full line is `DATABASE_URL` 🔒.
4. **Project Settings** › **Database** › **SSL Configuration** › **Download certificate**. Open the downloaded file in TextEdit; you paste its whole text into Railway in Part C.
5. **Project Settings** › **General**: copy **Project URL** (`https://kthocqljhgybgstdjhaa.supabase.co`). Not secret.

**Done when** Resend shows Verified and you have in your password manager: `supabase-dev-smtp` key, `railway-staging` Resend key, `sb_secret_` key, `DATABASE_URL`, the certificate file.

---

## Part C. Railway: the API on staging (40 minutes)

### C1. Make the secrets you need (on your laptop)

Open Terminal and run these one at a time. Each prints one value; save each 🔒 with the name shown.

```bash
cd ~/Project/Smart-App-PH---FINAL-2026
git stash -u && git pull          # get the newest main (your own changes go to the stash)
pnpm install
openssl rand -hex 32              # save as STOREFRONT_REVALIDATE_SECRET (staging)
openssl rand -hex 32              # save as SERVER_READ_SECRET (staging)
cd apps/api && node -e "import('web-push').then(w => console.log(w.generateVAPIDKeys()))"
```

The last line prints `publicKey` and `privateKey`: save them as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (staging) 🔒. A new pair later means every phone must turn alerts on again, so keep them.

### C2. The Railway project

1. Open railway.com › **Login** › **Login with GitHub**. Then your avatar › **Account Settings** › **Plans** › **Hobby** › add your card.
2. Dashboard › **New** (or **+ New Project**) › **Deploy from GitHub repo**. If the repo is not listed, press **Configure GitHub App** › pick `webserbisyo` › **Only select repositories** › `Smart-App-PH---FINAL-2026` › **Save**, then come back. Pick `webserbisyo/Smart-App-PH---FINAL-2026`. The first build starts at once and fails because nothing is set yet; that is fine.
3. Project name (top left, click it): `smartapp-staging`. Click the service box, then its name › rename to `api`.

### C3. Service settings (click the `api` box › **Settings**)

- **Source** › Branch: `main`. Turn **Wait for CI** on (Railway then deploys only after GitHub's checks pass). If the switch is missing, Railway asks you to accept new GitHub permissions: accept them.
- **Source** › Root Directory: leave empty (the API needs the whole repo).
- **Build** › Custom Build Command: `pnpm --filter "@smartapp/api..." run build`
- **Build** › Watch Paths: `/apps/api/**`, `/packages/core/**`, `/pnpm-lock.yaml` (one per line). Docs-only pushes then skip a deploy.
- **Deploy** › Custom Start Command: `node apps/api/dist/main.js`
- **Deploy** › Regions: **Southeast Asia (Singapore)**.
- **Deploy** › Healthcheck Path: `/health`.
- **Deploy** › Restart Policy: **On Failure**.

### C4. Variables (the `api` box › **Variables** › **Raw Editor**)

Paste this, replace every `<...>` with your saved value, then **Update Variables**. Railway redeploys by itself.

```
APP_ENV=staging
TRUST_PROXY_HOPS=1
DB_POOL_MAX=5
RAILWAY_DEPLOYMENT_DRAINING_SECONDS=15
SUPABASE_URL=https://kthocqljhgybgstdjhaa.supabase.co
SUPABASE_SECRET_KEY=<sb_secret_ key from B4.2>
DATABASE_URL=<transaction pooler line from B4.3>
CORS_ORIGINS=https://staging-app.webserbisyo.com,https://staging.webserbisyo.com
DASHBOARD_URL=https://staging-app.webserbisyo.com
STOREFRONT_URL=https://staging.webserbisyo.com
STOREFRONT_REVALIDATE_SECRET=<from C1>
SERVER_READ_SECRET=<from C1>
VAPID_PUBLIC_KEY=<from C1>
VAPID_PRIVATE_KEY=<from C1>
VAPID_SUBJECT=mailto:codes@mail.webserbisyo.com
RESEND_API_KEY=<railway-staging key from B2>
EMAIL_FROM=Smart App PH <alerts@mail.webserbisyo.com>
ADMIN_EMAIL=<the email you log in with>
META_GRAPH_VERSION=v27.0
```

Then add one more the normal way (it has many lines): **+ New Variable** › Name `DATABASE_CA_CERT` › Value: paste the whole text of the certificate file from B4.4 › **Add**.

Leave `SHOP_DOMAIN` and the other `META_*` values out for now (Part F adds Meta). The API refuses to start if a needed value is missing, and the **Deploy Logs** tab then names it.

### C5. The address

1. `api` › **Settings** › **Networking** › **Public Networking** › **Custom Domain** › `api-staging.webserbisyo.com`. If it asks for a port, pick the one it suggests.
2. Railway shows a **CNAME** (and sometimes a **TXT**) record. Add each in Vercel › **Domains** › `webserbisyo.com` › **DNS Records**: Name `api-staging` (or the TXT name without `.webserbisyo.com`), Type and Value as Railway shows. Or tell me "yes, add the Railway staging records" with the Type, Name and Value.
3. Wait until Railway shows a green check next to the domain (a few minutes).
4. Open `https://api-staging.webserbisyo.com/health` on your phone: it shows `{"ok":true,"app":"Smart App PH"}`.

**Done when** `/health` answers on your phone.

---

## Part D. Vercel: dashboard and storefront on staging (40 minutes)

Make two **new** projects. Do not touch the `smartapp-demo-*` projects: they stay on sample data for selling.

### D1. Staging storefront

1. vercel.com › **Add New…** › **Project** › import `webserbisyo/Smart-App-PH---FINAL-2026`.
2. Project Name `smartapp-staging-storefront`. **Root Directory** › **Edit** › `apps/storefront`. Framework: Next.js (found by itself).
3. **Environment Variables** (add each, then **Deploy**):
   - `NEXT_PUBLIC_APP_ENV` = `production`
   - `NEXT_PUBLIC_DATA_SOURCE` = `api`
   - `NEXT_PUBLIC_API_URL` = `https://api-staging.webserbisyo.com`
   - `NEXT_PUBLIC_DASHBOARD_URL` = `https://staging-app.webserbisyo.com`
   - `SERVER_READ_SECRET` = the same value as in Railway
   - `STOREFRONT_REVALIDATE_SECRET` = the same value as in Railway
   - `ENABLE_EXPERIMENTAL_COREPACK` = `1`
   - Leave `NEXT_PUBLIC_SHOP_DOMAIN` out on staging (staging shops open at `staging.webserbisyo.com/<slug>`).
4. Project › **Settings** › **General** (or **Build and Deployment**) › **Node.js Version** `24.x` › **Save**.
5. **Settings** › **Domains** › **Add Domain** › `staging.webserbisyo.com` › **Add** (Vercel makes the DNS record itself because the domain is on Vercel).
6. **Deployments** › the newest › **⋯** › **Redeploy**.

### D2. Staging dashboard

1. **Add New…** › **Project** › the same repo. Name `smartapp-staging-dashboard`. Root Directory `apps/dashboard`. Framework: Vite.
2. **Environment Variables**:
   - `VITE_APP_ENV` = `production`
   - `VITE_DATA_SOURCE` = `api`
   - `VITE_API_URL` = `https://api-staging.webserbisyo.com`
   - `VITE_STOREFRONT_URL` = `https://staging.webserbisyo.com`
   - `VITE_SAMPLES_URL` = `https://smartapp-demo-storefront.vercel.app` (until Part G gives `demo.webserbisyo.com`)
   - `VITE_MESSENGER_URL` = `https://m.me/<your Page's username>`
   - `ENABLE_EXPERIMENTAL_COREPACK` = `1`
   - Deploy.
3. **Node.js Version** `24.x`, then **Settings** › **Domains** › `staging-app.webserbisyo.com` › **Add**, then **Redeploy**.

### D3. Make yourself Super Admin on staging

1. Open `https://staging-app.webserbisyo.com/signup` and sign up with your own email (the code comes by email from `codes@mail.webserbisyo.com`; check Spam the first time and mark it Not spam).
2. On your laptop, open `apps/api/.env.local` and check it has the **dev** values: `SUPABASE_URL=https://kthocqljhgybgstdjhaa.supabase.co`, `SUPABASE_SECRET_KEY=<the sb_secret_ key>`, `DEMO_PASSWORD=<yours>`, `ADMIN_EMAIL=<your email>`.
3. Terminal, from the repo folder: `pnpm --filter @smartapp/api seed:demo`. It ends with `<your email>: Super Admin`.
4. Log out and log in. You go to the **second step**: install Google Authenticator, Microsoft Authenticator or 1Password on your phone, scan the QR code on screen (or copy the key), type the 6 digits › **Verify**. You land on `/admin`. Every later Super Admin login asks for the 6 digits.
   - Lost phone: Supabase › **Authentication** › **Users** › your account › **Multi-Factor** › delete the factor, then log in and set it up again.
5. `/admin/setup`: Monthly price ₱399, trial 14 days, 6 months ₱1,995 on; your GCash and Maya account name and numbers exactly as the apps show them; Messenger link › **Save**.

### D4. Data API off (last step on dev)

Supabase › project **Smart App PH MVP FINAL** › **Integrations** › **Data API** (on some screens: **Project Settings** › **Data API**) › turn **Enable Data API** off › **Save**. On the same page, **Automatically expose new tables**: off. The apps never call Supabase from the browser (T34), so nothing breaks; if something does, turn it back on and tell me.

**Done when** you are in `/admin` on staging after the 6 digits.

---

## Part E. Test staging together (about 2 hours, with me)

Use one Android phone and one iPhone, plus your laptop. I watch the logs while you tap.

1. **Owner, food shop:** sign up a test owner (a `+food` version of your email, for example `you+food@gmail.com`), make a food shop, add 5 items with photos, set hours, payment methods (upload your GCash QR), then **Ask to go live**. In `/admin`, open it, turn **Test shop** on, then press **Approve and go live**.
2. **Owner, retail shop:** the same with `you+retail@gmail.com` and a retail shop.
3. **Customer (iPhone, Safari):** open `staging.webserbisyo.com/<food slug>`, order pickup with GCash, send a payment photo. On the laptop dashboard: the order appears within 15 seconds, the owner's phone gets a push. Accept, check the photo (Yes), Ready, Complete. The customer gets each update.
4. **Members:** on the customer phone, Join with an email code; earn a stamp on the next order; claim a prize.
5. **News:** Members › News › send one news; the customer phone gets it; tap it.
6. **Install:** on both phones, Add to Home Screen; open it with airplane mode on (you see the offline page).
7. **Export:** Home or Orders › Download; the file arrives.
8. **Help mode:** in `/admin`, open the retail shop › **Open as owner**, type a reason; change one item; leave; check the shop's **Activity** tab.
9. **Plan payment:** in the retail shop, Settings › Plan › send ₱399 by GCash with the receipt photo (send it to yourself); in `/admin` approve it, then press **Undo approval** within 10 minutes and approve again.

**Done when** all nine pass. I write down anything that breaks and fix it before Part G.

---

## Part F. Meta: Pixel and Conversions API (1 hour)

Do this on staging first; live gets the same values in Part G.

### F1. Accounts (if you have none yet)

1. business.facebook.com › **Create account** (the business portfolio "Smart App PH").
2. facebook.com/pages/create › Page "Smart App PH". Its username gives your `m.me/<username>` link.
3. business.facebook.com › **Settings** (gear) › **Accounts** › **Ad accounts** › **Add** › **Create a new ad account** (time zone Asia/Manila, currency PHP).

### F2. The four values

1. **Pixel ID:** business.facebook.com › **Events Manager** › **Connect data** (green +) › **Web** › name `Smart App PH` › **Create**. Skip the install steps (our code does it). Copy the number under the name (not secret).
2. **Settings of that pixel** (Events Manager › the pixel › tab **Settings**):
   - **Automatic events** / "Track events automatically without code": **off**.
   - **Automatic advanced matching**: **on**, and tick only **Email** and **Phone number**.
   - **Traffic permissions** › **Allow list** › add `webserbisyo.com` only.
3. **Conversions API token:** same Settings tab › **Conversions API** › **Set up manually** (or **Generate access token**) › copy it 🔒. If it ever leaks, generate a new one; the old one stops.
4. **Test event code:** the pixel › tab **Test events** › section "Confirm your server's events are set up correctly" › copy the code (like `TEST12345`). Only for testing.
5. **Domain:** business.facebook.com › **Settings** › **Brand safety and suitability** › **Domains** › **Add** › `webserbisyo.com` › choose **DNS TXT record**. Add that TXT in Vercel › **Domains** › `webserbisyo.com` › **DNS Records** (Name `@`, Type TXT, Value from Meta), or tell me "yes, add Meta's TXT". Then press **Verify** in Meta.

### F3. Put them in

- Railway `smartapp-staging` › `api` › **Variables**: `META_PIXEL_ID` = Pixel ID, `META_CAPI_TOKEN` = token, `META_TEST_EVENT_CODE` = test code (`META_GRAPH_VERSION=v27.0` is already there).
- Vercel `smartapp-staging-dashboard` › **Settings** › **Environment Variables**: `VITE_META_PIXEL_ID` = Pixel ID. Then **Deployments** › **Redeploy**.

### F4. Test the events (with me)

1. `/admin/tracking` › turn **Test mode** on › **Send a test event**. Meta › **Test events** shows it within a minute.
2. Private window: `https://staging-app.webserbisyo.com/signup?utm_source=facebook&utm_campaign=test`. Sign up a new test shop (`you+meta@gmail.com`). Test events shows **PageView**, **Lead**, **CompleteRegistration**, once each.
3. **Ask to go live**, then in `/admin` **Approve and go live** (**StartTrial**). Leave **Test shop** off for this one: on staging, test mode already sends every event to Test events only. Pay ₱399 from its Plan page and approve; wait 11 minutes (the Undo window): **AddPaymentInfo**, **Subscribe**, **Purchase** appear once.
4. Send a second payment, approve, press **Undo approval**: nothing new appears in Meta.
5. Turn Test mode off. Railway › delete `META_TEST_EVENT_CODE`. Close the test shop in `/admin`.

The events and their rules are in `docs/meta.md`.

**Done when** every event showed once and the Undo sent nothing.

---

## Part G. Go live (one afternoon)

### G1. Live database (Supabase, about $25 a month)

Make it in its **own organization**, so only the live project is on Pro and dev stays free.

1. supabase.com › top left organization menu › **New organization** › name `Smart App PH Live`, plan **Pro**, add your card.
2. In that organization › **New project**: name `Smart App PH LIVE`, **Generate a password** › copy it 🔒 (`SUPABASE_LIVE_DB_PASSWORD`), Region **Southeast Asia (Singapore)**. Open **Security options** / **Advanced**: untick **Enable Data API** and **Automatically expose new tables** if offered › **Create new project**.
3. Copy the project ref from the address bar (`supabase.com/dashboard/project/<ref>`) 🔒 (`SUPABASE_LIVE_PROJECT_REF`).
4. Repeat B3 and B4 on the live project with these changes:
   - A new Resend key `supabase-live-smtp` for SMTP.
   - Site URL `https://app.webserbisyo.com`.
   - **Authentication** › **Attack Protection** (or **Sign In / Providers** › **Email**) › **Prevent use of leaked passwords**: on (Pro only).
   - Secret key named `railway-live`, and the live transaction pooler line and certificate.
5. **Project Settings** › **Add-ons** / **Database** › **Backups**: check daily backups are listed (Pro has 7 days).

### G2. GitHub environments (the live database only changes when you press Run)

github.com › the repo › **Settings** › left **Environments** › **New environment**.

1. Name `production` › **Configure environment**:
   - **Required reviewers**: tick, add yourself › **Save protection rules**.
   - **Deployment branches and tags** › **Selected branches and tags** › **Add deployment branch or tag rule** › `main`.
   - **Environment secrets** › **Add environment secret**: `SUPABASE_ACCESS_TOKEN` (the Part A token works for every organization), `SUPABASE_LIVE_DB_PASSWORD`, `SUPABASE_LIVE_PROJECT_REF`.
2. **New environment** `restore-drill`: deployment branch `main`; secret `LIVE_DB_URL` = the live **Session pooler** URI (Supabase › **Connect** › **Session pooler**, port 5432, with the password in it) 🔒.
3. Put the tables in the live database: **Actions** › left **Apply migrations to live** › **Run workflow** › branch `main`, type `APPLY` › **Run workflow**. When it waits, open it › **Review deployments** › tick `production` › **Approve and deploy**. It refuses if the Check run on that commit was not green.
4. **Actions** › **Restore drill** › **Run workflow**. Read its summary: every table shows the same rows. It runs by itself at 3:00 AM Manila on the 1st of each month after this.
5. From now on, when I tell you a new migration is on `main`, repeat step 3.

### G3. Live API (Railway)

1. Railway › **New** › **Deploy from GitHub repo** › the same repo › project name `smartapp-live`, service `api`.
2. Settings as in C3 (Wait for CI on, the same build and start commands, Singapore, `/health`).
3. Make **new** secrets (C1: two `openssl` values and a new VAPID pair), a new Resend key `railway-live`. Never reuse staging's.
4. Variables (Raw Editor), like C4 but:
   - `APP_ENV=production`
   - `SUPABASE_URL` = the live Project URL, `SUPABASE_SECRET_KEY` = `railway-live`, `DATABASE_URL` and `DATABASE_CA_CERT` = live values
   - `CORS_ORIGINS=https://app.webserbisyo.com,https://shop.webserbisyo.com`
   - `SHOP_DOMAIN=webserbisyo.com`
   - `DASHBOARD_URL=https://app.webserbisyo.com`, `STOREFRONT_URL=https://shop.webserbisyo.com`
   - `META_PIXEL_ID`, `META_CAPI_TOKEN`, `META_GRAPH_VERSION=v27.0` (no test code)
5. Custom domain `api.webserbisyo.com`, add Railway's record in Vercel DNS (as C5), check `https://api.webserbisyo.com/health`.
6. When staging and live both run, Railway › your avatar › **Usage**: check the month's estimate. Tell me if it passes $5.

### G4. Live sites (Vercel Pro, about $20 a month)

1. Vercel › team **Settings** › **Billing** › upgrade to **Pro** (the free Hobby plan is for non-commercial use).
2. Two new projects as in D1 and D2, named `smartapp-live-storefront` and `smartapp-live-dashboard`, with these differences:
   - Storefront: `NEXT_PUBLIC_API_URL=https://api.webserbisyo.com`, `NEXT_PUBLIC_DASHBOARD_URL=https://app.webserbisyo.com`, `NEXT_PUBLIC_SHOP_DOMAIN=webserbisyo.com`, the **live** `SERVER_READ_SECRET` and `STOREFRONT_REVALIDATE_SECRET`.
   - Dashboard: `VITE_API_URL=https://api.webserbisyo.com`, `VITE_STOREFRONT_URL=https://shop.webserbisyo.com`, `VITE_SAMPLES_URL=https://demo.webserbisyo.com`, `VITE_META_PIXEL_ID`, `VITE_MESSENGER_URL`.
3. Both live projects › **Settings** › **Deployment Checks** › **Add Checks** › GitHub › tick **Lint, Check, Build & Scan** and **API integration tests** › **Save**. A red build then never reaches the live addresses.
4. The security headers come from the repo; nothing to set.

### G5. Domains

1. `smartapp-live-storefront` › **Settings** › **Domains** › **Add Domain**: `*.webserbisyo.com`, then again `shop.webserbisyo.com`.
2. `smartapp-live-dashboard` › **Domains** › `app.webserbisyo.com`.
3. `smartapp-demo-storefront` (the sample one) › **Domains** › `demo.webserbisyo.com`. Then in `smartapp-staging-dashboard` change `VITE_SAMPLES_URL` to `https://demo.webserbisyo.com` and redeploy.
4. Close rsvp: the rsvp project › **Settings** › **Domains** › remove `rsvp.webserbisyo.com` and `*.rsvp.webserbisyo.com`; then Vercel › **Domains** › `webserbisyo.com` › **DNS Records**: delete any row named `rsvp`.
5. Check on your phone: `demo.webserbisyo.com/kanto-smash` shows the sample shop; `app.webserbisyo.com` shows the login.

### G6. You on live

1. Sign up at `app.webserbisyo.com/signup` with your own email.
2. On the laptop, make `apps/api/.env.live.local` (git ignores every `.env*` file) with the **live** `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, a `DEMO_PASSWORD` and `ADMIN_EMAIL`. Then in Terminal: `cd apps/api && node --env-file=.env.live.local scripts/seed-demo-accounts.ts`. Delete `.env.live.local` after.
3. Log out, log in, set up the authenticator again (live is a new account; your app then shows two "Smart App PH" entries, name them Staging and Live).
4. `/admin/setup` as in D3 step 5.

### G7. Watching

1. uptimerobot.com › free account › **New monitor** × 3, type **HTTP(s)**, every 5 minutes, alert to your email:
   `https://api.webserbisyo.com/health`, `https://app.webserbisyo.com`, `https://shop.webserbisyo.com/<your first shop>` (add the third once a shop is live).
2. The API emails you an 8:00 AM Manila summary every day (jobs, emails, Meta). No email by 8:30 = tell me.

### G8. Before the first paying shop

1. **Terms and Privacy notice:** pages at `webserbisyo.com/terms` and `webserbisyo.com/privacy`. Have someone who knows the Data Privacy Act (RA 10173) check them, the shop privacy template and the shop data agreement, and whether NPC registration is needed. They must say we share hashed contact details with Meta for our own ads.
2. **Optional load test on staging:** a shop marked as test, then the `docker run` command at the top of `tooling/load/storefront.js` (needs Docker Desktop). Close the test orders after.
3. **Acceptance 1 to 8** (`docs/blueprints/A-mvp.md` section 5) on your Android and iPhone with me, on live, with a shop marked as test.

**Done when** acceptance passes on live. You can take paying shops.

---

## Part H. Selling

1. **Business papers:** DTI business name, BIR registration and invoices (ask an accountant about EOPT invoices for a monthly service).
2. **Receiving money:** a GCash or Maya account that fits business receipts; check its monthly receiving limit. Put the same name and numbers in `/admin/setup`.
3. **Two pilot shops** (one food, one retail): book their setup calls; they go straight to the trial.
4. **QR posters:** in each pilot shop, Settings › Shop › **Print A4 poster** (or the A6 card for the counter).
5. **Ads:** Meta Ads Manager › add a payment method to the ad account › one campaign, goal **Leads**, optimise on **CompleteRegistration** first, a small daily budget. Ad link:
   ```
   https://app.webserbisyo.com/signup?utm_source=facebook&utm_campaign={{campaign.name}}
   ```
   Meta fills in the campaign name and its click id; `/admin/tracking` then shows which ad brings paying shops.
6. **Words:** record the 60-second video and use the Messenger replies in `docs/sales-kit.md`; `/admin/setup` › **Sample shops to send** › **Copy the reply** gives the first message with every link.
7. **Every Monday:** 30 minutes on the funnel with me.

---

## Reference

### What Meta receives

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

Purchase and Subscribe carry the time the owner sent the payment and wait out the 10-minute Undo. Nothing is sent for demo shops, shops marked as test, Super Admin or help mode. Details: `docs/meta.md`.

### Every setting, by place

| Name                                                                     | Where                                 | Secret  | Staging               | Live              |
| ------------------------------------------------------------------------ | ------------------------------------- | ------- | --------------------- | ----------------- |
| `SUPABASE_ACCESS_TOKEN`                                                  | GitHub repo secret + `production` env | yes     | Part A                | same token        |
| `SUPABASE_DB_PASSWORD`, `SUPABASE_DEV_PROJECT_REF`                       | GitHub repo secrets                   | yes     | Part A                | n/a               |
| `SUPABASE_LIVE_DB_PASSWORD`, `SUPABASE_LIVE_PROJECT_REF`                 | GitHub `production` env               | yes     | n/a                   | G2                |
| `LIVE_DB_URL`                                                            | GitHub `restore-drill` env            | yes     | n/a                   | G2                |
| `APP_ENV`                                                                | Railway                               | no      | `staging`             | `production`      |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`                                    | Railway                               | key     | dev project           | live project      |
| `DATABASE_URL`, `DATABASE_CA_CERT`                                       | Railway                               | yes     | dev pooler            | live pooler       |
| `CORS_ORIGINS`                                                           | Railway                               | no      | staging-app + staging | app + shop        |
| `SHOP_DOMAIN`                                                            | Railway                               | no      | empty                 | `webserbisyo.com` |
| `DASHBOARD_URL`, `STOREFRONT_URL`                                        | Railway                               | no      | staging-app, staging  | app, shop         |
| `STOREFRONT_REVALIDATE_SECRET`, `SERVER_READ_SECRET`                     | Railway + Vercel storefront           | yes     | C1                    | new pair          |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`                 | Railway                               | private | C1                    | new pair          |
| `RESEND_API_KEY`, `EMAIL_FROM`                                           | Railway                               | key     | `railway-staging`     | `railway-live`    |
| `ADMIN_EMAIL`                                                            | Railway + laptop                      | no      | your email            | your email        |
| `META_PIXEL_ID`, `META_CAPI_TOKEN`, `META_GRAPH_VERSION`                 | Railway                               | token   | Part F                | same              |
| `META_TEST_EVENT_CODE`                                                   | Railway                               | no      | only while testing    | never             |
| `TRUST_PROXY_HOPS`, `DB_POOL_MAX`, `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` | Railway                               | no      | `1`, `5`, `15`        | same              |
| `NEXT_PUBLIC_*` (storefront)                                             | Vercel storefront                     | no      | D1                    | G4                |
| `VITE_*` (dashboard)                                                     | Vercel dashboard                      | no      | D2                    | G4                |

The demo projects (`smartapp-demo-storefront`, `smartapp-demo-dashboard`) keep sample data: never give them API values. How they were made: `docs/previews.md`.
