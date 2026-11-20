# Feature blueprint (MVP A)

Every MVP A page and feature, where it lives, the decisions behind it and its status (decision T104). Routes come from `apps/dashboard/src/features/kit/route-catalog.ts`; methods from `api.md`; scope from `A-mvp.md`, which wins if they differ.

**Status words (T102).** UI approved = built and approved on sample data. Done = works on the dev database through NestJS. On 2026-11-20 every screen is UI approved and nothing is Done: the backend is wired one area at a time (`PROGRESS.md`, phase 4.2). Update this page when an area turns Done.

## 1. Storefront (customers, `shop.webserbisyo.com/<slug>`)

| Page or feature         | Route          | What it does                                                                                   | Decisions           | UI approved | Done |
| ----------------------- | -------------- | ---------------------------------------------------------------------------------------------- | ------------------- | ----------- | ---- |
| Opening screen          | first load     | Shop splash that waits for the page (3 s cap)                                                  | T94                 | Yes         | No   |
| Shop home               | `/`            | Banners, announcement, open state, area pill, best items                                       | R14, N30, T79       | Yes         | No   |
| Menu                    | `/menu`        | Search, category chips, item cards, Sold out today                                             | T48, N26            | Yes         | No   |
| Item sheet              | on Menu        | Variants, add-ons, note, quantity, Add                                                         | T46                 | Yes         | No   |
| Basket                  | from the dock  | Lines, member stamp line, Checkout                                                             | R1, R5              | Yes         | No   |
| Checkout                | `/checkout`    | Order type, time, delivery zone and pin, who, pay method; fresh price check before Place order | N1, N2, T48, T81    | Yes         | No   |
| Receipt and live status | `/o/[token]`   | Order number, steps timeline, order chat, proof upload (3 photos), Change time                 | R48, T86, T87       | Yes         | No   |
| My orders               | `/orders`      | Past and current orders on this phone                                                          |                     | Yes         | No   |
| Join                    | `/join`        | 6-digit email code, 1 welcome stamp, install card                                              | D2, N5              | Yes         | No   |
| Rewards                 | `/rewards`     | Stamp card, stamp history with reasons, reward and prizes                                      | stamp decisions     | Yes         | No   |
| Account                 | `/account`     | Member details, face, sign out                                                                 | T93, T95            | Yes         | No   |
| Privacy                 | `/privacy`     | Plain English with a Filipino summary                                                          | A-mvp section 5 (8) | Yes         | No   |
| Not found               | any other path | Also shown for another shop's anything                                                         | rule 12             | Yes         | No   |
| Install and offline     | whole app      | Serwist: saved copy opens at once, offline page                                                | T6, T13             | Yes         | No   |
| Owner preview           | `/preview`     | The Editor's live preview                                                                      | T72 to T76          | Yes         | No   |

## 2. Dashboard (owners, `app.webserbisyo.com`)

| Page or feature               | Route                                                                                            | What it does                                                                                                                 | Decisions                  | UI approved     | Done |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------- | ---- |
| Sign in                       | `/login`                                                                                         | One error for every failed login                                                                                             | rule 12                    | Yes             | No   |
| Home                          | `/`                                                                                              | Today vs a usual day, Needs you, Sales (Paid, To check, Not paid yet) with money rings, best sellers, any period, busy hours | T69 to T71, T83, T84       | Yes             | No   |
| Orders                        | `/orders`                                                                                        | Board and List, order panel with chat, Change time, Recall, print ticket                                                     | T54 to T56, T95            | Yes             | No   |
| Calendar                      | in Orders                                                                                        | Booked orders by month, week and day                                                                                         | T85, T86, T93              | Yes             | No   |
| Menu or Products              | `/catalog`, `/catalog/new`, `/catalog/$itemId`                                                   | Items list and grid, item editor, Sold out today, daily limit, notice days                                                   | T41, T46, T48              | Yes             | No   |
| Categories, Add-ons, Variants | `/catalog/categories`, `/catalog/add-ons`, `/catalog/variants`                                   | Shared groups across items                                                                                                   | T46                        | Yes             | No   |
| Members                       | `/members`, `/members/$customerId`, `/m/$code`                                                   | Stat cards, member list, counter stamp with Undo, use reward, faces                                                          | T58 to T63, T95            | Yes             | No   |
| Stamp card                    | `/members/stamp-card`                                                                            | Stamp rules, reward, limited prizes with pause                                                                               | stamp decisions            | Yes             | No   |
| Claims                        | `/members/claims`                                                                                | Prizes claimed and to hand over                                                                                              | T60 to T63                 | Yes             | No   |
| Editor                        | `/editor`                                                                                        | Look, style, fonts, banners, announcement, About, opening screen; autosave, Undo 50 steps, Draft and Publish                 | T72 to T76, T79, T94, T103 | Yes             | No   |
| Settings                      | `/settings` and Shop, Hours, Ordering, Delivery, Payments, Account, Notifications, Plan, Storage | Shop facts, hours, order types and days ahead, zones and fees, pay methods and banks, plan and file manager                  | T64 to T68, T93            | Yes             | No   |
| Go live card and Billing chat | Home and Plan                                                                                    | Ask to go live; one chat with Smart App PH                                                                                   | T89, T91                   | Yes             | No   |
| New-order email               | behind the scenes                                                                                | Email to the owner for each new order                                                                                        | N9, N10                    | No (email only) | No   |

T54 removed the separate Kitchen view; the Orders Board covers it.

## 3. Sign-up and Super Admin (the founder)

| Page or feature | Route             | What it does                                                                      | Decisions | UI approved | Done |
| --------------- | ----------------- | --------------------------------------------------------------------------------- | --------- | ----------- | ---- |
| Sign-up         | `/signup`         | Sells on the left, 3 steps on the right, Meta Pixel                               | T89, T90  | Yes         | No   |
| Admin home      | `/admin`          | Today: shops waiting, payments to check                                           | T88       | Yes         | No   |
| Shops           | `/admin/shops`    | Chips, search, side panel, leads, create a shop, help mode (Open as owner 60 min) | T88, T91  | Yes         | No   |
| Payments        | `/admin/payments` | Plan payments to check, CSV                                                       | T88, T92  | Yes         | No   |
| Tracking        | `/admin/tracking` | Sending switch, test mode, retry, by-ad table, event list                         | T90       | Yes         | No   |
| Setup           | `/admin/setup`    | Price, trial days, payment accounts, Messenger link                               | T88, T92  | Yes         | No   |

## 4. Behind the scenes (NestJS jobs, D5, `database.md` section 6)

| Job                                                                                               | How often    | Status    |
| ------------------------------------------------------------------------------------------------- | ------------ | --------- |
| Expire unpaid GCash, Maya and bank orders past pay-by (30 min); give back stamps and prize counts | Every minute | Not built |
| Send emails and Meta events from the outbox, with retry                                           | Every minute | Not built |
| Remove uploads not confirmed within an hour                                                       | Every hour   | Not built |
| Delete payment proof photos after 30 days (rows stay)                                             | Daily        | Not built |
| Drop sign-up leads that never converted after 180 days (D6)                                       | Daily        | Not built |
