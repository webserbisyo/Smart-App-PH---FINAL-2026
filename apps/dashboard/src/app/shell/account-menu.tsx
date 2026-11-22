import { useContext } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  ChevronsUpDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
  WifiIcon,
  WifiOffIcon,
} from 'lucide-react';
import { AppearanceEnum, adminWords, settingsWords, words, type Appearance } from '@smartapp/core';
import type { UserClaims } from '@smartapp/data';
import { AvatarBadge } from '@smartapp/ui/components/avatar';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { SidebarMenuButton } from '@smartapp/ui/components/sidebar';
import { setAppearance, useAppearance } from '../appearance.js';
import { MyAvatar } from '../owner-avatar.js';
import { ShopContext } from '../shop.js';
import { useOnlineStatus } from '../use-online-status.js';

// Light, Dark, System in the order the Stays menu shows them; the check marks the saved one (T64).
const MENU_APPEARANCES = ['light', 'dark', 'system'] as const satisfies readonly Appearance[];
const APPEARANCE_ICON = { light: SunIcon, dark: MoonIcon, system: MonitorIcon } as const;

function userInitials(claims: UserClaims): string {
  const source = claims.fullName ?? claims.email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function UserLines({ claims, role }: { claims: UserClaims; role: string }) {
  return (
    <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{claims.fullName ?? claims.email}</span>
      <span className="truncate text-xs text-muted-foreground">{role}</span>
    </div>
  );
}

// The one account menu (T112, laid out like the Stays app's): who you are with the online line, then
// Appearance, My account and Settings, then Log out. In the sidebar footer and in the phone top bar.
export function AccountMenu({
  claims,
  placement,
  admin = false,
}: {
  claims: UserClaims;
  placement: 'sidebar' | 'top-bar';
  // On Super Admin's own pages (T88): no owner Account link.
  admin?: boolean | undefined;
}) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const appearance = useAppearance();
  // Super Admin's own pages have no shop around them.
  const shop = useContext(ShopContext);
  const role = admin || !shop ? adminWords.area : settingsWords.account.owner(shop.name);
  const fallbackName = claims.fullName ?? userInitials(claims);
  // ReUI c-avatar-6 status dot (T83): green while online; the menu says it in words.
  const dot = (
    <AvatarBadge className={online ? 'bg-success' : 'bg-muted-foreground'} aria-hidden="true" />
  );
  const avatar = <MyAvatar fallbackName={fallbackName} badge={dot} />;

  return (
    <DropdownMenu>
      {placement === 'sidebar' ? (
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              size="lg"
              className="aria-expanded:bg-muted tablet-rail:size-11! tablet-rail:p-1.5!"
            />
          }
        >
          {avatar}
          <UserLines claims={claims} role={role} />
          <ChevronsUpDownIcon className="ml-auto size-4 shrink-0" aria-hidden="true" />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-full"
              aria-label={words.shell.accountMenu}
            />
          }
        >
          {avatar}
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        side={placement === 'sidebar' ? 'right' : 'bottom'}
        align="end"
        sideOffset={6}
        // data-account-menu: the Preview pill steps aside while this is open (T112).
        data-account-menu=""
        className="w-auto min-w-60"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2.5 px-2 py-2 text-left text-sm text-foreground">
              {avatar}
              <UserLines claims={claims} role={role} />
            </div>
            <p
              role="status"
              className="flex items-center gap-1.5 px-2 pb-2 text-xs text-muted-foreground"
            >
              {online ? (
                <WifiIcon aria-hidden="true" className="size-3.5 text-success-text" />
              ) : (
                <WifiOffIcon aria-hidden="true" className="size-3.5" />
              )}
              {online ? words.shell.online : words.shell.offline}
            </p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{settingsWords.account.appearanceCard}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={appearance}
            onValueChange={(next) => {
              const parsed = AppearanceEnum.safeParse(next);
              if (parsed.success) setAppearance(parsed.data);
            }}
          >
            {MENU_APPEARANCES.map((mode) => {
              const Icon = APPEARANCE_ICON[mode];
              return (
                <DropdownMenuRadioItem key={mode} value={mode} className="min-h-10">
                  <Icon aria-hidden="true" />
                  {settingsWords.account.appearance[mode]}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {admin ? null : (
          <DropdownMenuGroup>
            <DropdownMenuItem className="min-h-10" render={<Link to="/settings/account" />}>
              <UserIcon aria-hidden="true" />
              {words.shell.myAccount}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-10" render={<Link to="/settings" />}>
              <SettingsIcon aria-hidden="true" />
              {words.nav.settings}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}
        {claims.isAdmin && !admin ? (
          <DropdownMenuItem className="min-h-10" render={<Link to="/admin" />}>
            <LayoutDashboardIcon aria-hidden="true" />
            {adminWords.area}
          </DropdownMenuItem>
        ) : null}
        {admin ? null : <DropdownMenuSeparator />}
        <DropdownMenuItem className="min-h-10" onClick={() => void navigate({ to: '/logout' })}>
          <LogOutIcon aria-hidden="true" />
          {words.auth.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
