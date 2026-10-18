import { words } from '@smartapp/core';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@smartapp/ui/components/empty';

export function InsightsScreen() {
  return (
    <>
      <PageHeader
        title={words.screens.insights.title}
        description={words.screens.insights.description}
      />
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyContent>
              <EmptyTitle>{words.screens.insights.emptyTitle}</EmptyTitle>
              <EmptyDescription>{words.screens.insights.emptyDescription}</EmptyDescription>
            </EmptyContent>
          </EmptyHeader>
        </Empty>
      </div>
    </>
  );
}
