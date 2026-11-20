---
name: smartapp-platform
description: Platform technology rules for Smart App PH (the Platform Technologies course applied to Node, pnpm and Turborepo, GitHub Actions, Vercel, Railway and Supabase). Use it when you touch versions, packages, env variables, CI workflows, build or deploy settings, hosting, regions, the database connection, backups, health checks, timed jobs, logs or costs, and before anything goes live.
---

# Smart App PH platform rules (Platform Technologies)

The founder runs this alone, on a slow Mac, on free and cheap tiers. The platform has to be boring: pinned versions, the same settings in every environment, checks that run in CI instead of on the laptop, and a way back from every change. This skill turns the Platform Technologies course (operating systems and runtimes, processes and resources, networks, cloud service models, environments, deployment, monitoring and recovery) into rules for our stack.

AGENTS.md wins over this skill (rule 9 secrets, rule 10 packages, rule 8 database).

## 1. What runs where

| Part                    | Service (model)           | Region      | Notes                                                                |
| ----------------------- | ------------------------- | ----------- | -------------------------------------------------------------------- |
| Storefront (Next.js)    | Vercel (PaaS)             | global edge | one project, root `apps/storefront`                                  |
| Dashboard (Vite SPA)    | Vercel (static)           | global edge | one project, root `apps/dashboard`, SPA rewrite in `vercel.json`     |
| API (NestJS)            | Railway (PaaS, container) | Singapore   | from the first wired area; Hobby plan, check pricing then            |
| Postgres, Auth, Storage | Supabase (managed DBaaS)  | Singapore   | dev = "Smart App PH MVP FINAL" (free); live = a new Pro project (D4) |
| Email                   | Resend (SaaS)             |             | `codes@mail.webserbisyo.com`; custom SMTP for Supabase Auth          |
| CI                      | GitHub Actions            |             | `.github/workflows/check.yml`                                        |

Keep the API and the database in the same region (Singapore): each request crosses browser → Railway → Supabase, so distance is paid twice.

## 2. Runtimes and versions

- Node 24.14 (an LTS line), engines `>=24.14 <25`, `engineStrict` on. A package that needs a newer 24.x is pinned to an older release (T19), never forced with `packageExtensions`.
- pnpm 12 with settings only in `pnpm-workspace.yaml` (`minimumReleaseAge` 7 days, `allowBuilds`, `catalog`); `.npmrc` is ignored. Exact versions, no `^` (rule 10). A new package needs the founder's yes.
- Postgres 17 on Supabase (no `uuidv7()` until 18).
- The current pins are in `docs/blueprints/foundation.md` section 2; update that table when a version changes.
- The founder's Mac runs macOS 12.7: Playwright's Chromium won't run there, so e2e and the UI scan run in CI. If a tool fails on the Mac, stop and report; don't work around it.

## 3. Environments

| Name        | Where                                    | Data                 | `APP_ENV`        |
| ----------- | ---------------------------------------- | -------------------- | ---------------- |
| development | the founder's Mac or a cloud session     | mock or dev database | `development`    |
| preview     | Vercel preview builds, public demo links | sample data only     | `preview` (T100) |
| production  | live domains                             | live database        | `production`     |

- Each app checks its env with Zod at start and refuses to boot with a bad value (rule 9). Only `.env.example` is committed; values live in Vercel, Railway and GitHub secrets.
- Preview gates are written inline (`import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'preview'`) so the bundler removes them from live builds.
- Dev may pause after 7 quiet days on the free plan; the live project never runs on free (no downloadable backups).

## 4. Processes, connections and resources

- **Database connection**: the API is a persistent server on an IPv4 network, so it uses Supabase's shared pooler in **session mode (port 5432)** (database.md). Transaction mode (6543) is for serverless and doesn't support prepared statements.
- One transaction per request, tenant set with `set local` (`smartapp-data` section 6); a pool sized for the plan's connection limit, never a new client per request.
- **Graceful shutdown**: on deploy Railway sends `SIGTERM`; call `app.enableShutdownHooks()` in `main.ts` and close the pool in `onModuleDestroy`, so in-flight orders finish. (Not in `main.ts` yet: add it with the first wired area.)
- **Health check**: `GET /health` (Terminus, `@Public()`) returns 200 when the app and the database answer; set it as Railway's healthcheck path so a bad deploy never takes traffic (Railway waits up to 300 s by default).
- **Limits**: JSON body limit 100 kB (foundation section 8); uploads go straight to Storage with a signed URL, never through the API's memory.
- **Timed jobs** run inside the API with `@nestjs/schedule` (D5) and an advisory lock, so two copies never run the same job. No pg_cron, pg_net or edge functions (rule 13).

## 5. CI/CD

- Every push to `main` runs Check: install, audit, format, `pnpm check`, build, JS budget, build scan, e2e, UI scan; then pgTAP; then CI applies new migrations to **dev only** (D9).
- The laptop runs only light checks; heavy checks run in CI or a cloud session (T40).
- In a cloud session: root `pnpm build` may fail, use `pnpm -r run build`; Playwright uses `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`.
- Never weaken a check, eslint config or tsconfig to go green (rule 4). Never skip a test.

## 6. Monitoring and logs

- Logs are for operators: request id, route, status, duration, tenant id. **No customer names, phones, emails, addresses or tokens** (rule 12).
- Watch: Railway logs and metrics, Supabase advisors (security and performance), Vercel runtime errors, Resend delivery, the Meta Events Manager test view (launch.md section 7).
- An alert the founder can act on beats a dashboard nobody opens: start with Railway's failed-deploy email and Supabase usage emails.

## 7. Backup, recovery and rollback

- Database: Pro daily backups kept 7 days on the live project (D4); Storage files are **not** in those backups, so the weekly bucket copy and the shop export (T66) cover them.
- Code: every change is a commit on `main`; roll back by reverting the commit and redeploying. Vercel and Railway can promote the previous deploy in one click.
- Migrations: never edited once applied; a fix is a new migration (rule 8).
- Write down how to restore before launch (`docs/launch.md`); a backup that was never restored is a hope, not a backup.

## 8. Cost

- Know each line before launch: Supabase Pro (about US$25 a month, D4), Railway Hobby (usage based), Vercel (Pro before going live, A-mvp section 6), Resend (free tier first), domain. Keep the list in `docs/launch.md`.
- Free tiers have hard edges (Supabase free: 500 MB database, 1 GB storage, pauses after 7 quiet days). Check usage monthly.

## Before you say done

- [ ] Versions pinned exactly and listed in `foundation.md` section 2 if they changed
- [ ] New env values are in each app's Zod env schema and `.env.example`, never committed with values
- [ ] The change works in development, preview and production modes (no preview tool leaks into live)
- [ ] CI is green; nothing was weakened or skipped
- [ ] Logs carry no customer data; the health check still passes
- [ ] There is a way back (revert, previous deploy, backup)

## Sources (opened 2026-11-20 unless marked)

- Node.js releases (v24 "Krypton" is LTS): https://nodejs.org/en/about/previous-releases
- NestJS, Lifecycle events and application shutdown (`enableShutdownHooks`): https://docs.nestjs.com/fundamentals/lifecycle-events
- Railway, Healthchecks (default timeout 300 s): https://docs.railway.com/reference/healthchecks
- Supabase, Connecting to Postgres (session vs transaction pooler): https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase, Backups: https://supabase.com/docs/guides/platform/backups
- Supabase free plan limits: read 2026-11-15 for the database blueprint (`/mnt/project-files/database/working-notes.md`)
- Cloud service models (IaaS, PaaS, SaaS), processes and signals, twelve-factor config: standard course material, not looked up (12factor.net blocked from the cloud session)
