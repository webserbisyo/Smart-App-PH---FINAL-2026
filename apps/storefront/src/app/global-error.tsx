'use client';

import { words } from '@smartapp/core';
import { ErrorScreen } from '@/features/shell/components/error-screen';
import './globals.css';

// The root layout itself failed (T14): its own document, the app's styles, light theme.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const W = words.storefrontShell.errorPage;
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-foreground">
        <title>{W.metaTitle}</title>
        <main className="flex min-h-dvh items-center">
          <ErrorScreen error={error} retry={retry} backHref="/" backLabel={W.home} />
        </main>
      </body>
    </html>
  );
}
