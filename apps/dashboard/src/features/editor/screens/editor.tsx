import { words } from '@smartapp/core';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@smartapp/ui/components/empty';

export function EditorScreen() {
  return (
    <>
      <PageHeader
        title={words.screens.editor.title}
        description={words.screens.editor.description}
      />
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyContent>
              <EmptyTitle>{words.screens.editor.emptyTitle}</EmptyTitle>
              <EmptyDescription>{words.screens.editor.emptyDescription}</EmptyDescription>
            </EmptyContent>
          </EmptyHeader>
        </Empty>
      </div>
    </>
  );
}
