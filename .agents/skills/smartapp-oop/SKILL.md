---
name: smartapp-oop
description: Object-oriented design rules for Smart App PH (the Object-Oriented Programming course applied to TypeScript, NestJS modules and providers, and our mock and API adapters). Use it when you create or change a NestJS module, controller, service, guard, pipe or filter, a data adapter in packages/data, a shared rule in packages/core, or when code starts branching on a kind of thing (shop type, payment method, order type).
---

# Smart App PH object design (Object-Oriented Programming)

We write TypeScript in three tiers. React screens are functions, so most OOP here lives in NestJS (classes with dependency injection) and in the shapes behind `packages/data` (one interface, two implementations). This skill turns the OOP course (encapsulation, abstraction, inheritance, polymorphism, SOLID, design patterns) into rules for that code.

AGENTS.md wins over this skill (especially rule 4 imports and rule 5 types: no `any`, no `as`, no ts-ignore).

## 1. The four pillars, our way

| Pillar        | Our rule                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Encapsulation | a module exports only what others need; the database client, Supabase secret key and SQL stay inside `apps/api` data providers. Order rules are reached through functions like `canAdvance`, never by poking at fields         |
| Abstraction   | screens see `useX` hooks and adapter methods from `docs/api.md`, never fetch, SQL or mock internals                                                                                                                            |
| Inheritance   | avoid it. Prefer composition: small providers injected into a service. No base classes deeper than one level; no table inheritance in SQL                                                                                      |
| Polymorphism  | one interface, several implementations: the mock adapter and the API adapter implement the same methods (rule 3). Different behaviour per payment method or order type comes from a lookup or strategy object, not `if` chains |

## 2. SOLID in NestJS

- **Single responsibility**: a controller only maps HTTP to a service call (parse input with the shared Zod schema, call, return). A service holds one area's use cases. A data provider holds one area's SQL. A guard only decides "may this request continue?".
- **Open/closed**: add a new payment method by adding a row to its `as const` list and its strategy entry, not by editing ten `switch` statements.
- **Liskov**: any adapter can replace another: same method names, same input and output schemas, same error codes (mocks throw the codes the API returns).
- **Interface segregation**: a screen's hook asks for the narrow method it needs (`useSavePayments`), not a god "API" object.
- **Dependency inversion**: services depend on injected providers (Nest DI), not on `new PgClient()` or module-level singletons, so tests can swap them with `Test.createTestingModule(...).overrideProvider(...)`.

## 3. NestJS building blocks (one job each)

| Block       | Job                                                        | Our rule                                                                                                         |
| ----------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Module      | groups one area (shop, catalog, orders, members, platform) | one module per area in `A-mvp.md` order; areas talk through exported services, never each other's data providers |
| Controller  | HTTP in, HTTP out                                          | every route has `@Public()` or `@Can()` (rule 12); no business rules                                             |
| Service     | the use case                                               | validates the business rule, opens the request transaction, calls SQL functions for money, counts and stamps     |
| Provider    | anything injectable (data access, clock, Meta client)      | inject a clock provider so tests can freeze Manila time                                                          |
| Guard       | authorization                                              | Auth (JWT) → Tenant (`tenant_members`) → Permission (`@Can`)                                                     |
| Pipe        | input validation                                           | the shared Zod schema; unknown keys stripped; failure = `invalid_input` with `fieldErrors`                       |
| Filter      | errors out                                                 | the one global filter makes `ApiError`; map database constraint names to codes there or in the service           |
| Interceptor | wrap a call (timing, logging without customer data)        | no business logic in interceptors                                                                                |

Write NestJS files by hand (no Nest CLI). Keep a module's files together: `orders.module.ts`, `orders.controller.ts`, `orders.service.ts`, `orders.data.ts`, `orders.service.test.ts`.

## 4. Patterns we use (and where)

- **Adapter**: `packages/data/src/adapters` (mock and API) behind one contract.
- **Strategy**: per payment method (`isTransfer`, `isPayLater`), per order type (timeline steps), per reward kind (discount, free item, custom prize). A map from the closed list to its behaviour, typed so a missing entry is a compile error (`Record<PaymentMethod, …>` or `satisfies`).
- **Repository / data mapper**: one data provider per area turns rows (snake_case) into core shapes (camelCase) with the Zod schema; nothing else knows table names.
- **Value object**: money is integer centavos with helpers in core (`formatPeso` and friends); dates are Manila business dates with helpers in `rules/time.ts`. Pass these, not loose numbers and strings with meaning in their names.
- **State machine**: statuses move only through one rule function (`smartapp-analysis` section 5).
- **Factory**: demo data from shop packs (`packages/core/src/demo`), never hand-built objects in tests.

## 5. TypeScript habits that replace casts

- Discriminated unions with a `kind` or `status` field, and an exhaustive `switch` that ends in a `never` check.
- Type guards (`function isRecord(x: unknown): x is Record<string, unknown>`) and Zod `safeParse` at every boundary instead of `as`.
- `readonly` arrays and `as const` lists; return new objects instead of mutating inputs.
- No classes in `packages/core` unless they hold state; plain functions and types are easier to share with React and SQL tests.
- **Never compare the shop type** (rule 7): food vs retail differences come from shop settings and words, not `if (kind === 'food')`.

## 6. Tests follow the objects

- Each service is tested with its providers replaced (`Test.createTestingModule`), each rule function directly, each adapter against the same contract test.
- A test names the behaviour ("a cash order may start unpaid"), not the method.

## Before you say done

- [ ] Each new class or module has one job; controllers hold no rules
- [ ] Behaviour that varies by a closed list uses a typed map or strategy, with a compile error if an entry is missing
- [ ] No `any`, `as`, ts-ignore; boundaries parse with Zod
- [ ] Dependencies are injected, so tests can replace them
- [ ] Mock and API adapters still pass the same contract tests

## Sources (opened 2026-11-20 unless marked)

- NestJS, Custom providers (dependency injection): https://docs.nestjs.com/fundamentals/custom-providers
- NestJS, Guards ("a single responsibility... authorization"): https://docs.nestjs.com/guards
- NestJS, Lifecycle events: https://docs.nestjs.com/fundamentals/lifecycle-events
- SOLID (Robert C. Martin), Strategy/Adapter/Repository (Gamma et al.; Fowler), Value Object (Fowler): standard course material, not looked up (refactoring.guru and martinfowler.com were blocked from the cloud session)
