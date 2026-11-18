---
name: smartapp-ui-writing
description: How Smart App PH screens talk: button labels, form labels and hints, errors, empty states, toasts, confirmations and status words for shop owners and their customers in the Philippines. Use this skill whenever you write or change any text a person will see in apps/dashboard or apps/storefront, including aria-labels and demo text, even if the task is mainly about layout or logic.
---

# Smart App PH UI writing

Our readers are small food and retail shop owners and their customers in the Philippines, usually on a phone, often in a hurry, often reading English as a second language. A clear label saves a Messenger question; a vague one loses an order. Write so a busy owner in Marikina understands it on the first read.

All our visible text lives in `packages/core/src/words.ts` (dynamic text as functions). Screens import from there; never type a sentence into a component. Mock-only text gets its own small export so the storefront bundle doesn't pull the whole object.

## Voice

- **Plain, short, friendly, not cute.** Everyday English with local words where natural (Suki, Members, GCash). No jokes in errors, no exclamation marks except after real success.
- **Sentence case everywhere**: "Add item", not "Add Item" or "ADD ITEM".
- **Name things the way people do**: "menu", "items", "add-ons", "orders", "members", "stamps", "payment proof", not "catalog entries", "SKUs", "line items", "loyalty ledger".
- **Food and retail both read right.** Use the shop's own nouns from words (kitchen/packing, menu/products). Never compare the shop type in code to pick words; words carry both forms.
- **Active voice, present tense**, and "you" for the reader. "We" only when we did something ("We saved your changes").

## Buttons and actions

- Short verb buttons that say exactly what happens: "Save", "Add item", "Mark ready", "Send proof". Never "Submit", "OK" or "Click here".
- Keep the same word through the flow: "Publish" leads to "Published", not "Changes are live".
- One main action per view; the rest are outline, ghost or in the ⋯ menu.
- Destructive actions name the thing ("Delete Classic Smash") and say whether it can be undone.

## Forms

- Labels are nouns above the field ("Price"), never placeholder-only.
- Hints say why we ask when it isn't obvious: "Customers see this number on their receipt."
- Accept what people type (0917 123 4567, +63 917…, ₱1,500 or 1500) and format it for them.
- Money is **₱1,500** (integer centavos in code, peso sign, comma thousands, decimals only when there are centavos). Dates "Fri, 12 Dec"; times "2:00 PM", Manila time.

## Errors

An error is directions, not an apology: what happened and what to do next, in one or two short sentences. Screens word errors from their `code`, never from the message text.

- Good: "That link is taken. Try kanto-smash-marikina or add your town."
- Good: "You're offline. We'll send this when you're back."
- Avoid: "Oops! Something went wrong", "Invalid input", "Error 422".
- One login error for every failed login; never say which part was wrong.
- Another shop's page shows Not found, never "forbidden".

## Empty states

One sentence on what goes here and one action to start: "No items yet. Add your first item so customers can order." + "Add item". Never "Coming soon".

## Toasts

Past tense of the action, with Undo when it can be undone: "Item hidden · Undo". Don't toast what the screen already shows. All toasts go through `notify()`.

## Status words

Use the existing order stage and payment words from `words.ts` so a state has the same word everywhere. Don't invent synonyms like "Pending" or "Done" when a word exists.

## Check before you finish

Read every new string out loud as the owner, then as a customer. If you'd have to ask "what does this mean?", rewrite it. Check that the same action has the same name on every screen you touched.
