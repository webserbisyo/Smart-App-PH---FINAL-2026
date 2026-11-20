# Capstone paper (draft)

**Smart App PH: An Installable Ordering, Payment-Proof and Stamp-Card Platform for Small Philippine Food and Retail Shops**

Draft in the usual five-chapter capstone format, written only from this repo and the founder's decisions (decision T104). Anything that needs real research or real data is marked **[Needed]** and left empty on purpose: no study, number or quote here is made up. People-facing paper, not a rule doc: where it differs from `blueprints/` or `decisions.md`, those win.

## Chapter 1. Introduction

### 1.1 Project context

Small Philippine businesses such as cafés, burger stands, bakeshops, water refilling stations and clothing sellers take most orders through Facebook Messenger, calls and walk-ins. Orders get lost in long chats, GCash and Maya payments arrive as screenshots that are hard to check, and owners have no list of regular customers. Delivery platforms solve ordering but take a commission on every order and keep the customer.

**[Needed]** Local figures on MSME count, digital payment use and e-wallet adoption, each with a citable source, and quotes from owner interviews.

### 1.2 Purpose and description

Smart App PH gives each shop its own installable storefront app and an owner dashboard. Customers order from the shop's own link or QR code, pay the shop directly, upload proof, and join the shop's stamp card. The founder runs the platform from a Super Admin panel.

### 1.3 Objectives

**General:** to design, build and evaluate a multi-shop ordering platform with an installable storefront, a stamp card and an owner dashboard for small Philippine food and retail shops.

**Specific:**

1. To let customers browse, order and pay from a phone without an account, in under a minute.
2. To support walk-in, pickup (now or scheduled) and delivery by zone.
3. To record payments by cash, cash on delivery, GCash, Maya, bank and QR Ph with proof that the owner checks, and to block reused references.
4. To let customers join as members with a 6-digit email code, earn stamps on completed paid orders and redeem rewards.
5. To give owners one dashboard for orders, menu, members, sales, the look of their app and settings.
6. To keep every shop's data separate, tested per table.
7. To evaluate the system with ISO/IEC 25010 quality characteristics and the System Usability Scale.

### 1.4 Scope and limitations

Scope: every page in `blueprints/features.md` (MVP A). Limitations: payments are checked by hand, not by a gateway; order slips are not BIR official receipts; iPhone users add the app to the home screen themselves; delivery is booked in the rider's own app; no stock counts at launch; no POS, staff accounts or promotions (MVP B).

### 1.5 Significance

- **Shop owners:** fewer missed orders, safer payment checks, a member list they own, a professional app for a flat ₱399 a month.
- **Customers:** a clear menu, an order number with live status, a receipt and rewards for coming back.
- **Developers and students:** a worked example of a multi-tenant three-tier web system with tested data isolation.

### 1.6 Definition of terms

PWA, tenant, RLS (row-level security), stamp card, member, proof of payment, order token, Conversions API. **[Needed]** one plain line each, written for a non-technical panel.

## Chapter 2. Review of related literature and systems

### 2.1 Related systems

| System                      | Strength                      | Gap for our shops                                                       |
| --------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| GrabFood, foodpanda         | Reach and riders              | Commission; the platform owns the customer; weak for walk-in and pickup |
| Facebook Page and Messenger | Free, everyone uses it        | No order list, no prices, no payment check                              |
| POS apps                    | Counter selling, some loyalty | Built for the cashier, not the customer's phone                         |
| Store builders              | Full online stores            | Priced in dollars, built for shipping                                   |

**[Needed]** Verify each row against the product's current site, with the date checked.

### 2.2 Related literature

**[Needed]** 10 to 15 studies, local and foreign, from the last 5 to 10 years, on: MSME digital adoption in the Philippines; e-wallet use (GCash, Maya); loyalty programs and repeat purchase; progressive web apps on low-end phones; usability of ordering apps. Each with author, year and a one-line finding.

### 2.3 Synthesis

**[Needed]** after 2.2: what the studies agree on, and the gap Smart App PH fills.

## Chapter 3. Methodology

### 3.1 Research design

Descriptive (owner interviews, review of existing systems) and developmental (build, test, evaluate).

### 3.2 Respondents and sampling

Purposive sampling. Usability tests with 5 owners and 5 customers per round, because about five testers of one kind find most usability problems (Nielsen Norman Group). **[Needed]** the real respondents, consent forms and dates.

### 3.3 Development model

Iterative and incremental, MVP first: foundation, kit and app shells, storefront screens on sample data, dashboard screens on sample data, backend area by area, then launch (phases 0 to 5 in `blueprints/A-mvp.md` and `PROGRESS.md`). Each area is one slice: tables, API, screens.

### 3.4 Technical background

Next.js storefront and Vite dashboard on Vercel; NestJS API on Railway (Singapore); Supabase Postgres 17, Auth and Storage (Singapore); TypeScript, Zod, TanStack Query, Tailwind and installed shadcn-based components. Exact versions: `blueprints/foundation.md` section 2.

### 3.5 System analysis and design

- Context diagram, data flow diagrams, entity relationship diagrams and the data dictionary: `blueprints/database.md` and the database blueprint doc.
- Normalization to 3NF, with copies kept on purpose (order lines keep the item name and price at order time).
- Order and payment state diagram: the `smartapp-analysis` skill.
- Architecture: `blueprints/system.md` section 6.

### 3.6 Testing

Unit tests (Vitest), 99 database tests (pgTAP) including a cross-shop test per table, browser smoke tests (Playwright), a UI scan of every route at phone, tablet and desktop, and the launch acceptance list (`blueprints/A-mvp.md` section 5).

### 3.7 Evaluation

ISO/IEC 25010:2023 names nine product quality characteristics. Our measure for each:

| Characteristic         | Measure                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| Functional suitability | Every launch acceptance item passes                                                         |
| Performance efficiency | Lighthouse mobile 90+; LCP 2.5 s, INP 200 ms, CLS 0.1 or better; 300 KB JavaScript per page |
| Compatibility          | 360 to 1280 px, Android Chrome and iPhone Safari                                            |
| Interaction capability | SUS of 68 or more; task completion and time; WCAG 2.2 AA checks                             |
| Reliability            | Daily backups restored once; double-tap and expiry tests pass                               |
| Security               | OWASP API Security Top 10 (2023) review; cross-shop tests                                   |
| Maintainability        | CI green; strict types; one fact in one place                                               |
| Flexibility            | A new shop or module is turned on without code changes for other shops                      |
| Safety                 | No customer data in logs; proofs deleted after 30 days                                      |

### 3.8 Statistical treatment

Frequency and percentage, weighted mean on a 5-point scale, and the standard SUS score.

### 3.9 Ethics

Written consent before each interview and test; no real customer data in test records; Data Privacy Act (RA 10173).

## Chapter 4. Results and discussion

**[Needed]** after the pilot: acceptance results, Lighthouse and Web Vitals numbers, SUS scores, ISO 25010 ratings, owner feedback, and what changed because of it. On 2026-11-20 only build results exist: every MVP A screen built and approved on sample data; 53 tables with 99 passing database tests.

## Chapter 5. Summary, conclusions and recommendations

**[Needed]** after Chapter 4. Recommendations will draw on `blueprints/B-full.md` (staff, POS, inventory, online payments, native app).

## References used so far

- Nielsen Norman Group, Why You Only Need to Test with 5 Users: https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/
- W3C, Web Content Accessibility Guidelines 2.2: https://www.w3.org/TR/WCAG22/
- Google, web-vitals thresholds: https://github.com/GoogleChrome/web-vitals
- OWASP API Security Top 10 (2023): https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- ISO/IEC 25010:2023 product quality model: https://www.iso.org/standard/78176.html (the nine names are from course knowledge; the full text is paid)
- Brooke, J. (1996). SUS: A quick and dirty usability scale (course material, not opened)

**[Needed]** the school's citation style (APA 7th is common) and the format the adviser wants.
