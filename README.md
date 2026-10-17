# Smart App PH

Ordering app (storefront) and owner dashboard for small Philippine shops.

- Rules for agents: `AGENTS.md`
- Plan: `docs/blueprints/` (foundation, A-mvp, B-full); UX rules `docs/ux.md`; API contract `docs/api.md`
- Status: `docs/PROGRESS.md`

## Run it

```
pnpm install
pnpm dev        # storefront http://localhost:3000, dashboard http://localhost:5173, api http://localhost:4000
pnpm check      # typecheck, lint, test
```

Env files: copy each `apps/*/.env.example` to `.env.local` and fill in the values. Never commit them.
