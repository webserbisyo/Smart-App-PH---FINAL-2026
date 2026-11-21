import * as React from 'react';
import { words } from '@smartapp/core';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { BrandLockup } from '@smartapp/ui/compositions/brand-lockup';
import { useMediaQuery } from '@/app/use-media-query';

const LoginHero = React.lazy(() => import('./showcase/login-hero.js'));

/**
 * Log in and Forgot password frame (T108 L8). Phones: the logo gradient as a thin top band, the logo, then
 * the card. Laptops: the same on the left, and the logo gradient panel with the owner's day on a phone on the
 * right (words never sit on the gradient, L7). The phone only loads on laptops.
 */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  const wide = useMediaQuery('(min-width: 1024px)');
  return (
    <main className="relative grid min-h-dvh bg-background pt-safe lg:grid-cols-2">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 brand-gradient lg:hidden" />
      <div className="flex flex-col items-center justify-center gap-8 p-4 md:p-8">
        <BrandLockup name={words.appName} size="lg" />
        <div className="w-full max-w-sm md:max-w-md">{children}</div>
      </div>
      {wide ? (
        <aside className="flex items-center justify-center bg-sidebar p-10">
          <div className="flex justify-center rounded-3xl brand-gradient p-8 shadow-lg">
            <React.Suspense fallback={<Skeleton className="h-145.25 w-66.5 rounded-4xl" />}>
              <LoginHero />
            </React.Suspense>
          </div>
        </aside>
      ) : null}
    </main>
  );
}
