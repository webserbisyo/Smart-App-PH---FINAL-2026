import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronsUpDownIcon, LogOutIcon, UserIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import type { UserClaims } from '@smartapp/data';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { SidebarMenuButton } from '@smartapp/ui/components/sidebar';

function userInitials(claims: UserClaims): string {
  const source = claims.fullName ?? claims.email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function UserLines({ claims }: { claims: UserClaims }) {
  return (
    <div className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{claims.fullName ?? claims.email}</span>
      {claims.fullName ? <span className="truncate text-xs">{claims.email}</span> : null}
    </div>
  );
}

// The one account menu: in the sidebar footer and in the phone top bar.
export function AccountMenu({
  claims,
  placement,
}: {
  claims: UserClaims;
  placement: 'sidebar' | 'top-bar';
}) {
  const navigate = useNavigate();
  const avatar = (
    <Avatar>
      <AvatarFallback>{userInitials(claims)}</AvatarFallback>
    </Avatar>
  );

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
          <UserLines claims={claims} />
          <ChevronsUpDownIcon className="ml-auto size-4" />
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
        sideOffset={4}
        className={placement === 'sidebar' ? 'w-fit' : 'min-w-56'}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              {avatar}
              <UserLines claims={claims} />
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/settings/account" />}>
          <UserIcon />
          {words.nav.account}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void navigate({ to: '/logout' })}>
          <LogOutIcon />
          {words.auth.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
