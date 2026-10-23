<!-- prettier-ignore-start -->
Task T05: Dashboard shell (sidebar, tablet rail, phone dock) with empty pages

Read first: AGENTS.md, docs/blueprints/foundation.md, docs/ux.md (sections 1 to 3), docs/design-tokens.md, docs/components.md, docs/SMART_APP_PH_BLUEPRINT.md sections 4.3 to 4.5 only.
Reference only (read, never copy wholesale; rewrite with lucide icons and our tokens): old public repo webserbisyo/Smart-App-PH-MVP: packages/ui/src/patterns/BottomDock.tsx, MoreMenu.tsx, AppShell.tsx, packages/ui/src/hooks/use-form-factor.ts, use-keyboard-open.ts, apps/dashboard/src/app/shell/Shell.tsx, and the shell parts of packages/ui/src/styles/globals.css and tokens.css. A local copy may exist at ~/Project/smart-app-ph-mvp.

GOAL
Final dashboard navigation on phone, tablet and desktop, every MVP A page as an empty page, and shell parts built once so the storefront shell (T04) reuses them.

1. INSTALL (already run by the other agent; verify only)
 a. pnpm exec shadcn add sidebar breadcrumb collapsible dropdown-menu avatar sheet drawer tooltip skeleton tabs badge empty item -c packages/ui
 b. pnpm exec shadcn add sidebar-07 -c apps/dashboard (No to overwriting anything in packages/ui)
 c. These must exist in packages/ui, installed by the CLI: sidebar, breadcrumb, separator, collapsible, dropdown-menu, avatar, button, input, sheet, skeleton, tooltip, use-mobile (hook), drawer, tabs, badge, empty, item. If any is missing or misplaced: stop and report, never install another way or write it by hand.
 d. Package rules:
    - cn 0.4.0 (shadcn's official package) is approved: in the pnpm-workspace.yaml catalog, "catalog:" in packages/ui, and in apps/dashboard only if its files import "cn".
    - packages/ui/src/lib/utils.ts is a one-line re-export: export { cn } from 'cn' (ReUI items still import from lib/utils).
    - clsx and tailwind-merge removed from packages/ui if nothing imports them; otherwise keep and report what does.
    - lucide-react 1.55.0 in the catalog; "catalog:" in packages/ui and apps/dashboard.
    - Any other new package: stop and report.
    - No "IconPlaceholder", "@/registry/" or "app/(create)" anywhere. Block imports point to "@smartapp/ui/components/..." and "@smartapp/ui/hooks/..." without hand fixes. No Next.js demo page. Never bypass minimumReleaseAge. No edits to files the CLI put in packages/ui/src/components or packages/ui/src/hooks.
    - Only the 5 block files under apps/dashboard (app-sidebar, nav-main, nav-projects, nav-user, team-switcher); no primitives there.

2. SHARED PARTS IN packages/ui (approved compositions; nothing else new without asking)
 - src/lib/nav.ts: type NavItem = { id, label, icon (ReactNode), link (a link element from the app: TanStack Link or Next Link), active, count? }. packages/ui never imports a router.
 - src/hooks/use-form-factor.ts: 'phone' < 768, 'tablet' 768 to 1023, 'desktop' 1024 and up (useSyncExternalStore + matchMedia).
 - src/hooks/use-keyboard-open.ts: true while the on-screen keyboard is open (visualViewport).
 - src/compositions/bottom-dock.tsx: floating pill nav. Props: label, items: NavItem[] (max 5, or 4 plus More), optional more: { label, items: NavItem[] }. Each slot renders the item's link through Base UI useRender with aria-current, a lucide icon in a pill that highlights when active, the label always shown, and a Badge when count > 0. Slot styles in ONE exported class constant (dockSlotClass) reused by every slot and the More button. Height var(--dock-height), var(--dock-offset) above the safe area, width full minus 2rem, max var(--dock-max-width), 56 px targets, hidden with keyboard-open, never hides on scroll.
 - src/compositions/nav-drawer.tsx: bottom Drawer showing NavItem[] as tiles (same item type, same active and badge logic). The dock's More opens it; More looks active when one of its items is active.
 - src/compositions/page-header.tsx: title, optional actions, optional tabs: NavItem[] rendered with the installed Tabs as links (the URL decides the active tab).
 - packages/ui/package.json exports ./compositions/*.
 - Each composition gets a /kit section and a row in docs/components.md (Library: "composition").

3. CSS AND TOKENS (one place each)
 - tokens.css: any --sidebar-* vars the CLI added live here (light and dark), mapped to existing tokens, no hex. Add --dock-height 4rem, --dock-offset 0.75rem, --dock-max-width 27.5rem, --rail-width 4.5rem, --sidebar-width 15.5rem.
 - globals.css: custom variants shell-phone, shell-tablet, shell-desktop (data-shell) and keyboard-open (data-keyboard); utilities pt-safe, pb-safe, pb-dock.
 - Update docs/design-tokens.md. No new CSS files, no arbitrary values, no inline style except cssVars().

4. DASHBOARD FOLDERS (kebab-case file names everywhere)
 - src/app/: router.tsx, env.ts (Zod; add VITE_STOREFRONT_URL to .env.example), supabase.ts, guards.ts, shop.ts (current demo shop: name, slug, kind, initials), nav.ts, use-nav-items.ts, shell/ (app-shell.tsx, app-sidebar.tsx, top-bar.tsx, share-shop-sheet.tsx, account-menu.tsx)
 - src/features/<area>/screens/: one file per page; login and signup in features/auth/, /kit in features/kit/screens/kit.tsx; remove src/pages, src/components/blocks and src/components if empty; delete unused Vite template assets.
 - Tabs defined once per area (features/catalog/tabs.ts, features/members/tabs.ts); every page of that area reads them. Insights uses ?range=7d|30d.
 - Features never import each other.

5. ONE NAV LIST
 - src/app/nav.ts: id, path, lucide icon, words key, placement 'dock' or 'more'.
   Dock: Home (house), Orders (receipt-text), Menu or Products (utensils for food, package for retail), Members (users). More: Editor (paintbrush), Insights (chart-column), Settings (settings). Footer: View my shop (external-link), Share my shop (qr-code).
 - src/app/use-nav-items.ts: nav.ts to NavItem[] (TanStack Link with preload="intent", active from the current route including sub-routes, label from words and vocab). The sidebar, rail, dock and nav drawer ALL use this hook; no other nav list anywhere.
 - packages/core: vocab(kind): food gives "Menu", retail gives "Products". Never compare the shop kind anywhere else. Kind and name come from the owner's demo shop (app_metadata.demo_shop + the demo shops list); default food. demoShop exposed on the claims in packages/data.
 - All visible text in packages/core/src/words.ts.

6. RESPONSIVE SHELL (one tree; layout from useFormFactor via data-shell)
 Phone < 768: no sidebar on screen. bottom-dock with Home, Orders, Menu or Products, Members, More; More opens nav-drawer with Editor, Insights, Settings, View my shop, Share my shop, Account. Top bar: page title, Back on sub-pages, account avatar menu. Main gets pb-dock.
 Tablet 768 to 1023: icon rail var(--rail-width). The trigger opens the full sidebar over the page; it closes when the route changes.
 Desktop 1024+: sidebar var(--sidebar-width), collapsible to the rail, choice remembered between visits. Top bar: sidebar trigger + breadcrumbs.
 Sidebar (from sidebar-07): header = shop initials Avatar, shop name, "Open" line (no team switcher dropdown, shortcuts or "Add team"); nav-projects removed; flat links; footer = View my shop (VITE_STOREFRONT_URL/<slug>, new tab), Share my shop (Sheet with the link and Copy), account menu with Account (/settings/account) and Log out only.
 One account-menu.tsx, used by the sidebar footer and the phone top bar.
 All sizes: no bell, skip-to-content link, document.title = "<page> · Smart App PH", document scrolls with a sticky top bar, 44 px minimum targets, 100dvh never 100vh.

7. ROUTES (TanStack Router code routes; signed-in shell layout redirects to /login without a session)
 /  ·  /orders (tabs Board, List)  ·  /orders/$orderId
 /catalog, /catalog/categories, /catalog/add-ons (tabs Items, Categories, Add-ons)  ·  /catalog/new, /catalog/$itemId
 /members, /members/stamp-card, /members/claims (tabs Members, Stamp card, Prize claims)  ·  /members/$customerId
 /insights (tabs 7 days, 30 days via ?range; UI only)
 /settings: desktop shows the left sub-menu with Shop open; phone shows a list of Item rows. /settings/shop, /hours, /ordering, /delivery, /payments, /notifications, /plan, /account
 Outside the shell: /editor (full screen, auth guarded; own top bar with Back and title), /login, /signup, /kit (dev only, as in T01).

8. EMPTY PAGES
 page-header (title, tabs where listed) + the installed Empty component with an icon and one line from words.ts. No fake data, never "Coming soon".

9. DOCS
 - docs/components.md: every installed file and every composition.
 - docs/decisions.md:
   N12 Settings has Notifications and Plan sections.
   N13 The Editor opens full screen, outside the shell.
   N14 No bell in the MVP A top bar; Home's needs-you list does that job.
   N15 Phone dock: floating pill with 4 places and More; More opens a bottom drawer with tiles.
   N16 The dashboard shell starts from the shadcn sidebar-07 block; bottom-dock, nav-drawer and page-header are shared compositions in packages/ui, router-agnostic, reused by the storefront shell.
   T20 cn comes from the official cn package (catalog); lib/utils.ts re-exports it so ReUI and older items keep working.
 - Tick T05 in docs/PROGRESS.md, one line in docs/CHANGELOG.md.

10. CHECKS AND PR
 - Unit tests: every nav.ts item has a route and every route in section 7 exists; useFormFactor returns phone, tablet and desktop for 390, 820 and 1280 px (mock matchMedia); bottom-dock shows a badge only when count > 0 and marks the active item with aria-current.
 - The components registry test also checks packages/ui/src/compositions and packages/ui/src/hooks against docs/components.md.
 - pnpm format:check, pnpm check and pnpm build green. Never weaken eslint or tsconfig, never edit build output.
 - PR with gh pr create --base main and the template filled. Instead of screenshots, a manual test checklist for me: what to open and click at 390, 820 and 1280 px (light mode), as kanto-smash (food) and tala-apparel (retail).

OUT OF SCOPE: theme switcher and dark-mode testing, badge counts, real data, storefront shell, setup/pending/suspended screens, member QR route, Google sign-in and login layout changes (T01b), Playwright or any browser automation, API or database changes.
<!-- prettier-ignore-end -->
