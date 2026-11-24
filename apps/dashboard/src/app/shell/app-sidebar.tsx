import { Link } from '@tanstack/react-router';
import { words } from '@smartapp/core';
import type { UserClaims } from '@smartapp/data';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@smartapp/ui/components/sidebar';
import { BorderBeam } from '@smartapp/ui/components/border-beam';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { cn } from 'cn';
import { useShop } from '../shop.js';
import type { NavItems } from '../use-nav-items.js';
import { AccountMenu } from './account-menu.js';

/**
 * A slow logo-coloured border around My App (T113), like the sign-up card's. Off under reduced motion;
 * clipped to the button so it never spills onto the next link.
 */
function FeaturedBeam() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
    >
      <BorderBeam
        size={48}
        duration={8}
        borderWidth={1.5}
        colorFrom="var(--logo-blue)"
        colorTo="var(--logo-mint)"
      />
    </span>
  );
}

function SidebarLink({
  item,
  withTooltip,
  sub,
}: {
  item: NavItem;
  withTooltip: boolean;
  sub?: NavItem | null | undefined;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={item.active}
        {...(withTooltip ? { tooltip: item.label } : {})}
        render={item.link}
        className={cn(
          'pointer-coarse:h-11 tablet-rail:size-11! tablet-rail:p-3.5!',
          item.featured && 'relative',
        )}
      >
        {item.featured ? <FeaturedBeam /> : null}
        {item.icon}
        <span>{item.label}</span>
      </SidebarMenuButton>
      {item.count !== undefined && item.count > 0 ? (
        <SidebarMenuBadge>{item.count}</SidebarMenuBadge>
      ) : null}
      {sub ? (
        // A sub-link (Orders > Calendar, T85); the icon rail hides it.
        <SidebarMenuSub>
          <SidebarMenuSubItem>
            <SidebarMenuSubButton
              isActive={sub.active}
              render={sub.link}
              className="pointer-coarse:h-11"
            >
              {sub.icon}
              <span>{sub.label}</span>
              {sub.count !== undefined ? (
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  <span aria-hidden="true">{sub.count}</span>
                  <span className="sr-only">{words.nav.calendarCount(sub.count)}</span>
                </span>
              ) : null}
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        </SidebarMenuSub>
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
  // On the closed (icon) rail the New order label is left out, so the + sits in the middle of its button.
  const { state } = useSidebar();
  const iconOnly = variant === 'rail' && state === 'collapsed';

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
              {...(withTooltip ? { tooltip: shop.name } : {})}
              render={<Link to="/" />}
            >
              <img
                src="/brand/smartappph-mark-gradient.webp"
                alt=""
                width={32}
                height={32}
                className="aspect-square size-8 shrink-0"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{shop.name}</span>
                <span className="truncate text-xs text-success-text">{words.shell.open}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pb-0">
          {/* New order (T111): the owner's one main action, on top of the places. */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={nav.newOrder.active}
                {...(withTooltip ? { tooltip: nav.newOrder.label } : {})}
                render={nav.newOrder.link}
                className="justify-center bg-primary font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground data-active:bg-primary data-active:text-primary-foreground pointer-coarse:h-11 tablet-rail:size-11! tablet-rail:p-3.5!"
              >
                {nav.newOrder.icon}
                {iconOnly ? null : <span>{nav.newOrder.label}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarMenu aria-label={words.shell.mainNav} className="gap-1">
            {nav.all.map((item) => (
              <SidebarLink
                key={item.id}
                item={item}
                withTooltip={withTooltip}
                sub={item.id === 'orders' ? nav.ordersCalendar : null}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="gap-1">
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
