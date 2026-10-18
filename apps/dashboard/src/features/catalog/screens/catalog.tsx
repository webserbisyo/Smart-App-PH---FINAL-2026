import * as React from 'react';
import { useRouter } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { words } from '@smartapp/core';
import { useShop } from '../../../app/shop.js';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@smartapp/ui/components/empty';
import { getCatalogTabs } from '../tabs.js';

export function CatalogScreen() {
  const { kind } = useShop();
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const tabs = getCatalogTabs(kind, pathname).map((tab) => ({
    ...tab,
    renderLink: ({
      href,
      className,
      children,
      'aria-current': ariaCurrent,
    }: {
      href: string;
      className: string;
      children: React.ReactNode;
      'aria-current'?: 'page' | undefined;
      onClick?: (() => void) | undefined;
    }) => (
      <Link to={href} className={className} aria-current={ariaCurrent} preload="intent">
        {children}
      </Link>
    ),
  }));

  return (
    <>
      <PageHeader
        title={words.screens.catalog.title(kind)}
        description={words.screens.catalog.description(kind)}
        tabs={tabs}
      />
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyContent>
              <EmptyTitle>{words.screens.catalog.emptyItemsTitle(kind)}</EmptyTitle>
              <EmptyDescription>
                {words.screens.catalog.emptyItemsDescription(kind)}
              </EmptyDescription>
            </EmptyContent>
          </EmptyHeader>
        </Empty>
      </div>
    </>
  );
}
