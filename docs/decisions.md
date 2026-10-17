# Decisions

Current decisions only. One line each; newest at the bottom of its section. Foundation decisions F1 to F10 are in `blueprints/foundation.md`.

## Product

- P1 Two shop kinds at launch: food and retail. Words differ by vocab (Menu or Products), never by `if` on the type.
- P2 Members and the stamp card are the main selling point; 1 welcome stamp on join.
- P3 Payments: cash, COD, GCash, Maya, bank with proof checked by the owner. Only GCash, Maya and bank orders expire unpaid.
- P4 Storefront is light mode only; dashboard has light and dark.
- P5 Demo shops: the 5 in `demo-shops.md`.

## Tech

- T1 Supabase project `smartapp-dev` (Singapore) is the only database until launch.
- T2 Sign-up email confirmation is off on `smartapp-dev` until Resend SMTP is set up; on in production.
- T3 Demo owner password comes from the `DEMO_PASSWORD` env variable; never in the repo (public repo).
- T4 `turbo.json` sets `"agentGuidance": false` so Turborepo does not write into `AGENTS.md`.
- T5 TypeScript stays on 6.0.x until typescript-eslint and NestJS support 7.
- T6 One Next.js storefront, no separate Vite PWA (one codebase; shares cart, login and member card). Serwist makes it installable, precaches the app shell and caches shop pages (stale-while-revalidate): the installed app opens the saved copy instantly and refreshes menu, stock and open/closed in the background. Stock, prices and open/closed are always fetched fresh before checkout. Show "Add to home screen" after a customer joins or places a first order. Vite is only for the dashboard (behind login, no SEO needs). From general knowledge of both tools, not measured on our app.

## Open

- Price: ₱599 or ₱799 per month.
