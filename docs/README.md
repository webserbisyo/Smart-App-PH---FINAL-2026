# Docs map

Which doc answers which question (decision T101). Rules first, then plans, then records. When two docs disagree, stop and ask (AGENTS.md, "Every task").

## Start here

| Question                                      | Read                                                 |
| --------------------------------------------- | ---------------------------------------------------- |
| What are the rules for any change?            | `AGENTS.md` (repo root)                              |
| What is the product, its stack and its shape? | `blueprints/foundation.md`                           |
| What ships at launch, what comes after?       | `blueprints/A-mvp.md`, `blueprints/B-full.md`        |
| Where are we now?                             | `PROGRESS.md` (tasks), `CHANGELOG.md` (what changed) |
| Why was something decided?                    | `decisions.md` (every approved decision, T01 onward) |

## Building a screen

| Question                                   | Read                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| How must every screen behave?              | `ux.md` (responsive plan, states, accessibility, dashboard brand rules) |
| Which colour, size or motion token?        | `design-tokens.md`; live on `/kit/tokens`                               |
| Which component? Is it installed?          | `components.md` (Use for / Don't, Installed, edits log); live on `/kit` |
| Which words?                               | `packages/core/src/words.ts` and the `smartapp-ui-writing` skill        |
| How do I check it before saying done?      | the `smartapp-ui-check` skill (brand guard, UI scan)                    |
| Which pages exist?                         | `/kit/routes` (from `apps/dashboard/src/features/kit/route-catalog.ts`) |
| What do the demo shops sell and look like? | `demo-shops.md`                                                         |

The three UI skills live in `.agents/skills/` (also linked as `.claude/skills/`): `smartapp-ui`, `smartapp-ui-writing`, `smartapp-ui-check`.

## Data and back end

| Question                               | Read                     |
| -------------------------------------- | ------------------------ |
| What can a screen call? (mock and API) | `api.md`                 |
| Which tables, keys and access rules?   | `blueprints/database.md` |

## Launch and hosting

| Question                                          | Read          |
| ------------------------------------------------- | ------------- |
| Public demo links on sample data (Vercel)         | `previews.md` |
| What the founder must get or do before going live | `launch.md`   |

## Other folders

- `brand/`: logo masters (gradient mark, flat blue mark, stacked lockup).
- `prompts/`: task prompts for agents. Finished ones are in `prompts/done/`; `prompts/ref/` holds their reference files.
- `archive/`: superseded long docs (system paper, old build blueprint, research, autopilot log, old screenshots). History only: never build from them.

## Keeping docs tidy

- One topic, one doc. Add to the doc that owns the topic instead of starting a new one; if nothing owns it, ask first.
- Docs stay general: rules and reasons, not copies of component code.
- Every approved decision gets a line in `decisions.md`; every task ticks `PROGRESS.md` and adds one line to `CHANGELOG.md`.
- A doc that is replaced moves to `archive/` with a line in its README saying what replaced it.
