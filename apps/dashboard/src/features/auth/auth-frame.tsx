import type { ReactNode } from 'react';
import { words } from '@smartapp/core';

/** Login and sign-up page frame: the logo gradient as a thin top band, the stacked logo, then the card. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-8 bg-background p-4 pt-safe md:p-8">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 brand-gradient" />
      <img
        src="/brand/smartappph-lockup-stacked.webp"
        alt={words.appName}
        width={160}
        height={164}
        className="h-auto w-36 md:w-44"
      />
      <div className="w-full max-w-sm md:max-w-md">{children}</div>
    </main>
  );
}
