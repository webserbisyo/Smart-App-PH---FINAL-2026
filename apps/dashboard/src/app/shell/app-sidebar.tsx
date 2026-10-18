import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@smartapp/ui/components/sidebar';
import { ExternalLinkIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import type { UserClaims } from '@smartapp/data';
import type { CurrentShop } from '../shop.js';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { AccountMenu } from './account-menu.js';
import { ShareShopSheet } from './share-shop-sheet.js';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  claims: UserClaims;
  shop: CurrentShop;
  navItems: readonly NavItem[];
  footItems: readonly NavItem[];
  initials: string;
  onLogout: () => void;
}

export function AppSidebar({
  claims,
  shop,
  navItems,
  footItems,
  initials,
  onLogout,
  ...props
}: AppSidebarProps) {
  const { setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    // On tablet the sidebar opens over the page; close it on route change.
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Shop header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold text-foreground">{shop.name}</p>
            <p className="truncate text-xs text-muted-foreground">{words.nav.openState}</p>
          </div>
        </div>
      </SidebarHeader>

      {/* Main navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={Boolean(item.isActive)}
                      tooltip={item.label}
                      render={
                        <Link
                          to={item.href}
                          onClick={handleNavClick}
                          aria-current={item.isActive ? 'page' : undefined}
                        />
                      }
                    >
                      {Icon && <Icon />}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: view shop, share, account */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
        <SidebarMenu>
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <ShareShopSheet shopName={shop.name} shopSlug={shop.slug} />
          </SidebarMenuItem>
          {footItems
            .filter((f) => f.id === 'view-shop')
            .map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    render={
                      <a
                        href={`${item.href}${shop.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    {Icon ? <Icon /> : <ExternalLinkIcon />}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
        </SidebarMenu>
        <div className="px-1 py-0.5">
          <AccountMenu claims={claims} initials={initials} onLogout={onLogout} />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
