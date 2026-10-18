import { Link } from '@tanstack/react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import { LogOutIcon, UserIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import type { UserClaims } from '@smartapp/data';
import { cn } from 'cn';

export interface AccountMenuProps {
  claims: UserClaims;
  initials: string;
  onLogout: () => void;
  /** When true renders a compact trigger suitable for a top bar */
  compact?: boolean | undefined;
  className?: string | undefined;
}

export function AccountMenu({
  claims,
  initials,
  onLogout,
  compact = false,
  className,
}: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex shrink-0 pressable items-center gap-2 rounded-lg ring-ring transition-colors outline-none hover:bg-accent focus-visible:ring-2',
          compact ? 'size-10 justify-center' : 'w-full px-2 py-1.5',
          className,
        )}
        aria-label={words.nav.account}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        {!compact && (
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-foreground">
              {claims.fullName ?? claims.email}
            </p>
            {claims.fullName && (
              <p className="truncate text-xs text-muted-foreground">{claims.email}</p>
            )}
          </div>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={4} className="w-56">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{claims.fullName ?? claims.email}</p>
          {claims.fullName && (
            <p className="truncate text-xs text-muted-foreground">{claims.email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/settings/account" />}>
          <UserIcon />
          {words.screens.settings.accountTitle}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onLogout}>
          <LogOutIcon className="mr-2 size-4" />
          {words.auth.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
