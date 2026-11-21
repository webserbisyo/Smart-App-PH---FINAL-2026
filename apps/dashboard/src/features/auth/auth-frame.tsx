import * as React from 'react';
import { words } from '@smartapp/core';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { BrandLockup } from '@smartapp/ui/compositions/brand-lockup';
import { useMediaQuery } from '@/app/use-media-query';

const LoginHero = React.lazy(() => import('./showcase/login-hero.js'));

/** Laptops and up get the stage beside the form. */
export function useWide(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/**
 * The right half on laptops, shared by Log in and Sign up: the side-nav grey, pinned to the window while the
 * form beside it scrolls, so the phone is never cut off.
 */
export function AuthAside({ children }: { children: React.ReactNode }) {
  return (
    <aside className="sticky top-0 flex h-dvh min-w-0 flex-col items-center justify-center self-start overflow-hidden bg-sidebar px-8 py-6">
      <div className="flex w-full max-w-xl flex-col items-center">{children}</div>
    </aside>
  );
}

/** What shows while the stage loads: the gradient panel's place. */
export function StageSkeleton() {
  return <Skeleton className="h-136.5 w-full max-w-xl rounded-3xl" />;
}

/**
 * Log in and Forgot password frame (T108). Phones: the logo gradient as a thin top band, the logo, then the
 * card. Laptops: the same on the left, and the stage with the owner's week on a phone on the right (words
 * never sit on the gradient, L7). The phone only loads on laptops.
 */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  const wide = useWide();
  return (
    <main className="relative grid min-h-dvh bg-background pt-safe lg:grid-cols-2">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 brand-gradient lg:hidden" />
      <div className="flex flex-col items-center justify-center gap-8 p-4 md:p-8">
        <BrandLockup name={words.appName} size="lg" />
        <div className="w-full max-w-sm md:max-w-md">{children}</div>
      </div>
      {wide ? (
        <AuthAside>
          <React.Suspense fallback={<StageSkeleton />}>
            <LoginHero />
          </React.Suspense>
        </AuthAside>
      ) : null}
    </main>
  );
}
