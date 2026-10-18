import { Fragment } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, PanelLeftIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import type { UserClaims } from '@smartapp/data';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@smartapp/ui/components/breadcrumb';
import { Button } from '@smartapp/ui/components/button';
import { Separator } from '@smartapp/ui/components/separator';
import { SidebarTrigger } from '@smartapp/ui/components/sidebar';
import type { FormFactor } from '@smartapp/ui/hooks/use-form-factor';
import type { usePageMeta } from '../page-meta.js';
import { AccountMenu } from './account-menu.js';

export function TopBar({
  formFactor,
  page,
  claims,
  onOpenMenu,
}: {
  formFactor: FormFactor;
  page: ReturnType<typeof usePageMeta>;
  claims: UserClaims;
  onOpenMenu: () => void;
}) {
  if (formFactor === 'phone') {
    return (
      <header className="sticky top-0 z-20 flex min-h-14 items-center gap-1 border-b border-border bg-background px-2 pt-safe">
        {page.parent ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={words.shell.back}
            nativeButton={false}
            render={<Link to={page.parent.to} />}
          >
            <ArrowLeftIcon />
          </Button>
        ) : null}
        <p className="min-w-0 flex-1 truncate px-2 text-lg font-semibold">{page.title}</p>
        <AccountMenu claims={claims} placement="top-bar" />
      </header>
    );
  }

  const crumbs = page.parent ? [page.parent] : [];
  return (
    <header className="sticky top-0 z-20 box-content flex h-shell-header shrink-0 items-center gap-2 border-b border-border bg-background px-4 transition-all ease-linear motion-reduce:transition-none sidebar-collapsed:h-shell-header-collapsed">
      {formFactor === 'tablet' ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className="-ml-1 pointer-coarse:size-11"
          aria-label={words.shell.toggleSidebar}
          onClick={onOpenMenu}
        >
          <PanelLeftIcon />
        </Button>
      ) : (
        <SidebarTrigger
          className="-ml-1 pointer-coarse:size-11"
          aria-label={words.shell.toggleSidebar}
        />
      )}
      <Separator orientation="vertical" className="mr-2 h-4 self-center" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          {crumbs.map((crumb) => (
            <Fragment key={crumb.to}>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link to={crumb.to} />}>{crumb.title}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate">{page.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
