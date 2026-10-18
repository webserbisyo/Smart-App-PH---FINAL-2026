import * as React from 'react';
import { Outlet, useRouter } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { SidebarProvider, SidebarInset } from '@smartapp/ui/components/sidebar';
import { BottomDock } from '@smartapp/ui/compositions/bottom-dock';
import { NavDrawer } from '@smartapp/ui/compositions/nav-drawer';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { cn } from 'cn';
import { MoreHorizontalIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import type { UserClaims } from '@smartapp/data';
import { ShopContext, type CurrentShop } from '../shop.js';
import { useNavItems } from '../use-nav-items.js';
import { AppSidebar } from './app-sidebar.js';
import { TopBar } from './top-bar.js';

interface AppShellProps {
  claims: UserClaims;
  shop: CurrentShop;
}

export function AppShell({ claims, shop }: AppShellProps) {
  const pageTitle = words.appName;
  const onLogout = () => {
    void router.navigate({ to: '/logout' });
  };
  const formFactor = useFormFactor();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const { dockItems, moreItems, footItems, allSidebarItems } = useNavItems(shop.kind);

  const initials = shop.initials;

  // On tablet the sidebar opens as a sheet overlay, closes on route change.
  const [sidebarOpen, setSidebarOpen] = React.useState(formFactor === 'desktop');

  // Remember sidebar open/collapsed for desktop between visits.
  const [sidebarDefaultOpen] = React.useState(() => {
    try {
      return localStorage.getItem('sidebar_state') !== 'collapsed';
    } catch {
      return true;
    }
  });

  // Close more drawer on navigation
  React.useEffect(() => {
    return router.subscribe('onResolved', () => setMoreOpen(false));
  }, [router]);

  // Build dock items: 4 dock slots + "More" button that opens the drawer.
  const dockNavItems = [
    ...dockItems.map((item) => ({
      ...item,
      renderLink: ({
        href,
        className,
        children,
        'aria-current': ariaCurrent,
      }: {
        href: string;
        className: string;
        children: React.ReactNode;
        'aria-current'?: 'page' | undefined;
        onClick?: (() => void) | undefined;
      }) => (
        <Link to={href} className={className} aria-current={ariaCurrent} preload="intent">
          {children}
        </Link>
      ),
    })),
    {
      id: 'more',
      label: words.nav.more,
      href: '#',
      icon: MoreHorizontalIcon,
      isActive: moreOpen,
      onClick: () => setMoreOpen(true),
    },
  ];

  // Build sidebar nav items with TanStack Link
  const sidebarNavItems = allSidebarItems.map((item) => ({
    ...item,
    renderLink: ({
      href,
      className,
      children,
      'aria-current': ariaCurrent,
    }: {
      href: string;
      className: string;
      children: React.ReactNode;
      'aria-current'?: 'page' | undefined;
      onClick?: (() => void) | undefined;
    }) => (
      <Link to={href} className={className} aria-current={ariaCurrent} preload="intent">
        {children}
      </Link>
    ),
  }));

  const moreNavItems = moreItems.map((item) => ({
    ...item,
    renderLink: ({
      href,
      className,
      children,
      'aria-current': ariaCurrent,
    }: {
      href: string;
      className: string;
      children: React.ReactNode;
      'aria-current'?: 'page' | undefined;
      onClick?: (() => void) | undefined;
    }) => (
      <Link to={href} className={className} aria-current={ariaCurrent} preload="intent">
        {children}
      </Link>
    ),
  }));

  const isPhone = formFactor === 'phone';
  const isTablet = formFactor === 'tablet';

  return (
    <ShopContext value={shop}>
      <div
        data-shell={formFactor}
        className={cn('flex min-h-dvh bg-background', isPhone && 'pb-dock')}
      >
        <SidebarProvider
          defaultOpen={sidebarDefaultOpen}
          {...(isTablet ? { open: sidebarOpen, onOpenChange: setSidebarOpen } : {})}
        >
          {/* Sidebar — hidden on phone, icon rail on tablet, full on desktop */}
          {!isPhone && (
            <AppSidebar
              claims={claims}
              shop={shop}
              navItems={sidebarNavItems}
              footItems={footItems}
              initials={initials}
              onLogout={onLogout}
            />
          )}

          <SidebarInset className="flex min-w-0 flex-1 flex-col">
            {/* Top bar — always shown (phone needs it for title + avatar) */}
            <TopBar title={pageTitle} claims={claims} initials={initials} onLogout={onLogout} />

            {/* Page content */}
            <main className="flex flex-1 flex-col">
              <Outlet />
            </main>
          </SidebarInset>
        </SidebarProvider>

        {/* Phone bottom dock */}
        {isPhone && (
          <>
            <BottomDock items={dockNavItems} />
            <NavDrawer
              open={moreOpen}
              onOpenChange={setMoreOpen}
              items={moreNavItems}
              footerItems={footItems}
              title={words.nav.more}
            />
          </>
        )}
      </div>
    </ShopContext>
  );
}
