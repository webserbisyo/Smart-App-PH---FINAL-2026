import { Link } from '@tanstack/react-router';
import { words } from '@smartapp/core';
import type { UserClaims } from '@smartapp/data';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@smartapp/ui/components/sidebar';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { useShop } from '../shop.js';
import type { NavItems } from '../use-nav-items.js';
import { AccountMenu } from './account-menu.js';

function SidebarLink({ item, withTooltip }: { item: NavItem; withTooltip: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={item.active}
        {...(withTooltip ? { tooltip: item.label } : {})}
        render={item.link}
        aria-current={item.active ? 'page' : undefined}
        className="h-11"
      >
        {item.icon}
        <span>{item.label}</span>
      </SidebarMenuButton>
      {item.count !== undefined && item.count > 0 ? (
        <SidebarMenuBadge>{item.count}</SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}

// Started from the shadcn sidebar-07 block: shop header instead of the team
// switcher, flat links instead of nav-main/nav-projects, account menu instead
// of nav-user.
export function AppSidebar({
  claims,
  nav,
  variant,
}: {
  claims: UserClaims;
  nav: NavItems;
  // 'rail': the collapsible sidebar (tablet and desktop). 'sheet': the same
  // content opened over the page from the tablet rail.
  variant: 'rail' | 'sheet';
}) {
  const shop = useShop();
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
              {...(withTooltip ? { tooltip: shop.name } : {})}
              render={<Link to="/" />}
            >
              <Avatar className="rounded-lg after:rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                  {shop.initials}
                </AvatarFallback>
              </Avatar>
              <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{shop.name}</span>
                <span className="truncate text-xs text-success-text">{words.shell.open}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu aria-label={words.shell.mainNav}>
            {nav.all.map((item) => (
              <SidebarLink key={item.id} item={item} withTooltip={withTooltip} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarLink item={nav.viewMyShop} withTooltip={withTooltip} />
          <SidebarLink item={nav.shareMyShop} withTooltip={withTooltip} />
          <SidebarMenuItem>
            <AccountMenu claims={claims} placement="sidebar" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {variant === 'rail' ? <SidebarRail /> : null}
    </Sidebar>
  );
}
