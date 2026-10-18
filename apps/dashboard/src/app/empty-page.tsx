import type { ReactNode } from 'react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@smartapp/ui/components/empty';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import type { NavItem } from '@smartapp/ui/lib/nav';

// Page header plus the installed Empty: every MVP A page until it gets real data.
export function EmptyPage({
  title,
  tabs,
  icon,
  line,
}: {
  title: string;
  tabs?: readonly NavItem[] | undefined;
  icon: ReactNode;
  line: string;
}) {
  return (
    <>
      <PageHeader title={title} tabs={tabs} />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">{icon}</EmptyMedia>
            <EmptyDescription>{line}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </>
  );
}
