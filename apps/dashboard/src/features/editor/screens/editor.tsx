import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, PaintbrushIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@smartapp/ui/components/empty';
import { usePageTitle } from '@/app/use-page-title';

// Full screen, outside the shell, with its own top bar.
export function EditorScreen() {
  usePageTitle(words.screens.editor.title);
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 flex min-h-14 items-center gap-1 border-b border-border bg-background px-2 pt-safe">
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={words.shell.back}
          nativeButton={false}
          render={<Link to="/" />}
        >
          <ArrowLeftIcon />
        </Button>
        <h1 className="min-w-0 flex-1 truncate px-2 text-lg font-semibold">
          {words.screens.editor.title}
        </h1>
      </header>
      <main className="flex flex-1 flex-col p-4 md:p-6">
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PaintbrushIcon />
            </EmptyMedia>
            <EmptyDescription>{words.screens.editor.empty}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    </div>
  );
}
