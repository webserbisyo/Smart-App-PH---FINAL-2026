<!-- prettier-ignore-start -->
Task T06: Shop home with the banner carousel

Read first: AGENTS.md, docs/ux.md, docs/design-tokens.md, docs/components.md, docs/prompts/ref/storefront-rules.md sections 1 and 6, docs/prompts/ref/storefront-components.md section 3 (Home, Shop info), docs/SMART_APP_PH_BLUEPRINT.md section 7.2.

FOUNDER DECISIONS USED (change before running)
 - D3: banner carousel (ReUI c-carousel-11 dots + autoplay as in c-carousel-5) through the banner-carousel composition from T02: first banner is a plain priority image, carousel code loads after it, the owner's seconds (default 5), pauses on touch, hover, focus and off-screen, no autoplay under reduced motion, no carousel code for one banner, brand panel for none.
 - Customers never see empty sections: a section with no content is not rendered (no "Add a banner" text; that is for the owner's Editor preview later).
 - Members count shows only if the owner turned it on (off in every pack except kanto-smash).

Use the planned library components. Install anything missing with the shadcn CLI. If you hand-write a component instead, stop and tell me why before continuing.

GOAL
The first screen a customer sees from a Messenger link loads fast on slow data, shows what the shop is about and pushes them to the menu or to join the stamp card.

0. BEFORE YOU CODE
 - Branch ag/t06-shop-home from the latest main (after T04). Node 24.14.0. Post a short plan and wait for my OK. Never touch dashboard shell styling.

1. SECTIONS IN ORDER (apps/storefront/src/features/home; server components unless they need the device)
 1. Banners: banner-carousel with the shop's banners (21:9 frame like c-aspect-ratio-4 on phone, 16:9 on desktop); none → brand-panel (logo or initials, name, tagline on bg-shop-30 + grid pattern). Alt text from the pack.
 2. Announcement: alert pattern by tone (c-alert-5 info, c-alert-7 warning, c-alert-6 success), role status, hidden after endsAt.
 3. Closed or busy: c-empty-20 pattern card "Closed now · Opens 5:00 AM" + "Browse menu" (and "Schedule your order for later" when takeOrdersWhileClosed). Paused: "Not taking orders right now".
 4. Rewards card (c-card-17 pattern + DiceUI circular progress): guest → "Join and get 1 free stamp" + what the reward is; member → "5 of 8 · 3 more to a free Classic Smash"; reward ready → "Your reward is ready" (highlight token); card paused → "Stamps paused. Your stamps are safe."; card off → not rendered.
 5. Favourites row (only when the customer has hearts): DiceUI scroller + c-card-7 pattern cards (ShopImage 1:1).
 6. Categories: chips (c-button-27 pattern, h-11) with the category's Fluent icon (32 px img, width/height set, lazy) linking to /<slug>/menu?cat=<id>.
 7. Best sellers: featured items first (pack), then top sellers (mock); scroller of c-card-7 cards with "+" quick add when the item has one variant and no required groups (core rule), otherwise opens /menu?item=<id>.
 8. About: text with a More/Less toggle (c-button-35 pattern) after 4 lines.
 9. Hours: c-table-16 pattern, today highlighted, closures noted ("Closed Nov 1, All Saints' Day").
 10. Contact: c-item-4 rows for Call (tel:), Messenger (m.me link), Facebook, Get directions (plain Google Maps link from the pin; only when showAddress), address line.
 11. Members count (only when on): c-avatar-20 pattern with initials, "128 Suki members".
 12. Footer: shop name, Privacy link (T14 route; hide the link until T14 exists), "Powered by Smart App PH".
 - Sections the pack turns off are not rendered. "Demo shop" ribbon (small, top of content) for isDemo shops: "Demo shop · orders are not real".

2. PERFORMANCE
 - LCP = first banner or the brand panel: priority, sizes set, AVIF/WebP from imageSources(); everything below the fold lazy.
 - No Magic UI, motion or confetti on Home. The carousel chunk loads only after the first image (check with the build output and the Network tab).
 - Home is cached per shop (Cache Components / "use cache" with the shop slug); device parts (favourites, member state) render on the client inside client-only with skeletons the same size.

3. STATES
 - Loading (client parts): c-skeleton-8 pattern sized to the cards. Error: c-empty-2 pattern with Try again. Offline: banner from T04, cached content still shows. Long text: shop name and item names clamp; announcement 200 chars wraps. Big amounts: "from ₱12,345.50" never wraps.
 - test-blank: brand panel, closed/open card, About missing → hidden, Hours and Contact only; still looks finished. test-stress: 3 banners, long announcement, paused card.

4. TESTS
 - Add Home to tooling/e2e routes for all shops; e2e checks: carousel autoplay advances on desktop without reduced motion, does not advance with reducedMotion: 'reduce', and one-banner shops ship no carousel chunk.
 - Unit: section visibility rules (on/off, empty, closed, card states) in a pure function in features/home with a table test.

5. DOCS
 - components.md "Used in" for every pattern used. Tick T06 in PROGRESS.md, one CHANGELOG line.

DONE WHEN
 - All 5 demo shops + test-blank + test-stress look finished at 360, 390, 768, 1024 and 1280 px; Lighthouse mobile on /kanto-smash (Chrome DevTools, by hand): Performance ≥ 90, Accessibility 100, CLS < 0.1; first-load JS ≤ 300 KB gzipped.

CHECKS AND PR
 - pnpm format:check, pnpm check, pnpm lint, pnpm build and pnpm e2e green. Never weaken eslint or tsconfig, never skip a test. No workarounds: stop and show me any error.
 - Screenshots at 390 and 1280: kanto-smash, tala-apparel, test-blank, lola-remy closed (?now=…T04:30+08:00). gh pr create --base main, template filled, print the link. Finish with: PR link, what changed, how to test (with ?mock= and ?as= links), what I must do by hand.

OUT OF SCOPE: menu page and item sheet (T07), join flow (T12), owner Editor preview, privacy page (T14).
<!-- prettier-ignore-end -->
