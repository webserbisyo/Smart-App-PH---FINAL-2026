import Link from 'next/link';
import { SearchXIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';

// Unknown, pending or suspended shop (pattern c-empty-7). Another shop's pages also land here.
export default function NotFound() {
  const w = words.storefrontShell.notFound;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>
            <h1>{w.title}</h1>
          </EmptyTitle>
          <EmptyDescription>{w.body}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            {w.back}
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
