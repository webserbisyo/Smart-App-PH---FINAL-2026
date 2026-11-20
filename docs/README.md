# Docs map

Which doc answers which question (decision T101). Rules first, then plans, then records. When two docs disagree, stop and ask (AGENTS.md, "Every task").

## Start here

| Question                                         | Read                                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| What are the rules for any change?               | `AGENTS.md` (repo root)                                                             |
| What is the product, its stack and its shape?    | `blueprints/foundation.md`                                                          |
| What ships at launch, what comes after?          | `blueprints/A-mvp.md`, `blueprints/B-full.md`                                       |
| Why does it exist, who uses it, how is it built? | `blueprints/system.md` (the proposal)                                               |
| Which pages and features, and their status?      | `blueprints/features.md`                                                            |
| How do we measure ads (Meta Pixel and CAPI)?     | `blueprints/meta.md`                                                                |
| The school paper                                 | `capstone.md` (draft)                                                               |
| Where are we now?                                | `PROGRESS.md` (tasks; UI approved and Done per area), `CHANGELOG.md` (what changed) |
| Why was something decided?                       | `decisions.md` (every approved decision, T01 onward)                                |

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

The UI skills live in `.agents/skills/` (also linked as `.claude/skills/`): `smartapp-ui`, `smartapp-ui-writing`, `smartapp-ui-check`. The course skills are listed under "Skills" below.

## Data and back end

| Question                               | Read                     |
| -------------------------------------- | ------------------------ |
| What can a screen call? (mock and API) | `api.md`                 |
| Which tables, keys and access rules?   | `blueprints/database.md` |

## Skills (load by themselves when the work matches)

Each skill sits in `.agents/skills/<name>/SKILL.md` (Antigravity) and `.claude/skills/` (Claude, same folder). The course skills turn a school course into short rules for our stack, each with its sources (decision T102). AGENTS.md wins over every skill.

| Skill                  | Course                                                        | Use it when                                                        |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `smartapp-ui`          | (brand)                                                       | building or changing any UI                                        |
| `smartapp-ui-writing`  | (words)                                                       | writing any text a person sees                                     |
| `smartapp-ui-check`    | (checks)                                                      | before saying UI work is done                                      |
| `smartapp-data`        | Information Management                                        | tables, keys, normalization, constraints, RLS, migrations          |
| `smartapp-analysis`    | Systems Analysis and Design                                   | planning a task, scope, requirements, statuses, diagrams           |
| `smartapp-hci`         | HCI 1 and 2                                                   | designing or reviewing a page, research, usability tests, WCAG 2.2 |
| `smartapp-web`         | Web Systems and Technologies                                  | routes, HTTP, rendering, caching, PWA, page speed                  |
| `smartapp-oop`         | Object-Oriented Programming                                   | NestJS modules and services, adapters, patterns                    |
| `smartapp-algorithms`  | Data Structures and Algorithms                                | queries, lists, search, intervals, queues, speed                   |
| `smartapp-platform`    | Platform Technologies                                         | versions, env, CI, hosting, backups, jobs, costs                   |
| `smartapp-security`    | Network Security                                              | routes, login, uploads, limits, logs, secrets, privacy             |
| `smartapp-integration` | Systems Integration and Architecture, Integrative Programming | contracts, mock to API, outside services, outbox                   |
| `smartapp-prompt`      | (way of working)                                              | writing or reviewing a task prompt                                 |

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
