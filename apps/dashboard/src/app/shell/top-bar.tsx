import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@smartapp/ui/components/breadcrumb';
import { SidebarTrigger } from '@smartapp/ui/components/sidebar';
import { Separator } from '@smartapp/ui/components/separator';
import type { UserClaims } from '@smartapp/data';
import { AccountMenu } from './account-menu.js';

interface TopBarProps {
  title: string;
  claims: UserClaims;
  initials: string;
  onLogout: () => void;
}

export function TopBar({ title, claims, initials, onLogout }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 pt-safe backdrop-blur-md">
      {/* Sidebar toggle (shows only on tablet/desktop via sidebar's built-in md:flex) */}
      <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Page title as breadcrumb */}
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate font-semibold">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Account avatar — compact on phone top bar */}
      <AccountMenu claims={claims} initials={initials} onLogout={onLogout} compact />
    </header>
  );
}
