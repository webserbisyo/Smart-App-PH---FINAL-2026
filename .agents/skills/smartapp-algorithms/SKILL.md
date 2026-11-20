---
name: smartapp-algorithms
description: Data structures and algorithms rules for Smart App PH (the Data Structures and Algorithms course applied to SQL queries, NestJS services and React lists). Use it when you write a query, a list or search, a loop over orders, members or items, a time-slot, hours or delivery-range check, a sort, a job queue, or anything that will run on every order or every page load, and whenever a page or endpoint feels slow.
---

# Smart App PH algorithms (Data Structures and Algorithms)

A shop with 40 orders a day becomes a shop with 400 after one viral post. Code that is fine at 40 and painful at 400 is the most common slow-app bug. This skill turns the DSA course (cost of operations, the right structure, searching and sorting, intervals, queues, hashing) into rules for our three tiers. Know the cost of what you write, and measure before you optimise.

AGENTS.md wins over this skill.

## 1. Know the cost (Big O) where it matters

| Size we plan for (per shop) | Rough number                                                                |
| --------------------------- | --------------------------------------------------------------------------- |
| Items and variants          | up to a few hundred items, 30 variants each (N4)                            |
| Orders                      | hundreds a day, tens of thousands a year                                    |
| Members                     | thousands                                                                   |
| All shops in one database   | about 150,000 orders in the free 500 MB (database.md section 7.1, estimate) |

- On the phone: O(n) per render over a few hundred rows is fine; O(n²) (a `.find` or `.filter` inside a `.map` over the same list) is not. Build a `Map` by id once, then look up in O(1).
- In SQL: a query that grows with all rows of all shops is a bug. Every shop query starts from an index on `tenant_id`.

## 2. The right structure for the job

| Need                                   | Use                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| Look up by id, count by key            | `Map` (or `Record` for a closed list); `Set` for "have I seen this?"                   |
| Keep order and allow duplicates        | array                                                                                  |
| Work to do later, in order, with retry | a queue table (`notification_outbox`, `track_events`) read by a NestJS job             |
| History you add to and never change    | an append-only log (`stamp_entries`, `order_events`); totals are a sum over it         |
| Fast search on a column                | a B-tree index (Postgres default); multicolumn with equality columns first             |
| No two rows may overlap in time        | a range type with an exclusion constraint, or a lock then a count (`lock_slot`)        |
| "Do this once" across retries          | a unique key (`client_key`) with `on conflict do nothing` (a hash set in the database) |

## 3. Queries: no N+1, page by cursor, sort with an index

- **N+1**: never query inside a loop (one query for orders, then one per order for lines). Fetch with a join or one `where id = any($1)` and group in memory with a `Map`.
- **Pagination**: long lists (orders history, members, activity) page by **keyset/cursor**: `where (placed_at, id) < ($lastPlacedAt, $lastId) order by placed_at desc, id desc limit 50`. `OFFSET` makes Postgres compute and throw away every skipped row, so page 100 is slow. Short owner lists (categories, payment accounts) may load whole.
- **Sort and filter in SQL**, on indexed columns, not by loading everything into Node. Totals for Home are `sum`/`count` grouped in SQL over `(tenant_id, business_date)`.
- **Check the plan**: run `explain (analyze, buffers)` on any new query over orders, members or stamp entries with the stress pack loaded. A `Seq Scan` on a big table means a missing index or a wrong leading column.
- Select only the columns the screen uses.

## 4. Searching

- Find order by pickup code: exact match on the stored `pickup_code` with an index, never a scan of tokens.
- Member and item search: prefix or `ilike` on a short name over one shop's rows; debounce typing (about 250 ms) and cancel the old request (TanStack Query does this when the key changes).
- Sorted arrays in core (time slots, distance rows) can use binary search; for under ~100 entries a simple loop is clearer and fine.

## 5. Intervals (hours, slots, delivery ranges)

These are the classic interval problems; each has one home in `packages/core/src/rules` and a matching guard in SQL.

- **Overlap test**: two ranges `[a1, a2)` and `[b1, b2)` overlap when `a1 < b2 and b1 < a2`. Use half-open ranges (end not included) so 9:00 to 12:00 and 12:00 to 15:00 don't clash. Never `BETWEEN` on times.
- **Opening hours**: sort ranges by start, then each start must be at or after the previous end (`hoursProblems`, error `hours_overlap`). Ranges that cross midnight are split.
- **Delivery distance rows**: sort by `fromKm`; each row starts where the last ended, no gaps or overlaps (N25).
- **Pickup slots and daily limits**: count inside the transaction after a lock (`pg_advisory_xact_lock` on shop and slot) or with one conditional update (`where qty + $n <= limit`), never "read, then decide in Node, then write".
- All time math in Manila business dates and times through `rules/time.ts`; store UTC.

## 6. Queues and jobs

- Outbox pattern: write the message row in the same transaction as the change; a job sends it later with retry and backoff (`smartapp-integration`).
- Jobs pick work with `limit` and `for update skip locked` (or an advisory lock per job, `database.md` section 6) so two API copies never take the same row.
- Every job is idempotent: running it twice changes nothing more.

## 7. Big lists on screen

- Lists over about 100 rows use virtual scrolling (`@tanstack/react-virtual` is installed) or "show 50 more" (T95).
- Compute derived lists with `useMemo` keyed on the data, not on every render; never sort a list in place (copy first).
- Charts aggregate in SQL or core, then draw at most a few hundred points.

## 8. Measure, don't guess

- Load the `test-stress` pack (N28) before calling a list or query fast.
- A page or endpoint slower than the budget gets a measurement (browser Performance panel, `explain analyze`, Nest timing) before any rewrite. Add a summary table or cache only when a measured read is slow (T70).

## Before you say done

- [ ] No query in a loop; no `.find` inside `.map` over the same list
- [ ] Long lists page by cursor; sorting and totals happen in SQL on an index
- [ ] `explain` checked for new queries on orders, members or stamp entries
- [ ] Interval rules use half-open ranges and live in one core function plus one SQL guard
- [ ] Jobs and retries are idempotent; double taps are absorbed by a unique key
- [ ] Tried with the stress pack

## Sources (opened 2026-11-20 unless marked)

- PostgreSQL 17, LIMIT and OFFSET ("rows skipped by an OFFSET clause still have to be computed"): https://www.postgresql.org/docs/17/queries-limit.html
- PostgreSQL 17, Using EXPLAIN: https://www.postgresql.org/docs/17/using-explain.html
- PostgreSQL 17, Range types and exclusion constraints: https://www.postgresql.org/docs/17/rangetypes.html
- PostgreSQL 17, Multicolumn indexes: https://www.postgresql.org/docs/17/indexes-multicolumn.html
- Keyset pagination ("no offset"): https://use-the-index-luke.com/no-offset (blocked from the cloud session; summarised from course knowledge)
- Big O, hash maps, binary search, interval overlap: standard course material (Cormen et al.), not looked up
