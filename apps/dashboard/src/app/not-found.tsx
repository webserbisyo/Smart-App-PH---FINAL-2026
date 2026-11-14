import { Link } from '@tanstack/react-router';
import { CompassIcon } from 'lucide-react';
import { adminWords } from '@smartapp/core';
import { buttonVariants } from '@smartapp/ui/components/button';
import { PageEmpty } from './page-state.js';

/** One Not found for a wrong link and for pages this account may not see (rule 12, decision T88). */
export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <PageEmpty
        icon={<CompassIcon className="size-8 text-muted-foreground" />}
        title={adminWords.notFound}
        description={adminWords.notFoundLine}
        action={
          <Link to="/" className={buttonVariants({ className: 'h-11 md:h-9' })}>
            {adminWords.goHome}
          </Link>
        }
      />
    </main>
  );
}
