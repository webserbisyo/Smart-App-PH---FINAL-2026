import { useState } from 'react';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { words } from '@smartapp/core';
import type { UserClaims } from '@smartapp/data';
import { BottomDock } from '@smartapp/ui/compositions/bottom-dock';
import { Sheet, SheetContent, SheetTitle } from '@smartapp/ui/components/sheet';
import { SidebarInset, SidebarProvider } from '@smartapp/ui/components/sidebar';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { usePageMeta } from '../page-meta.js';
import { ShopContext, useShop, type CurrentShop } from '../shop.js';
import { usePageTitle } from '../use-page-title.js';
import { storefrontUrl, useNavItems } from '../use-nav-items.js';
import { AppSidebar } from './app-sidebar.js';
import { ShareShopSheet } from './share-shop-sheet.js';
import { TopBar } from './top-bar.js';

// The installed sidebar keeps its open/collapsed choice in this cookie.
function sidebarStartsOpen(): boolean {
  return !document.cookie.split('; ').includes('sidebar_state=false');
}

function Shell({ claims }: { claims: UserClaims }) {
  const shop = useShop();
  const formFactor = useFormFactor();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const page = usePageMeta();
  const [shareOpen, setShareOpen] = useState(false);
  // The tablet menu sheet is open only on the route it was opened from, so it
  // closes when the route changes.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  const setMenuOpen = (open: boolean) => setMenuOpenOn(open ? pathname : null);
  const nav = useNavItems({ onShare: () => setShareOpen(true) });
  usePageTitle(page.title);

  const isTablet = formFactor === 'tablet';

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
          // Desktop keeps shadcn's 3rem icon rail; the touch rail fits 44 px targets.
          '--sidebar-width-icon': isTablet ? 'var(--rail-width)' : undefined,
        })}
        {...(isTablet ? { open: false, onOpenChange: setMenuOpen } : {})}
      >
        {formFactor !== 'phone' ? <AppSidebar claims={claims} nav={nav} variant="rail" /> : null}
        <SidebarInset className="min-w-0">
          <TopBar
            formFactor={formFactor}
            page={page}
            claims={claims}
            onOpenMenu={() => setMenuOpen(true)}
          />
          <div
            id="main"
            tabIndex={-1}
            className="flex flex-1 flex-col outline-none shell-phone:pb-dock"
          >
            <Outlet />
          </div>
        </SidebarInset>
        {isTablet ? (
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetContent side="left" className="gap-0 p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">{words.shell.mainNav}</SheetTitle>
              <AppSidebar claims={claims} nav={nav} variant="sheet" />
            </SheetContent>
          </Sheet>
        ) : null}
      </SidebarProvider>

      {formFactor === 'phone' ? (
        <BottomDock
          label={words.shell.mainNav}
          items={nav.dock}
          more={{
            label: words.nav.more,
            items: [...nav.more, nav.viewMyShop, nav.shareMyShop, nav.account],
          }}
        />
      ) : null}

      <ShareShopSheet url={storefrontUrl(shop.slug)} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}

// One tree for every size; the layout follows useFormFactor() through data-shell.
export function AppShell({ claims, shop }: { claims: UserClaims; shop: CurrentShop }) {
  return (
    <ShopContext value={shop}>
      <Shell claims={claims} />
    </ShopContext>
  );
}
