# Components registry

The single list of UI parts we have. Check here before building anything. Updated in the same commit as every install or new reuse; a test in `packages/ui` fails if a file in `packages/ui/src/components`, `src/compositions` or `src/hooks` is missing from this table.

## Libraries (chosen)

| Library                                  | Use for                                                       | Install                                |
| ---------------------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| shadcn/ui on Base UI (style `base-nova`) | Primitives and blocks                                         | `pnpm exec shadcn add <name>`          |
| ReUI                                     | Richer parts (data grid, file upload, timeline...)            | `pnpm exec shadcn add @reui/<name>`    |
| DiceUI                                   | Specialised inputs and widgets (cropper, sortable, rating...) | `pnpm exec shadcn add @diceui/<name>`  |
| Magic UI                                 | Small delights only, never on core flows                      | `pnpm exec shadcn add @magicui/<name>` |

The shadcn CLI is an exact root devDependency, so every install uses the same pinned version. Icons: lucide. Charts: shadcn chart (Recharts), lazy-loaded. Each task's prompt names the components it needs; nothing is installed ahead of time.

## Where files go

- Primitives: `packages/ui/src/components/` (shared by both apps).
- Blocks (login, sign-up, dashboard sections): run the CLI from the app folder, then move the block into the feature or shell file that owns it (dashboard: `src/features/<area>/` or `src/app/shell/`), wired to our words and data. Remove parts of a block we have not planned (such as social sign-in buttons); never leave a disabled placeholder. The Blocks table below says where each block lives.
- Our compositions (only when 3 or more screens need the same arrangement): `packages/ui/src/compositions/`, with the founder's OK.
- Registry examples and starters are reference only: never imported, and excluded from Tailwind scanning (`@source not`).

## Rules

- Before installing, check this table; reuse what is here.
- After installing: add one row per file the CLI added, then fill "Used in" as screens start using it. Remove a row only after checking nothing uses the component.
- Library variants (badge, alert, button) are mapped once to our tokens (`-soft`, `-soft-foreground`, `shop`), never per screen.
- Toasts go through one `notify()` helper (placement and timing in `docs/ux.md`).
- If the CLI can't reach a registry, stop and tell the founder; never copy a component by hand.
- Installed files are checked by their own rules (decision T27): `packages/ui/tsconfig.components.json` without `exactOptionalPropertyTypes`, and a scoped ESLint override. Never edit them; a file marked "patched" in the table had a founder-approved fix.

## Installed

| Component                | Library              | Path                                                       | Used in                                       | Added |
| ------------------------ | -------------------- | ---------------------------------------------------------- | --------------------------------------------- | ----- |
| `add-to-cart`            | Opensource UI (copy) | `packages/ui/src/vendor/opensource-ui/add-to-cart.tsx`     | kit                                           | T02   |
| `alert-dialog`           | shadcn (base-nova)   | `packages/ui/src/components/alert-dialog.tsx`              | kit                                           | T02   |
| `aspect-ratio`           | shadcn (base-nova)   | `packages/ui/src/components/aspect-ratio.tsx`              | shop-image, brand-panel, kit                  | T02   |
| `attachment`             | shadcn (base-nova)   | `packages/ui/src/components/attachment.tsx`                | kit                                           | T02   |
| `avatar`                 | shadcn (base-nova)   | `packages/ui/src/components/avatar.tsx`                    | app-sidebar, account-menu, kit                | T05   |
| `badge`                  | shadcn (base-nova)   | `packages/ui/src/components/badge.tsx`                     | bottom-dock, nav-drawer, page-header, kit     | T05   |
| `banner`                 | DiceUI               | `packages/ui/src/components/banner.tsx`                    | kit                                           | T02   |
| `banner-carousel`        | composition          | `packages/ui/src/compositions/banner-carousel.tsx`         | kit                                           | T02   |
| `banner-carousel-slides` | composition          | `packages/ui/src/compositions/banner-carousel-slides.tsx`  | banner-carousel (lazy), kit                   | T02   |
| `bottom-dock`            | composition          | `packages/ui/src/compositions/bottom-dock.tsx`             | dashboard shell (phone), kit                  | T05   |
| `brand-panel`            | composition          | `packages/ui/src/compositions/brand-panel.tsx`             | kit                                           | T02   |
| `breadcrumb`             | shadcn (base-nova)   | `packages/ui/src/components/breadcrumb.tsx`                | top-bar, kit                                  | T05   |
| `bubble`                 | shadcn (base-nova)   | `packages/ui/src/components/bubble.tsx`                    | c-message-5 (kit)                             | T02b  |
| `button`                 | shadcn (base-nova)   | `packages/ui/src/components/button.tsx`                    | login-01, signup-01, shell, kit               | T01   |
| `card`                   | shadcn (base-nova)   | `packages/ui/src/components/card.tsx`                      | login-01, signup-01, kit                      | T01   |
| `carousel`               | shadcn (base-nova)   | `packages/ui/src/components/carousel.tsx`                  | banner-carousel, kit                          | T02   |
| `celebrate`              | composition          | `packages/ui/src/compositions/celebrate.ts`                | kit                                           | T02   |
| `checkbox`               | shadcn (base-nova)   | `packages/ui/src/components/checkbox.tsx`                  | kit                                           | T02   |
| `checkbox-group`         | DiceUI (patched T27) | `packages/ui/src/components/checkbox-group.tsx`            | kit                                           | T02   |
| `circular-progress`      | DiceUI               | `packages/ui/src/components/circular-progress.tsx`         | kit                                           | T02   |
| `client-only`            | DiceUI               | `packages/ui/src/components/client-only.tsx`               | kit                                           | T02   |
| `collapsible`            | shadcn (base-nova)   | `packages/ui/src/components/collapsible.tsx`               | kit (installed for sidebar-07)                | T05   |
| `confetti`               | Magic UI             | `packages/ui/src/components/confetti.tsx`                  | kit                                           | T02   |
| `count-up`               | composition          | `packages/ui/src/compositions/count-up.tsx`                | kit                                           | T02   |
| `dialog`                 | shadcn (base-nova)   | `packages/ui/src/components/dialog.tsx`                    | responsive-dialog, kit                        | T05   |
| `direction`              | DiceUI               | `packages/ui/src/components/direction.tsx`                 | rating, scroller (internal), kit              | T02   |
| `drawer`                 | shadcn (base-nova)   | `packages/ui/src/components/drawer.tsx`                    | nav-drawer, responsive-dialog, kit            | T05   |
| `dropdown-menu`          | shadcn (base-nova)   | `packages/ui/src/components/dropdown-menu.tsx`             | account-menu, kit                             | T05   |
| `empty`                  | shadcn (base-nova)   | `packages/ui/src/components/empty.tsx`                     | every dashboard empty page, editor, kit       | T05   |
| `field`                  | shadcn (base-nova)   | `packages/ui/src/components/field.tsx`                     | login-01, signup-01, kit                      | T01   |
| `grid-pattern`           | Magic UI             | `packages/ui/src/components/grid-pattern.tsx`              | brand-panel, kit                              | T02   |
| `hitbox`                 | DiceUI               | `packages/ui/src/components/hitbox.tsx`                    | banner-carousel, kit                          | T02   |
| `input`                  | shadcn (base-nova)   | `packages/ui/src/components/input.tsx`                     | login-01, signup-01, share-shop-sheet, kit    | T01   |
| `input-group`            | shadcn (base-nova)   | `packages/ui/src/components/input-group.tsx`               | kit                                           | T02   |
| `input-otp`              | shadcn (base-nova)   | `packages/ui/src/components/input-otp.tsx`                 | kit                                           | T02   |
| `item`                   | shadcn (base-nova)   | `packages/ui/src/components/item.tsx`                      | settings menu and list, kit                   | T05   |
| `label`                  | shadcn (base-nova)   | `packages/ui/src/components/label.tsx`                     | login-01, signup-01, kit                      | T01   |
| `like-toggle`            | Opensource UI (copy) | `packages/ui/src/vendor/opensource-ui/like-toggle.tsx`     | kit only                                      | T02   |
| `marker`                 | shadcn (base-nova)   | `packages/ui/src/components/marker.tsx`                    | kit                                           | T02   |
| `mask-input`             | DiceUI               | `packages/ui/src/components/mask-input.tsx`                | kit                                           | T02   |
| `message`                | shadcn (base-nova)   | `packages/ui/src/components/message.tsx`                   | kit                                           | T02   |
| `native-select`          | shadcn (base-nova)   | `packages/ui/src/components/native-select.tsx`             | kit                                           | T02   |
| `nav-drawer`             | composition          | `packages/ui/src/compositions/nav-drawer.tsx`              | bottom-dock More, kit                         | T05   |
| `number-ticker`          | Magic UI             | `packages/ui/src/components/number-ticker.tsx`             | count-up, kit                                 | T02   |
| `page-header`            | composition          | `packages/ui/src/compositions/page-header.tsx`             | every dashboard page, kit                     | T05   |
| `pending`                | DiceUI               | `packages/ui/src/components/pending.tsx`                   | kit                                           | T02   |
| `progress`               | shadcn (base-nova)   | `packages/ui/src/components/progress.tsx`                  | kit                                           | T02   |
| `qr-code`                | DiceUI               | `packages/ui/src/components/qr-code.tsx`                   | kit                                           | T02   |
| `radio-group`            | shadcn (base-nova)   | `packages/ui/src/components/radio-group.tsx`               | kit                                           | T02   |
| `rating`                 | DiceUI               | `packages/ui/src/components/rating.tsx`                    | kit                                           | T02   |
| `responsive-dialog`      | composition          | `packages/ui/src/compositions/responsive-dialog.tsx`       | share-shop-sheet, kit                         | T05   |
| `reui/alert`             | ReUI (patched T28)   | `packages/ui/src/components/reui/alert.tsx`                | c-alert-* (kit)                               | T02b  |
| `reui/badge`             | ReUI (patched T28)   | `packages/ui/src/components/reui/badge.tsx`                | c-badge-* and others (kit)                    | T02b  |
| `reui/frame`             | ReUI                 | `packages/ui/src/components/reui/frame.tsx`                | c-frame-1, c-card-16 (kit)                    | T02b  |
| `reui/icon-tile`         | ReUI                 | `packages/ui/src/components/reui/icon-tile.tsx`            | c-icon-tile-* (kit)                           | T02b  |
| `reui/number-field`      | ReUI                 | `packages/ui/src/components/reui/number-field.tsx`         | c-number-field-2, c-number-field-3 (kit)      | T02b  |
| `reui/scrollspy`         | ReUI                 | `packages/ui/src/components/reui/scrollspy.tsx`            | c-scrollspy-1, c-scrollspy-2 (kit)            | T02b  |
| `reui/stepper`           | ReUI                 | `packages/ui/src/components/reui/stepper.tsx`              | c-stepper-3, c-stepper-13, c-stepper-26 (kit) | T02b  |
| `reui/timeline`          | ReUI                 | `packages/ui/src/components/reui/timeline.tsx`             | c-timeline-3, c-timeline-7 (kit)              | T02b  |
| `scroll-area`            | shadcn (base-nova)   | `packages/ui/src/components/scroll-area.tsx`               | c-scrollspy-1, c-scrollspy-2 (kit)            | T02b  |
| `scroller`               | DiceUI               | `packages/ui/src/components/scroller.tsx`                  | kit                                           | T02   |
| `separator`              | shadcn (base-nova)   | `packages/ui/src/components/separator.tsx`                 | login-01, signup-01, top-bar, kit             | T01   |
| `sheet`                  | shadcn (base-nova)   | `packages/ui/src/components/sheet.tsx`                     | tablet menu, sidebar, kit                     | T05   |
| `shop-image`             | composition          | `packages/ui/src/compositions/shop-image.tsx`              | banner-carousel, kit                          | T02   |
| `shop-logo`              | composition          | `packages/ui/src/compositions/shop-logo.tsx`               | brand-panel, kit                              | T02   |
| `shop-theme`             | composition          | `packages/ui/src/compositions/shop-theme.tsx`              | kit                                           | T02   |
| `sidebar`                | shadcn (base-nova)   | `packages/ui/src/components/sidebar.tsx`                   | app-sidebar, kit                              | T05   |
| `skeleton`               | shadcn (base-nova)   | `packages/ui/src/components/skeleton.tsx`                  | sidebar, kit                                  | T05   |
| `skip-nav`               | DiceUI               | `packages/ui/src/components/skip-nav.tsx`                  | kit                                           | T02   |
| `spinner`                | shadcn (base-nova)   | `packages/ui/src/components/spinner.tsx`                   | kit                                           | T02   |
| `status`                 | DiceUI               | `packages/ui/src/components/status.tsx`                    | kit                                           | T02   |
| `switch`                 | shadcn (base-nova)   | `packages/ui/src/components/switch.tsx`                    | kit                                           | T02   |
| `table`                  | shadcn (base-nova)   | `packages/ui/src/components/table.tsx`                     | kit                                           | T02   |
| `tabs`                   | shadcn (base-nova)   | `packages/ui/src/components/tabs.tsx`                      | page-header, kit                              | T05   |
| `textarea`               | shadcn (base-nova)   | `packages/ui/src/components/textarea.tsx`                  | input-group, kit                              | T02   |
| `thermal-receipt`        | Opensource UI (copy) | `packages/ui/src/vendor/opensource-ui/thermal-receipt.tsx` | kit                                           | T02   |
| `toast`                  | shadcn (base-nova)   | `packages/ui/src/components/toast.tsx`                     | kit                                           | T02   |
| `toggle`                 | shadcn (base-nova)   | `packages/ui/src/components/toggle.tsx`                    | toggle-group, kit                             | T02   |
| `toggle-group`           | shadcn (base-nova)   | `packages/ui/src/components/toggle-group.tsx`              | kit                                           | T02   |
| `tooltip`                | shadcn (base-nova)   | `packages/ui/src/components/tooltip.tsx`                   | sidebar rail, kit                             | T05   |
| `use-form-factor`        | hook                 | `packages/ui/src/hooks/use-form-factor.ts`                 | app-shell, settings, kit                      | T05   |
| `use-keyboard-open`      | hook                 | `packages/ui/src/hooks/use-keyboard-open.ts`               | bottom-dock, kit                              | T05   |
| `use-mobile`             | hook                 | `packages/ui/src/hooks/use-mobile.ts`                      | sidebar, kit                                  | T05   |
| `use-reduced-motion`     | hook                 | `packages/ui/src/hooks/use-reduced-motion.ts`              | banner-carousel, count-up, kit                | T02   |
| `visually-hidden-input`  | DiceUI               | `packages/ui/src/components/visually-hidden-input.tsx`     | rating, checkbox-group (internal), kit        | T02   |

## Kit examples

The 119 ReUI patterns (`c-*`, decision D1) live only in `apps/dashboard/src/features/kit/examples/` and render on /kit under "Storefront patterns", one section per screen, in the picked demo shop's colours and photos (`features/kit/kit-shop.tsx`). Screens never import them: copy the pattern into the feature's own component. A tooling test (`tooling/kit-examples.test.ts`) fails if anything outside `features/kit` imports them. Two kit-only hooks came with them: `examples/hooks/use-file-upload.ts` (c-attachment-6) and `examples/hooks/use-copy-to-clipboard.ts` (c-button-41).

Changes from the ReUI source (T02b, decision D2): remote photos replaced with demo photos through `imageUrl()` (other shops' logos stand in for people's photos); raw colours mapped to tokens; brackets replaced with the spacing scale, named variants (`state-active:`, `state-completed:`, `state-inactive:`, `orientation-vertical:`, `data-active:`) and utilities (`h-full-less-*`, `max-h-vh-*`, `progress-thin`); 10 px text is `text-xs`; `c-input-group-37` without its popover; `c-carousel-11` reads the slide count from the carousel instead of setting state in an effect; `c-timeline-7` drops a separator override that never applied (no step is completed in it).

| Id                   | ReUI name                | Screen                     | Used for                                                                                   |
| -------------------- | ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------ |
| `c-alert-4`          | Payment Failure          | Receipt                    | Rejected c-alert-4, refund c-alert-5                                                       |
| `c-alert-5`          | Info Variant             | Home                       | Announcement c-alert-5 / c-alert-7 / c-alert-6                                             |
| `c-alert-6`          | Success Variant          | Home                       | Announcement c-alert-5 / c-alert-7 / c-alert-6                                             |
| `c-alert-7`          | Warning Variant          | How and where              | Too far / denied c-alert-7 / c-alert-8                                                     |
| `c-alert-8`          | Error Variant            | How and where              | Too far / denied c-alert-7 / c-alert-8                                                     |
| `c-alert-18`         | Feature Discovery        | Receipt                    | Install card c-alert-18 + iPhone steps c-stepper-13                                        |
| `c-alert-dialog-2`   | Small Size               | Basket                     | More c-dropdown-menu-16 + confirm c-alert-dialog-2                                         |
| `c-aspect-ratio-2`   | Standard                 | Item sheet                 | Photos c-carousel-11 (no autoplay) in c-aspect-ratio-2                                     |
| `c-aspect-ratio-3`   | Square                   | Menu                       | Grid photo c-aspect-ratio-3                                                                |
| `c-aspect-ratio-4`   | Ultrawide                | Home                       | Banners c-carousel-11 + autoplay as in c-carousel-5, frame c-aspect-ratio-4                |
| `c-attachment-5`     | Upload Queue             | Receipt                    | Proof attachment + c-attachment-6 + c-attachment-5                                         |
| `c-attachment-6`     | File Picker              | Receipt                    | Proof attachment + c-attachment-6 + c-attachment-5                                         |
| `c-avatar-4`         | Border Radius            | Shell                      | Top bar logo c-avatar-4 (square) / c-avatar-14 (initials fallback) / c-avatar-30 (loading) |
| `c-avatar-6`         | Status Dots              | Shell                      | Kit only: status dots                                                                      |
| `c-avatar-11`        | Group With Count         | Shell                      | Storefront dock: links like c-button-27, cart segment c-avatar-11 + count c-badge-19       |
| `c-avatar-14`        | Soft Fallbacks           | Shell                      | Top bar logo c-avatar-4 (square) / c-avatar-14 (initials fallback) / c-avatar-30 (loading) |
| `c-avatar-16`        | User Details             | Rewards and account        | Member chip c-avatar-16                                                                    |
| `c-avatar-20`        | Social Proof Pill        | Home                       | Members count c-avatar-20                                                                  |
| `c-avatar-30`        | Loading State            | Shell                      | Top bar logo c-avatar-4 (square) / c-avatar-14 (initials fallback) / c-avatar-30 (loading) |
| `c-avatar-35`        | Dropdown Menu            | Rewards and account        | Member menu c-avatar-35                                                                    |
| `c-badge-7`          | Outline                  | Menu                       | Menu badge: sample (preview only)                                                          |
| `c-badge-13`         | Primary Light            | Menu                       | Menu badge: new, best seller                                                               |
| `c-badge-14`         | Destructive Light        | Menu                       | Menu badge: sold out                                                                       |
| `c-badge-15`         | Success Light            | My orders                  | Status c-badge-22, c-badge-15, c-badge-14, c-badge-17                                      |
| `c-badge-17`         | Warning Light            | My orders                  | Status c-badge-22, c-badge-15, c-badge-14, c-badge-17                                      |
| `c-badge-19`         | Full Radius              | Shell                      | Storefront dock: links like c-button-27, cart segment c-avatar-11 + count c-badge-19       |
| `c-badge-22`         | Status Dot               | My orders                  | Status c-badge-22, c-badge-15, c-badge-14, c-badge-17                                      |
| `c-button-9`         | Large                    | Checkout                   | Place order c-button-9 + c-button-44 states + @diceui/pending                              |
| `c-button-11`        | Icon Button              | Menu                       | "+" c-button-11                                                                            |
| `c-button-19`        | Outline Icon Right       | Shell                      | Location bar c-button-19 (pill, chevron)                                                   |
| `c-button-24`        | Extra Small Icon         | Basket                     | Lines c-item-2 + c-number-field-2 + remove c-button-24 (Undo toast)                        |
| `c-button-27`        | Next Link                | Shell                      | Storefront dock: links like c-button-27, cart segment c-avatar-11 + count c-badge-19       |
| `c-button-35`        | More Less Toggle         | Home                       | About c-button-35                                                                          |
| `c-button-41`        | Copy Feedback            | Checkout                   | Send exactly + Copy c-button-41                                                            |
| `c-button-44`        | Async Action             | How and where              | Use my location c-button-44                                                                |
| `c-button-49`        | Go Back                  | Shell                      | Back c-button-49                                                                           |
| `c-card-1`           | Basic                    | Rewards and account        | Member QR @diceui/qr-code in c-card-1                                                      |
| `c-card-7`           | Inset Image              | Home                       | Favourites and best sellers @diceui/scroller + c-card-7                                    |
| `c-card-16`          | Badge & Actions          | Rewards and account        | Reward c-card-16 + Claim c-button-44 + @magicui/confetti                                   |
| `c-card-17`          | Icon & Link              | Home                       | Reward or join card c-card-17 + @diceui/circular-progress                                  |
| `c-carousel-5`       | Autoplay                 | Home                       | Banners c-carousel-11 + autoplay as in c-carousel-5, frame c-aspect-ratio-4                |
| `c-carousel-11`      | Dots Navigation          | Home                       | Banners c-carousel-11 + autoplay as in c-carousel-5, frame c-aspect-ratio-4                |
| `c-checkbox-5`       | Label & Description      | Checkout                   | Remember me c-checkbox-5                                                                   |
| `c-checkbox-11`      | Card Rows                | Item sheet                 | Multi add-ons @diceui/checkbox-group with c-checkbox-11 rows                               |
| `c-checkbox-19`      | Badge Group              | Item sheet                 | Group header c-radio-group-6 + c-checkbox-19                                               |
| `c-collapsible-1`    | Basic                    | Checkout                   | Summary c-collapsible-1                                                                    |
| `c-dialog-3`         | Sticky Footer            | Item sheet                 | Phone c-drawer-1, desktop c-dialog-3                                                       |
| `c-drawer-1`         | Scrollable Content       | Item sheet                 | Phone c-drawer-1, desktop c-dialog-3                                                       |
| `c-drawer-2`         | Right Side               | Shell                      | Basket drawer on desktop c-drawer-2                                                        |
| `c-dropdown-menu-13` | Share & Export           | Receipt                    | Actions c-dropdown-menu-13                                                                 |
| `c-dropdown-menu-16` | Quick Actions            | Basket                     | More c-dropdown-menu-16 + confirm c-alert-dialog-2                                         |
| `c-empty-2`          | No Results               | Menu                       | No results c-empty-2                                                                       |
| `c-empty-4`          | Add Button               | My orders                  | Empty c-empty-4                                                                            |
| `c-empty-7`          | Inbox                    | Shell                      | Not found c-empty-7                                                                        |
| `c-empty-9`          | No Notifications         | Shop info and system pages | Offline page c-empty-9                                                                     |
| `c-empty-11`         | Bookmarks                | Basket                     | Empty c-empty-11                                                                           |
| `c-empty-15`         | Stacked Products         | Menu                       | No products c-empty-15                                                                     |
| `c-empty-20`         | Events Calendar          | Home                       | Closed c-empty-20                                                                          |
| `c-field-2`          | Input & Textarea         | How and where              | Rider details c-field-2 + c-input-13 + c-input-18                                          |
| `c-field-10`         | Notification Preferences | Rewards and account        | Opt-ins c-field-10                                                                         |
| `c-frame-1`          | Basic                    | Rewards and account        | Stamp card frame (with grid-pattern)                                                       |
| `c-icon-tile-6`      | Circular                 | Rewards and account        | Stamp tile: empty                                                                          |
| `c-icon-tile-14`     | Status Overlay           | Rewards and account        | Stamp tile: pending                                                                        |
| `c-icon-tile-16`     | Solid Tones              | Rewards and account        | Stamp tile: stamped                                                                        |
| `c-input-2`          | With Label               | Checkout                   | Name c-input-2 + c-input-5                                                                 |
| `c-input-5`          | Error Message            | Checkout                   | Name c-input-2 + c-input-5                                                                 |
| `c-input-13`         | Required Indicator       | How and where              | Rider details c-field-2 + c-input-13 + c-input-18                                          |
| `c-input-18`         | Optional Badge           | How and where              | Rider details c-field-2 + c-input-13 + c-input-18                                          |
| `c-input-group-3`    | Invalid                  | How and where              | Pin link c-input-group-10 + c-input-group-24 (valid) + c-input-group-3 (invalid)           |
| `c-input-group-5`    | Suffix Icon              | Rewards and account        | Join email c-input-group-5                                                                 |
| `c-input-group-10`   | Action Button            | How and where              | Pin link c-input-group-10 + c-input-group-24 (valid) + c-input-group-3 (invalid)           |
| `c-input-group-15`   | Loading Spinner          | Menu                       | Drop its popover) + c-input-group-15 (loading)                                             |
| `c-input-group-24`   | Success Indicator        | How and where              | Pin link c-input-group-10 + c-input-group-24 (valid) + c-input-group-3 (invalid)           |
| `c-input-group-37`   | Order Search             | Menu                       | Search c-input-group-37 (search + clear                                                    |
| `c-input-otp-6`      | Verification Card        | Rewards and account        | Code c-input-otp-6                                                                         |
| `c-item-1`           | Variants                 | How and where              | Fee line c-item-1                                                                          |
| `c-item-2`           | Icon & Actions           | Menu                       | Row c-item-2                                                                               |
| `c-item-4`           | Navigation Links         | Home                       | Contact c-item-4                                                                           |
| `c-item-10`          | Header & Footer          | My orders                  | Active card c-item-10                                                                      |
| `c-marker-2`         | Tool Call Log            | Receipt                    | Thread c-message-5 + c-marker-2                                                            |
| `c-message-5`        | Shared Files             | Receipt                    | Thread c-message-5 + c-marker-2                                                            |
| `c-native-select-2`  | Grouped Options          | How and where              | Slots c-native-select-2                                                                    |
| `c-number-field-2`   | Small Size               | Basket                     | Lines c-item-2 + c-number-field-2 + remove c-button-24 (Undo toast)                        |
| `c-number-field-3`   | Large Size               | Item sheet                 | Qty c-number-field-3                                                                       |
| `c-progress-2`       | Small                    | Receipt                    | Pay countdown c-alert-7 + c-progress-2 (→ c-alert-8 at 0)                                  |
| `c-radio-group-3`    | Descriptions             | How and where              | ASAP or later c-radio-group-3                                                              |
| `c-radio-group-4`    | Invalid                  | Item sheet                 | Missing required c-radio-group-4                                                           |
| `c-radio-group-6`    | Legend & Description     | Item sheet                 | Group header c-radio-group-6 + c-checkbox-19                                               |
| `c-radio-group-7`    | Descriptive Cards        | How and where              | Order type c-radio-group-7                                                                 |
| `c-radio-group-8`    | Card Separators          | How and where              | Zones c-radio-group-8                                                                      |
| `c-radio-group-9`    | Card Icons               | Checkout                   | Pay methods c-radio-group-9 + c-radio-group-15                                             |
| `c-radio-group-15`   | Badges                   | Checkout                   | Pay methods c-radio-group-9 + c-radio-group-15                                             |
| `c-radio-group-17`   | Pricing Tiers            | Item sheet                 | Food sizes c-radio-group-17                                                                |
| `c-scrollspy-1`      | Vertical Nav             | Menu                       | Desktop rail c-scrollspy-1                                                                 |
| `c-scrollspy-2`      | Horizontal Nav           | Menu                       | Chips c-scrollspy-2 in @diceui/scroller                                                    |
| `c-separator-6`      | Order Summary            | Basket                     | Totals c-separator-6                                                                       |
| `c-skeleton-2`       | Card                     | Item sheet                 | Loading c-skeleton-2                                                                       |
| `c-skeleton-3`       | Text Paragraphs          | Receipt                    | Loading c-skeleton-3, thread c-skeleton-10                                                 |
| `c-skeleton-4`       | Form                     | Checkout                   | Loading c-skeleton-4                                                                       |
| `c-skeleton-7`       | List With Actions        | Menu                       | Loading c-skeleton-7                                                                       |
| `c-skeleton-8`       | Card Grid                | Home                       | Loading c-skeleton-8                                                                       |
| `c-skeleton-9`       | Profile Page             | Rewards and account        | Loading c-skeleton-9                                                                       |
| `c-skeleton-10`      | Chat Messages            | Receipt                    | Loading c-skeleton-3, thread c-skeleton-10                                                 |
| `c-spinner-3`        | In Badges                | Rewards and account        | Pending c-spinner-3                                                                        |
| `c-spinner-8`        | Full Page                | Shell                      | First load c-spinner-8                                                                     |
| `c-stepper-3`        | Loading State            | Receipt                    | Kit only: alternative to c-stepper-26 (decision D10)                                       |
| `c-stepper-13`       | Vertical Descriptions    | Receipt                    | Install card c-alert-18 + iPhone steps c-stepper-13                                        |
| `c-stepper-26`       | Timestamped Checkpoints  | Receipt                    | Status c-stepper-26 (timestamped)                                                          |
| `c-switch-2`         | With Description         | Checkout                   | Reward switch c-switch-2                                                                   |
| `c-table-16`         | Employee Profile         | Home                       | Hours c-table-16                                                                           |
| `c-tabs-2`           | Line Variant             | Rewards and account        | Tabs c-tabs-2                                                                              |
| `c-tabs-7`           | Badge Counts             | My orders                  | Active / Past c-tabs-7                                                                     |
| `c-textarea-6`       | Auto-Resize Counter      | Item sheet                 | Note c-textarea-6                                                                          |
| `c-timeline-3`       | Order Status             | Receipt                    | Kit only: alternative to c-stepper-26 (decision D10)                                       |
| `c-timeline-7`       | Roadmap Items            | Rewards and account        | History c-timeline-7                                                                       |
| `c-toggle-6`         | Icon & Label             | Menu                       | Favourites chip c-toggle-6                                                                 |
| `c-toggle-9`         | Icon Swap                | Menu                       | Heart c-toggle-9                                                                           |
| `c-toggle-group-4`   | Custom Spacing           | Item sheet                 | Retail axes c-toggle-group-4                                                               |
| `c-tooltip-12`       | Disabled Button          | Shell                      | Icon tooltips and disabled reasons c-tooltip-12                                            |

## Vendored copies

Opensource UI parts are copied by hand from the official pages (the one founder-approved exception to "never copy by hand", decision N24) into `packages/ui/src/vendor/opensource-ui/`. Each file starts with its source URL, the date copied (2026-10-25) and "MIT, Opensource UI by Bidyut Kundu". Colours, shadows and inline styles were moved to tokens and `globals.css` utilities. Nothing auto-updates: re-copy by hand if the source changes.

| File                  | Source                                                    |
| --------------------- | --------------------------------------------------------- |
| `add-to-cart.tsx`     | https://opensourceui.in/components/add-to-cart-button     |
| `thermal-receipt.tsx` | https://opensourceui.in/components/thermal-receipt        |
| `like-toggle.tsx`     | https://opensourceui.in/components/like-button (kit only) |

## Blocks

| Block        | Command                                                             | Lives in                                                                                                                                                    | Added |
| ------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `login-01`   | `pnpm exec shadcn add login-01`                                     | `apps/dashboard/src/features/auth/login-form.tsx`                                                                                                           | T01   |
| `signup-01`  | `pnpm exec shadcn add signup-01`                                    | `apps/dashboard/src/features/auth/signup-form.tsx`                                                                                                          | T01   |
| `sidebar-07` | `pnpm exec shadcn add sidebar-07 -c apps/dashboard` (no overwrites) | `apps/dashboard/src/app/shell/app-sidebar.tsx` and `account-menu.tsx` (team switcher, nav-projects and nav-main replaced by the shop header and flat links) | T05   |

## The `/kit` page

- Dashboard route `/kit`, available only when `import.meta.env.DEV` or `VITE_SHOW_KIT=true`. Not in production builds.
- One section per installed component: name, library, a live example in its main states (default, disabled, loading, error), light and dark toggle, and where it is used.
- Also shows the colour tokens (`docs/design-tokens.md`) as swatches with their names, every `STATUS_TONE` badge, and a shop-brand switcher for the 5 demo shops with the generated palette and its contrast result.
- From the mock data task on: a "Mock data" panel with counts and Reset.
