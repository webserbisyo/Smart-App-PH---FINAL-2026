---
name: smartapp-hci
description: Human-computer interaction rules for Smart App PH (HCI 1 and 2 applied to our owners and customers in the Philippines). Use it before you design, redesign or review any page, flow or interaction in apps/dashboard or apps/storefront, when you plan research or a usability test, and when you judge whether a screen is easy enough for a busy shop owner or a first-time customer on a mid-range phone.
---

# Smart App PH interaction design (HCI 1 and 2)

`smartapp-ui` says which token and component to use; `smartapp-ui-writing` says which words; `docs/ux.md` holds the screen rules. This skill is the reasoning behind them: how people perceive, remember and act, and how we find out whether a design works before a real shop finds out for us.

AGENTS.md and `docs/ux.md` win over this skill.

## 1. Who we design for

- **Owner**: a small food or retail shop, often alone at the counter, one hand on a phone, mid-range Android, interrupted every minute during a rush. Knows GCash, Messenger and Facebook; does not know dashboards.
- **Customer**: opens a shop link from Facebook or Messenger, on slow or prepaid data, wants to order in under a minute (`A-mvp.md` section 5) without making an account.
- **Founder**: approves shops in Super Admin, mostly on a laptop.
- Language: plain English with local words where natural (Suki, Members), Manila time, pesos. Check with a food shop and a retail shop every time.

## 2. Research before design (the founder's standing rule)

Before building or redesigning a page:

1. Study 3 to 5 **live references** (real apps the owner or customer already uses, competitor shops, design galleries the founder supplies) and note what each does well for this exact task.
2. Map the **data flow and logic** of the page: what the person needs to see first, what they decide, what changes in the data.
3. Give **2 or 3 options** with trade-offs and **one recommendation**, with a prototype or screenshot where it helps.
4. Wait for the founder's pick. Only then build. Never skip this for a page.

## 3. How people work (HCI 1)

| Principle                             | Our rule                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Recognition over recall               | show options (chips, recent items, saved places) instead of asking people to type or remember                    |
| Short-term memory is small            | one main task per screen; at most one primary button per view (T35); group long forms into short steps           |
| Fitts's law (bigger, closer = faster) | primary actions in thumb reach at the bottom on phones; 44 px targets; destructive actions away from the primary |
| Hick's law (more choices = slower)    | default to the common choice (pickup, now, the shop's main payment); hide rare options behind More               |
| Feedback                              | every tap answers within 100 ms (pressed state, spinner, check); long work shows progress (ux.md section 8)      |
| Mapping and signifiers                | things that look tappable are tappable; status is icon + word + colour, never colour alone                       |
| Constraints and error prevention      | disable or hide impossible actions (a step the order can't take) instead of erroring after the tap               |
| Consistency                           | the same thing looks and is named the same in both apps (one `words.ts`, one stage colour set)                   |
| Gestalt (proximity, similarity)       | related controls sit together; spacing, not boxes, groups them                                                   |

## 4. Nielsen's 10 heuristics as a review checklist

Review every new screen against these and fix what fails:

1. **Visibility of system status**: order step, pay countdown, Saved, offline, "Last updated 3:42 PM".
2. **Match the real world**: shop words (Suki, walk-in, COD, GCash), Manila time, ₱ with centavos only when needed.
3. **User control and freedom**: Undo after a stamp, Recall within 5 seconds (T53), Back always leads somewhere sensible.
4. **Consistency and standards**: one name per thing; platform patterns (bottom sheet on phones, dialog on desktop, N17).
5. **Error prevention**: daily limits and sold out shown before checkout; confirm only what can't be undone.
6. **Recognition rather than recall**: Order again, saved places, recent members.
7. **Flexibility and efficiency**: one-tap counter stamp, Find order by pickup code, keyboard shortcuts on desktop only as extras.
8. **Aesthetic and minimalist design**: if a border, badge or line tells nothing, remove it (`smartapp-ui`).
9. **Help users recover from errors**: every error says what to do next and offers Try again (rule 7).
10. **Help and documentation**: short hints at the point of need; no manuals.

## 5. Accessibility: WCAG 2.2 level AA

We follow WCAG 2.2 AA (`docs/ux.md` section 4). Rules that bite in this app:

- **Target size**: WCAG's minimum is 24 by 24 CSS px (2.5.8); ours is 44 px (ux.md), keep it.
- **Contrast**: text 4.5:1, large text and edges 3:1. The shop palette is generated to pass (`shopPalette()`); never hand-adjust it.
- **Dragging** (2.5.7): every drag has a tap way too. The Orders board drag also has Move to and Change time.
- **Focus not obscured** (2.4.11): the dock, sticky bars and toasts never cover the focused field; visible focus ring always.
- **Accessible authentication** (3.3.8): the 6-digit code boxes accept paste and phone autofill (`autocomplete="one-time-code"`); never a puzzle.
- **Redundant entry** (3.3.7): don't ask for what we already have (saved name, phone, address).
- **Consistent help** (3.2.6): the Messenger or help link sits in the same place on every page that has one.
- Labels on every input, `aria-label` on icon buttons, 16 px input text, motion off under `prefers-reduced-motion`.

## 6. Evaluation (HCI 2)

- **Heuristic review** (section 4) on every page before it is called done.
- **Cognitive walkthrough** for each launch flow: at each step ask "will they know what to do, see how, and know it worked?" Flows: order pickup with GCash, order walk-in cash, join and earn a stamp, owner checks a proof, owner finishes an order.
- **Usability test before launch**: 5 people per group (about 5 owners, about 5 customers) find most problems (Nielsen); test, fix, test again rather than one big test. Think aloud, on their own phone, with the task in words, never pointing.
- **Measure**: task success, time on task (customer orders in under a minute), errors, and the System Usability Scale (SUS, 10 questions, score 0 to 100; about 68 is average). Record results in the PR or `docs/decisions.md`.
- Prototypes: low fidelity (sketch, screenshot) to pick a direction, high fidelity (a real page on sample data) to test.

## Before you say a design is done

- [ ] Research pass done: live references, data flow, options, the founder's pick (section 2)
- [ ] Heuristic review passes all 10
- [ ] WCAG 2.2 AA items in section 5 hold; every drag has a tap alternative
- [ ] Every state from `docs/ux.md` section 3 is designed
- [ ] Walked through as a food owner and a retail owner (or customer) on a 360 px phone

## Sources (opened 2026-11-20 unless marked)

- Nielsen Norman Group, 10 Usability Heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
- Nielsen Norman Group, Why You Only Need to Test with 5 Users: https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/
- W3C, Understanding SC 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html (read from the w3c/wcag GitHub source)
- W3C, WCAG 2.2 new criteria (2.4.11, 2.5.7, 3.2.6, 3.3.7, 3.3.8): https://www.w3.org/TR/WCAG22/ (w3.org blocked the cloud session; criteria from the w3c/wcag GitHub source and course knowledge)
- System Usability Scale (Brooke, 1996; average about 68): course knowledge, not looked up
- Fitts's law, Hick's law, Norman's principles, Gestalt: standard HCI course material (Norman, "The Design of Everyday Things"; Dix et al., "Human-Computer Interaction"), not looked up
