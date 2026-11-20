---
name: smartapp-data
description: Information management rules for Smart App PH (the Information Management course applied to our Postgres on Supabase). Use it before you add or change a table, column, key, CHECK, index, RLS policy, grant, SQL function or migration in supabase/, before you change a Zod schema in packages/core that mirrors a table, and whenever you decide whether a value should be stored, computed or copied.
---

# Smart App PH data rules (Information Management)

The database is the last wall. A rule that lives only in TypeScript is broken the day someone forgets to call it; a rule in a constraint holds for every caller, every copy of the API and every future feature. This skill turns the Information Management course (relational model, ER modelling, normalization, SQL, transactions, security, backup) into rules for our tables.

AGENTS.md wins over this skill. The plan is `docs/blueprints/database.md`; the illustrated version with the ERDs, the normalization walkthrough, the data dictionary and the CRUD matrix is the Claude Doc "Smart App PH database blueprint" (https://claude.ai/artifact/ECSDYkAtZ3dytR7j7qdsuF).

| What                                  | Where                                         |
| ------------------------------------- | --------------------------------------------- |
| Table plan, conventions, access model | `docs/blueprints/database.md` sections 2 to 5 |
| Migrations (DDL + DCL), never edited  | `supabase/migrations/*.sql`                   |
| Database tests (pgTAP)                | `supabase/tests/*.test.sql`                   |
| Closed lists mirrored by CHECKs       | `packages/core/src/schemas/enums.ts`          |
| Shapes the API and mocks share        | `packages/core/src/schemas/`                  |
| Error codes a constraint maps to      | `packages/core/src/errors.ts`, `docs/api.md`  |

## 1. Relational model and keys

- Every table has `id uuid primary key default gen_random_uuid()` (Postgres 17 has no `uuidv7()`), `created_at timestamptz not null default now()`, and, if it belongs to a shop, `tenant_id uuid not null`.
- A child points at its parent with a composite key `(tenant_id, parent_id) references parent (tenant_id, id)`, and the parent has `unique (tenant_id, id)`. A row can then never point into another shop, even through a bug.
- A junction table (many to many) uses a composite primary key of its two foreign keys, not its own `id`.
- Names are lowercase snake_case, tables plural, foreign keys `<singular>_id`.
- A foreign key needs a primary key or unique constraint on the other side (Postgres requires it); the referencing column does **not** get an index by itself, so add one (section 6).

## 2. Normalization: one fact, one place

Normalize to BCNF first, then copy on purpose only where section 3 allows it.

| Form | The test                                                               | Our rule                                                                                                                                                                                                      |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1NF  | every column holds one value; no repeating groups                      | no comma lists or `item1, item2` columns; a list is a child table. JSON only for a document saved and read whole (database.md section 2)                                                                      |
| 2NF  | in a table with a composite key, every column depends on the whole key | in `order_line_options (line_id, option_id)` only facts about that pair live there; facts about the option alone live in `options`; the name and price kept on the line are the copy at sale time (section 3) |
| 3NF  | no column depends on another non-key column                            | a shop's GCash number lives in `payment_accounts`, not on each order; an order points at `payment_account_id`                                                                                                 |
| BCNF | every column that decides another is a key                             | if "slug decides the shop", slug is `unique`; if "(shop, Manila day, number) decides the order", that is a `unique`                                                                                           |

Write down the functional dependency ("X decides Y") before adding a column. If X is not the table's key, Y belongs in X's table.

## 3. Redundancy and the three anomalies

Redundancy is one fact saved twice; sooner or later the two disagree.

| Anomaly | What goes wrong                                  | How we avoid it                                                                   |
| ------- | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| Update  | a fact changed in one place stays old in another | stamp balance = `sum(delta)` of `stamp_entries`, never a stored column (T60)      |
| Insert  | a fact can't be saved without inventing another  | `payment_accounts` stands alone, so a new shop saves GCash before its first order |
| Delete  | removing one row wipes another fact              | `categories` is its own table; items point at it with `restrict`                  |

Computed, never stored: plan status, member stamp balance, member segments and counts, every Home number, variant price, storage used. The rule lives once in `packages/core` and the SQL that reads it.

**Copies kept on purpose** (each one is history or a guarded counter, and each has a guard):

| Copy                                                   | Why                                                | Guard                                                                      |
| ------------------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------- |
| item name, variant label, prices on `order_lines`      | the receipt shows what was paid, not today's price | written once at placement, never updated                                   |
| customer name, phone, address on `orders`              | guests have no member row                          | written once at placement                                                  |
| `orders.subtotal`, `discount`, `delivery_fee`, `total` | Home adds up thousands of orders                   | `CHECK total = subtotal - discount + delivery_fee`; test that lines add up |
| `orders.business_date`, `pickup_code`                  | order numbers, "today", counter search             | written by one core function; tested                                       |
| `stamp_cards.quantity_left`, `item_daily_counts.qty`   | checked and changed in one step under load         | changed only inside place, cancel and expire, same transaction             |

A new copy needs a line in this table (and in database.md) with its guard, or it is a bug. A summary table for Home is added only when a measured read is slow (T70).

## 4. Types and constraints (business rules in the database)

- Money: `integer` centavos with `check (x >= 0)`. Never `money`, `numeric` for prices, or floats (PostgreSQL wiki "Don't Do This").
- Time: `timestamptz` (stored UTC). Never `timestamp` without time zone, `timetz`, or a precision like `timestamptz(0)`. The Manila day is a `business_date date` written by NestJS.
- Text: `text` with `check (char_length(x) between 1 and N)`. Never `varchar(n)` or `char(n)`.
- Closed lists: `text` + `check (x in (...))`, copied from the `as const` list and its Zod enum (rule 5). No Postgres enums.
- Use the constraint that says the rule: `not null`, `unique` (or a partial unique index: "one pending plan payment per shop"), `check` across columns (refund amount, reason and time all or none), foreign keys, and an exclusion constraint for "no two rows overlap" if a time-range rule ever needs one.
- Name constraints you map to an error code (`stamp_cards_reward_item_fk` → `item_is_reward`). The API maps by **constraint name**, never by message text.
- Never `NOT IN` with a subquery (it breaks on null), never `BETWEEN` on timestamps (use `>= start and < end`), no `serial` (identity or uuid), no rules, no table inheritance.

## 5. Deletes and history

- `on delete cascade` from `tenants` down (closing a shop removes its rows).
- `on delete restrict` where history needs the parent: an ordered item or variant, a prize item, a file in use. Archive (`status = 'archived'`) instead of deleting something that has orders.
- Append-only tables (`stamp_entries`, `order_events`, `consents`, `shop_activity`, `audit_log`) get only `select, insert` grants. A correction is a new row (`undone`, `given = false`), never an update.

## 6. SQL by kind, transactions and concurrency

- DDL and DCL only in migration files; DML and TCL only in NestJS and the SQL functions it calls. Nobody types SQL into the Supabase editor or runs it through MCP (rule 8).
- One API request = one transaction: `begin`, `set local role app_api`, `select set_config('app.tenant_id', $1, true)`, the work, `commit`. Never a session-level `set` on a pooled connection.
- Isolation stays `read committed`. Every race is closed by one conditional statement or a short lock (database.md section 5): `update … where quantity_left > 0` (0 rows = none left), `insert … on conflict do nothing` on a `client_key`, `update … where status = $expected`, `select … for update`, `pg_advisory_xact_lock`.
- Money, counts and stamps change only in the SQL functions (`place_order`, `add_stamp`, `use_reward`, `claim_prize`, `next_order_no`); the browser never writes them.

## 7. Indexes

- An index on every foreign key column, and on every column an RLS policy filters on (Supabase RLS performance guide).
- Multicolumn indexes put the equality columns first: `(tenant_id, business_date)`, `(tenant_id, status) where status in (…)`. Postgres only narrows the scan by the leading columns.
- Add an index for a real query, then check it with `explain` (see `smartapp-algorithms`); don't add speculative ones, each slows every write.

## 8. Security and privacy in the database

- RLS on every table, policies on `private.current_tenant()`, explicit grants to `app_api` / `app_admin` only; `anon` and `authenticated` get nothing. All in the same migration as the table (rule 8).
- The request role must not be a superuser or have `BYPASSRLS` (OWASP multi-tenant cheat sheet); the Supabase secret key bypasses RLS, so it is used only for Auth admin and Storage links.
- `security definer` functions only in the `private` schema, with `set search_path = ''`; business functions are `security invoker`.
- Collect only what the order needs; customer data never goes to logs; erasure blanks the member and their orders' contact snapshot (database.md section 9).

## 9. Backup and change

- Applied migrations are never edited; a mistake is fixed by a new migration. CI applies to dev after pgTAP passes; the live database only by the founder (D9).
- Storage files are not in Supabase backups; the export (T66) and a weekly bucket copy cover them. The live project needs Pro for downloadable daily backups (D4).

## Before you say done

- [ ] The functional dependencies are written down and the table is in BCNF, or the copy is listed in section 3 with its guard
- [ ] Every rule that can be a constraint is one, with a name if the API maps it to an error code
- [ ] RLS, grants and policies are in the same migration; append-only tables have no update or delete grant
- [ ] An index exists for every foreign key and every policy filter column
- [ ] pgTAP tests cover: another shop reads nothing, append-only refuses update and delete, every new CHECK refuses a bad value, every new guard holds
- [ ] The Zod schema, the `as const` list and the CHECK say the same thing
- [ ] `docs/blueprints/database.md` is updated if the table plan changed

## Sources (opened 2026-11-20 unless marked)

- PostgreSQL 17, Constraints: https://www.postgresql.org/docs/17/ddl-constraints.html
- PostgreSQL 17, Multicolumn indexes: https://www.postgresql.org/docs/17/indexes-multicolumn.html
- PostgreSQL wiki, Don't Do This: https://wiki.postgresql.org/wiki/Don't_Do_This
- Supabase, Row Level Security (performance: index policy columns): https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase, Backups (Storage objects not included): https://supabase.com/docs/guides/platform/backups
- OWASP Multi-Tenant Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- Normal forms (1NF to BCNF): standard course material (Codd; Elmasri and Navathe), not looked up
