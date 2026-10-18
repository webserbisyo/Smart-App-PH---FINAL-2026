import * as React from 'react';
import { cn } from 'cn';
import type { NavItem } from '../lib/nav';

export interface PageHeaderProps {
  title: string;
  description?: string | undefined;
  actions?: React.ReactNode | undefined;
  tabs?: readonly NavItem[] | undefined;
  className?: string | undefined;
}

export function PageHeader({ title, description, actions, tabs, className }: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn('flex flex-col gap-4 border-b border-border bg-background pb-0', className)}
    >
      <div className="flex flex-col gap-4 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
            {actions}
          </div>
        )}
      </div>

      {tabs && tabs.length > 0 && (
        <nav
          aria-label="Section tabs"
          data-slot="page-header-tabs"
          className="scrollbar-none flex gap-2 overflow-x-auto px-4 sm:px-6"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = Boolean(tab.isActive);
            const ariaCurrent = isActive ? 'page' : undefined;

            const tabClassName = cn(
              'group relative flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors pressable',
              isActive
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              tab.disabled && 'pointer-events-none opacity-40',
            );

            const content = (
              <>
                {Icon && <Icon className="size-4 shrink-0" />}
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground tabular group-aria-[current=page]:bg-primary/10 group-aria-[current=page]:text-primary">
                    {tab.badge}
                  </span>
                )}
              </>
            );

            if (tab.renderLink) {
              return (
                <React.Fragment key={tab.id}>
                  {tab.renderLink({
                    href: tab.href,
                    className: tabClassName,
                    'aria-current': ariaCurrent,
                    onClick: tab.onClick,
                    children: content,
                  })}
                </React.Fragment>
              );
            }

            if (tab.onClick) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={tab.onClick}
                  disabled={tab.disabled}
                  className={tabClassName}
                  aria-current={ariaCurrent}
                >
                  {content}
                </button>
              );
            }

            return (
              <a
                key={tab.id}
                href={tab.href}
                className={tabClassName}
                aria-current={ariaCurrent}
                aria-disabled={tab.disabled}
              >
                {content}
              </a>
            );
          })}
        </nav>
      )}
    </header>
  );
}
