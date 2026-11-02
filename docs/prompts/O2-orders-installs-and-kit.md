# O2 Orders: install the board, calendar and booking parts, and show them on /kit

Prompt 2 of 6 for the Orders page. 2026-11-02. Paste after O1's cloud check is green.

Copy everything below the line into Antigravity.

---

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

You are installing every new part the Orders page and scheduled orders need, and giving each a working section on `/kit` with our demo data. No Orders screen yet. Installing everything first means the screen prompts (O3 to O6) only compose and refine parts, and any install problem shows up here, alone.

## Read first

- `AGENTS.md` (rules 1, 2, 6, 10), `docs/components.md` (all), `docs/design-tokens.md`, `docs/ux.md` sections 4, 7 and 8
- `docs/decisions.md`: N24 (Opensource UI hand copies), T27 (never edit installed files), T37, T39 (scoped lint exceptions), T50
- `packages/ui/components.json`, `eslint.config.js`, `pnpm-workspace.yaml`
- `apps/dashboard/src/features/kit/screens/kit.tsx` and `reui-primitives.tsx` (how kit sections are made)
- `packages/ui/src/vendor/opensource-ui/thermal-receipt.tsx` (the header format for a hand copy)

## What to install (approved in T50)

Run each from `packages/ui` with the pinned CLI: `pnpm exec shadcn add ...`, never `pnpm dlx shadcn@latest`.

| #   | Command                                                                       | What it brings                                                                                                                                             | New npm packages (exact versions)                                                                                           |
| --- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | `pnpm exec shadcn add @reui/kanban`                                           | `reui/kanban.tsx`                                                                                                                                          | none: it uses `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2, already installed for Sortable |
| 2   | `pnpm exec shadcn add calendar`                                               | shadcn Calendar (`calendar.tsx`)                                                                                                                           | `react-day-picker` 10.0.2, `date-fns` 4.4.0                                                                                 |
| 3   | `pnpm exec shadcn add @reui/event-calendar`                                   | the ReUI Event Calendar: `event-calendar.tsx` plus its agenda, month, time-grid, resource, dnd, recurrence, event, nav, content, lib, i18n and types files | `@date-fns/tz` 1.5.0 (`date-fns` from row 2)                                                                                |
| 4   | Hand copy (N24) from https://opensourceui.in/components/week-strip-calendar   | `vendor/opensource-ui/week-strip-calendar.tsx`                                                                                                             | none                                                                                                                        |
| 5   | Hand copy (N24) from https://opensourceui.in/components/booking-slot-calendar | `vendor/opensource-ui/booking-slot-calendar.tsx`                                                                                                           | none                                                                                                                        |

Rules for installs:

- Exact versions in `package.json` (no `^`). Each release must be at least 7 days old and install on Node 24.14 with `engineStrict` on. `react-day-picker` 10.0.2 depends on `date-fns ^4.1.0` and `@date-fns/tz ^1.4.1`; our pins satisfy both. If one fails, pin the newest older version that works and tell me. Never `packageExtensions`.
- If the CLI wants to add anything not in this table (another component, another package, a `sonner` toaster), **stop and tell me**. We already have a toaster.
- If the CLI asks to overwrite an existing file (for example `button`, `popover`, `dropdown-menu`, `scroll-area`, `tooltip`, `reui/icon-stack`), answer **no** and keep ours. If the new parts then fail to type-check against ours, stop and tell me which prop is missing; do not edit our files.
- **Never edit installed files** (T27). The installed ReUI files use `any` and casts with a file-top `eslint-disable`, like `reui/sortable.tsx`. If `pnpm lint` still fails on an installed file, add a scoped entry in `eslint.config.js` that names only that file and only that rule, with the comment `// decision T39`, the same way the data-grid files are listed. Never turn a rule off for a folder.
- Hand copies keep the header comment: source URL, date copied, MIT, Opensource UI by Bidyut Kundu, and a "Changes:" line. Allowed changes, as with `thermal-receipt.tsx`: our `cn`, token classes instead of hex or palette classes, no inline styles, sample data and labels moved to props, our type sizes. Keep the behaviour (arrows through weeks, tap to select, crossed-out unavailable slots).
- The storefront must not grow: none of these files may be imported by any storefront page yet.

## Kit sections (`/kit`, dashboard)

Add a new file `apps/dashboard/src/features/kit/orders-primitives.tsx` with one section per part, registered in `kit.tsx`. Each section shows the part working on our tokens, in light and dark, at 390 and 1280 px, with demo data from `@smartapp/core` demo packs (no new mock data files; use `DEMO_SHOPS` and small inline arrays of ids and labels only):

1. **Kanban**: 5 columns (New, Preparing, Ready, Out, Done) with 6 plain cards. Show: drag with a mouse; a drop two columns ahead snaps back (use `onValueCommit` + `restoreOnCancel`); keyboard move with Space and arrows; drag turned off when `(pointer: coarse)` matches.
2. **Calendar**: single date with today marked, disabled past days, and a `modifiers` example that puts a dot under booked days.
3. **Event Calendar**: month, week and agenda views of 10 sample bookings for Lola Remy, read-only first, then a toggle that turns on drag to move. Map event colours to our tokens through the component's own colour API. If it only accepts raw palette names, stop and tell me.
4. **Week strip**: 14 days from today, Closed and Full days shown, one selected.
5. **Booking slots**: Morning, Afternoon and Evening groups of 30-minute slots, 3 full ones crossed out.

Each section title uses the component's own name and library, like the other kit sections.

## Docs (same push)

- `docs/components.md`: a row for every new file (kanban, calendar, every event-calendar file, the two hand copies), with library, path and "Used in: kit (Orders in O3 to O6)".
- `docs/decisions.md` T50: add the exact versions that installed.
- `docs/CHANGELOG.md`: one line. `docs/PROGRESS.md`: `- [x] O2 Orders parts installed and on /kit`.

## Checks and push (decision T40)

- Do not run `pnpm check`, `pnpm build`, Playwright or screenshots. Run `pnpm format` before the last commit.
- Open `/kit` once in the dashboard dev server: the five new sections render with 0 console errors.
- Commit on `main`, `git push origin main`. No branch, no PR. Refused push: `git pull` first. Never force-push.
- The cloud thread runs check, build, the JS budget (the storefront must not change) and screenshots.

## Done when

- [ ] The 5 parts are installed with exact versions, no other packages added, and no existing component file changed.
- [ ] Lint exceptions, if any, name single files and single rules with `// decision T39`.
- [ ] `/kit` shows the 5 sections working, including the snap-back and touch-off behaviour on the Kanban.
- [ ] `docs/components.md`, decisions, PROGRESS and CHANGELOG are updated.
- [ ] Pushed to `main`. Finish with: the commit list, the versions installed, any CLI prompts you answered, how to test, and what I must do by hand.
