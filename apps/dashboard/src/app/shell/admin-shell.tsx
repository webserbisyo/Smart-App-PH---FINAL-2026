import { createElement, useState } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import {
  ActivityIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  StoreIcon,
} from 'lucide-react';
import { adminWords, words } from '@smartapp/core';
import { useAdminPayments, useAdminToday, type UserClaims } from '@smartapp/data';
import { BottomDock } from '@smartapp/ui/compositions/bottom-dock';
import { Sheet, SheetContent, SheetTitle } from '@smartapp/ui/components/sheet';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from '@smartapp/ui/components/sidebar';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { cn } from 'cn';
import { usePageMeta } from '../page-meta.js';
import { ShopContext, type CurrentShop } from '../shop.js';
import { useCoarsePointer } from '../use-coarse-pointer.js';
import { usePageTitle } from '../use-page-title.js';
import { isActivePath } from '../use-nav-items.js';
import { AccountMenu } from './account-menu.js';
import { TopBar } from './top-bar.js';

const N = adminWords.nav;

// The admin area has no shop of its own; the shared top bar reads its titles through this.
const PLATFORM: CurrentShop = { slug: '', name: adminWords.area, kind: 'food', initials: 'SA' };

const ADMIN_NAV = [
  { id: 'today', path: '/admin', icon: LayoutDashboardIcon, label: N.today },
  { id: 'shops', path: '/admin/shops', icon: StoreIcon, label: N.shops },
  { id: 'payments', path: '/admin/payments', icon: CreditCardIcon, label: N.payments },
  { id: 'tracking', path: '/admin/tracking', icon: ActivityIcon, label: N.tracking },
  { id: 'setup', path: '/admin/setup', icon: SettingsIcon, label: N.setup },
] as const;

function sidebarStartsOpen(): boolean {
  return !document.cookie.split('; ').includes('sidebar_state=false');
}

function useAdminNav(): NavItem[] {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const today = useAdminToday();
  const payments = useAdminPayments('to_check');
  const needs = today.data?.needs.length ?? 0;
  return ADMIN_NAV.map((def) => ({
    id: def.id,
    label: def.label,
    icon: createElement(def.icon),
    link: createElement(Link, { to: def.path, preload: 'intent' }),
    active:
      def.path === '/admin'
        ? pathname === '/admin' || pathname === '/admin/'
        : isActivePath(pathname, def.path),
    count:
      def.id === 'today' && needs > 0
        ? needs
        : def.id === 'payments' && (payments.data?.toCheck ?? 0) > 0
          ? payments.data?.toCheck
          : undefined,
  }));
}

function AdminSidebar({
  claims,
  nav,
  variant,
}: {
  claims: UserClaims;
  nav: NavItem[];
  variant: 'rail' | 'sheet';
}) {
  const withTooltip = variant === 'rail';
  return (
    <Sidebar
      collapsible={variant === 'rail' ? 'icon' : 'none'}
      className={variant === 'sheet' ? 'h-full w-full' : undefined}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="tablet-rail:size-11! tablet-rail:p-1.5!"
              {...(withTooltip ? { tooltip: adminWords.area } : {})}
              render={<Link to="/admin" />}
            >
              <img
                src="/brand/smartappph-mark-gradient.webp"
                alt=""
                width={32}
                height={32}
                className="aspect-square size-8 shrink-0"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{words.appName}</span>
                <span className="truncate text-xs text-primary">{adminWords.area}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu aria-label={adminWords.area} className="gap-1">
            {nav.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={item.active}
                  {...(withTooltip ? { tooltip: item.label } : {})}
                  render={item.link}
                  className="pointer-coarse:h-11 tablet-rail:size-11! tablet-rail:p-3.5!"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </SidebarMenuButton>
                {item.count !== undefined && item.count > 0 ? (
                  <SidebarMenuBadge>{item.count}</SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <AccountMenu claims={claims} placement="sidebar" admin />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {variant === 'rail' ? <SidebarRail /> : null}
    </Sidebar>
  );
}

function Shell({ claims }: { claims: UserClaims }) {
  const formFactor = useFormFactor();
  const coarsePointer = useCoarsePointer();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const page = usePageMeta();
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  const setMenuOpen = (open: boolean) => setMenuOpenOn(open ? pathname : null);
  const nav = useAdminNav();
  usePageTitle(page.title);
  const isTablet = formFactor === 'tablet';
  const showDock = formFactor === 'phone';

  return (
    <div data-shell={formFactor} className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-background px-4 py-3 font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {words.shell.skipToContent}
      </a>
      <SidebarProvider
        defaultOpen={sidebarStartsOpen()}
        style={cssVars({
          '--sidebar-width': 'var(--shell-sidebar-width)',
          ...(isTablet && coarsePointer ? { '--sidebar-width-icon': 'var(--rail-width)' } : {}),
        })}
        {...(isTablet ? { open: false, onOpenChange: setMenuOpen } : {})}
      >
        {formFactor !== 'phone' ? <AdminSidebar claims={claims} nav={nav} variant="rail" /> : null}
        <SidebarInset className="min-w-0">
          <TopBar
            formFactor={formFactor}
            page={page}
            claims={claims}
            onOpenMenu={() => setMenuOpen(true)}
            admin
          />
          <div
            id="main"
            tabIndex={-1}
            className={cn('flex flex-1 flex-col outline-none', showDock && 'pb-dock')}
          >
            <Outlet />
          </div>
        </SidebarInset>
        {isTablet ? (
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetContent side="left" className="gap-0 p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">{adminWords.area}</SheetTitle>
              <AdminSidebar claims={claims} nav={nav} variant="sheet" />
            </SheetContent>
          </Sheet>
        ) : null}
      </SidebarProvider>
      {showDock ? (
        <BottomDock
          label={adminWords.area}
          items={nav.slice(0, 4)}
          more={{ label: words.nav.more, items: nav.slice(4) }}
        />
      ) : null}
    </div>
  );
}

/** Super Admin's own shell (T88): the same sidebar, top bar and dock as the owner's, with its own pages. */
export function AdminShell({ claims }: { claims: UserClaims }) {
  return (
    <ShopContext value={PLATFORM}>
      <Shell claims={claims} />
    </ShopContext>
  );
}
