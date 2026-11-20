---
name: smartapp-prompt
description: How to turn a request into a clear brief and a task prompt for Antigravity or a Claude session in Smart App PH. Use it whenever you write, review or rewrite a prompt in docs/prompts/, plan a task for an AI coder, or receive a long or mixed request from the founder that needs a goal, scope, finish line and approval step before any work starts.
---

# Smart App PH task prompts

A vague prompt costs a day: the coder guesses, hand-writes a component, "works around" a failing check, or builds something nobody decided. A good prompt is a small spec. This skill is the check every request gets before work, and the template every prompt follows.

AGENTS.md wins over this skill. Prompts live in `docs/prompts/` (finished ones move to `docs/prompts/done/`, T101).

## 1. The prompt check (before any work)

Size it to the task: two lines for a small fix, a short document for a big one.

1. **Goal** in 2 or 3 plain lines: who gains what.
2. **Check it against the repo**: `A-mvp.md` scope, `decisions.md`, `api.md`, `database.md`, `ux.md`. Name any conflict with a decision already made; never pick silently.
3. **Name what is missing**: scope (what is out), source of truth, finish line ("done when"), approval step, which shops and screen sizes to test.
4. **Recommend** an answer for every open choice, so "yes to all" is a valid reply.
5. Wait for the founder's yes. A vague reply is not a yes for a database change (it needs a one-word yes).

## 2. The prompt template

Copy this shape into `docs/prompts/T<nn>-<name>.md`:

```markdown
# T<nn> <name>

## Goal

<2–3 lines: who gains what, and why now (which launch item it serves)>

## Read first

AGENTS.md, then only: <the docs and files this task needs>.
Skills to load: <smartapp-ui, smartapp-ui-writing, smartapp-ui-check for UI;
smartapp-data, smartapp-security, smartapp-integration for backend; others as named>.

## Founder decisions used (change before running)

- <decision number and the rule it sets>

## Scope

In: <bullets>
Out: <bullets; what NOT to touch>

## Steps

1. <files to create or change, in order>
2. ...

## Rules for this task

- Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.
- <task-specific rules: words in words.ts, error codes, no new packages without asking, etc.>

## Done when

- [ ] <checkable outcomes, one per line, including every state and both shop types>
- [ ] Docs: one line ticked in PROGRESS.md, one line in CHANGELOG.md, decisions recorded

## Checks

<what the coder runs locally (light), and what CI or a cloud session runs (heavy)>

## Finish with

PR or commit link, what changed, how to test, what the founder must do by hand.
```

The line "Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing." goes in **every** Antigravity prompt (foundation section 7).

## 3. Writing rules that make prompts work

- **One task per prompt**, one area, one finish line. Split anything bigger.
- **Be specific**: file paths, function names, error codes, decision numbers. "Fix the orders page" is not a prompt.
- **Give the why** behind each rule in a few words; coders follow rules they understand and stretch ones they don't.
- **Point to the source of truth** instead of copying it (docs stay general; never paste installed component code).
- **Ask for a plan first**: the coder posts its plan (files, steps, commands) and waits for OK (AGENTS.md "Every task").
- **Say what to do on failure**: stop and report, never weaken a check, never work around (old-build lesson).
- **Name the checks** that prove done, and who runs them. Since T40, Antigravity pushes to `main` without running `pnpm check` or `pnpm build` on the slow laptop; a cloud Claude session runs the heavy checks and fixes or reverts.
- Plain English, short sentences, no ALL CAPS shouting, numbered steps.

## 4. Reviewing a coder's work

- Did it install planned components rather than hand-write them? (`docs/components.md` updated in the same commit.)
- Does it match the prompt's Scope and Done when, nothing more?
- Are checks green without weakened rules, skipped tests or new `eslint-disable`?
- Are `PROGRESS.md`, `CHANGELOG.md` and `decisions.md` updated?
- Reject workarounds; ask for the root cause.

## Before you send a prompt

- [ ] The prompt check (section 1) was done and the founder said yes
- [ ] Every section of the template is filled; "Out" names what not to touch
- [ ] Done when is checkable by someone who didn't write the prompt
- [ ] The components line is in, and the skills to load are named

## Sources

- Anthropic, Prompt engineering overview and Claude skill authoring best practices (clear goal, context, examples, concise): https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices (opened 2026-11-20)
- Repo: AGENTS.md "Every task", `docs/blueprints/foundation.md` section 7, `docs/decisions.md` T40 and T101, `docs/prompts/README.md` (read 2026-11-20)
