import * as React from 'react';
import { useRouter } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { words } from '@smartapp/core';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@smartapp/ui/components/empty';
import { getMembersTabs } from '../tabs.js';

export function MembersScreen() {
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const tabs = getMembersTabs(pathname).map((tab) => ({
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
        title={words.screens.members.title}
        description={words.screens.members.description}
        tabs={tabs}
      />
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyContent>
              <EmptyTitle>{words.screens.members.emptyMembersTitle}</EmptyTitle>
              <EmptyDescription>{words.screens.members.emptyMembersDescription}</EmptyDescription>
            </EmptyContent>
          </EmptyHeader>
        </Empty>
      </div>
    </>
  );
}
