import type { ReactNode } from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { setAppearance, useAppearance } from '@/app/appearance';

// The kit's five pages (decision T98): Base for shared parts, then each app, then the tokens and every route.
export const KIT_PAGES = [
  { href: '/kit', label: 'Base', blurb: 'Installed components and the app frame both apps share.' },
  { href: '/kit/dashboard', label: 'Dashboard', blurb: 'Owner screens, area by area.' },
  { href: '/kit/storefront', label: 'Storefront', blurb: 'Customer screens in each shop colour.' },
  { href: '/kit/tokens', label: 'Tokens', blurb: 'Colours, surface layers and shop palettes.' },
  { href: '/kit/routes', label: 'Routes', blurb: 'Every page of both apps, with links.' },
] as const;

export type KitPageHref = (typeof KIT_PAGES)[number]['href'];

/** Header, page tabs and the light/dark switch around one kit page. */
export function KitFrame({ current, children }: { current: KitPageHref; children: ReactNode }) {
  const appearance = useAppearance();
  const dark = appearance === 'dark';
  const page = KIT_PAGES.find((p) => p.href === current) ?? KIT_PAGES[0];

  return (
    <div className="min-h-dvh overflow-x-clip bg-background p-4 text-foreground md:p-10">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{words.appName} kit</p>
            <h1 className="text-3xl font-bold tracking-tight">{page.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{page.blurb}</p>
          </div>
          <Button
            variant="outline"
            className="h-11 self-start sm:self-auto"
            onClick={() => setAppearance(dark ? 'light' : 'dark')}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
            {dark ? 'Light mode' : 'Dark mode'}
          </Button>
        </header>

        <nav
          aria-label="Kit pages"
          className="sticky top-0 z-sticky -mx-4 border-b bg-background/90 px-4 py-2 backdrop-blur-md md:-mx-10 md:px-10"
        >
          <div className="scrollbar-none flex gap-2 overflow-x-auto">
            {KIT_PAGES.map((p) => (
              <Button
                key={p.href}
                variant={p.href === current ? 'default' : 'outline'}
                size="sm"
                render={<a href={p.href} aria-current={p.href === current ? 'page' : undefined} />}
                nativeButton={false}
                className="h-9 shrink-0 rounded-full px-4 pointer-coarse:h-11"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </nav>

        {children}
      </div>
    </div>
  );
}

/** In-page jump links for a long kit page. */
export function KitJumpBar({ groups }: { groups: readonly { id: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((group) => (
        <Button
          key={group.id}
          variant="ghost"
          size="sm"
          render={<a href={`#${group.id}`} />}
          nativeButton={false}
          className="h-9 rounded-full px-3 pointer-coarse:h-11"
        >
          {group.label}
        </Button>
      ))}
    </div>
  );
}
