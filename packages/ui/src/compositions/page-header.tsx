import type { ReactNode } from 'react';
import { Badge } from '@smartapp/ui/components/badge';
import { Tabs, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { countLabel, type NavItem } from '../lib/nav';

export interface PageHeaderProps {
  title: string;
  actions?: ReactNode | undefined;
  // Tabs are links: the URL decides which one is active.
  tabs?: readonly NavItem[] | undefined;
  tabsLabel?: string | undefined;
}

export function PageHeader({ title, actions, tabs, tabsLabel }: PageHeaderProps) {
  const activeTab = tabs?.find((tab) => tab.active)?.id ?? null;
  const hasTabs = tabs !== undefined && tabs.length > 0;

  // The visible page name lives in the shell (breadcrumb or phone top bar); the
  // h1 stays for screen readers. With nothing else to show, the page content
  // starts right away.
  if (!hasTabs && !actions) {
    return <h1 className="sr-only">{title}</h1>;
  }

  return (
    <header data-slot="page-header" className="flex flex-col gap-3 px-4 pt-2 md:px-6 md:pt-4">
      <h1 className="sr-only">{title}</h1>
      {actions ? (
        <div className="flex min-h-11 flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
      {hasTabs ? (
        <Tabs value={activeTab}>
          <TabsList
            variant="line"
            aria-label={tabsLabel ?? title}
            className="scrollbar-none w-full justify-start overflow-x-auto py-2 group-data-horizontal/tabs:h-auto"
          >
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                nativeButton={false}
                render={tab.link}
                aria-current={tab.active ? 'page' : undefined}
                className="h-11 flex-none px-3"
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 ? (
                  <Badge variant="secondary" className="tabular">
                    {countLabel(tab.count)}
                  </Badge>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
    </header>
  );
}
