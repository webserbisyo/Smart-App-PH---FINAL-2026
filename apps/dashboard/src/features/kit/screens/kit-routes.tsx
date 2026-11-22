import { ExternalLinkIcon } from 'lucide-react';
import { Badge } from '@smartapp/ui/components/badge';
import { Separator } from '@smartapp/ui/components/separator';
import { env } from '@/app/env';
import { KitFrame } from '../kit-frame.js';
import {
  ADMIN_ROUTES,
  DASHBOARD_ROUTES,
  GUEST_ROUTES,
  PLATFORM_ROUTES,
  SCAN_SHOPS,
  STOREFRONT_ROUTES,
  type CatalogRoute,
} from '../route-catalog.js';

// Kit page 5 of 5, Routes (decision T98): every page of both apps from route-catalog.ts, the same list the
// UI scan in CI opens. A page missing here is a page the scan never checks.

function RouteList({
  title,
  hint,
  routes,
  base,
  external = false,
}: {
  title: string;
  hint: string;
  routes: readonly CatalogRoute[];
  base: string;
  external?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <ul className="divide-y overflow-hidden rounded-lg border bg-card">
        {routes.map((route) => (
          <li
            key={route.path}
            className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2"
          >
            <div className="min-w-0 flex-1">
              {route.open === undefined ? (
                <span className="text-sm font-medium">{route.label}</span>
              ) : (
                <a
                  href={`${base}${route.open}`}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noreferrer' : undefined}
                  className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {route.label}
                  {external ? <ExternalLinkIcon className="size-3.5" aria-hidden /> : null}
                </a>
              )}
              <p className="font-mono text-xs break-all text-muted-foreground">
                {route.path || '/'}
              </p>
            </div>
            {route.note ? (
              <span className="text-xs text-muted-foreground">{route.note}</span>
            ) : null}
            <Badge variant={route.scan ? 'secondary' : 'outline'}>
              {route.scan ? 'Scanned' : 'Not scanned'}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function KitRoutesPage() {
  const store = env.VITE_STOREFRONT_URL;
  const total =
    DASHBOARD_ROUTES.length +
    ADMIN_ROUTES.length +
    GUEST_ROUTES.length +
    PLATFORM_ROUTES.length +
    STOREFRONT_ROUTES.length;

  return (
    <KitFrame current="/kit/routes">
      <p className="text-sm text-muted-foreground">
        {total} routes. The UI scan opens each scanned page at 360, 768 and 1280 px (dashboard in
        light and dark) and fails on console errors, failed requests or sideways scroll.
      </p>

      <RouteList
        title="Dashboard: shop owner"
        hint="Opens as the signed-in owner. On sample data, use Look around with sample data on the sign-in page."
        routes={DASHBOARD_ROUTES}
        base=""
      />
      <RouteList
        title="Dashboard: platform admin"
        hint="Needs the admin view: pick Platform admin under View as in the Preview panel."
        routes={ADMIN_ROUTES}
        base=""
      />
      <RouteList
        title="Dashboard: signed out"
        hint="Shown before sign-in."
        routes={GUEST_ROUTES}
        base=""
      />

      <Separator />

      <RouteList
        title="Storefront: our own pages"
        hint="Outside any shop. Opens the storefront app in a new tab."
        routes={PLATFORM_ROUTES}
        base={store}
        external
      />
      {SCAN_SHOPS.map((slug) => (
        <RouteList
          key={slug}
          title={`Storefront: ${slug}`}
          hint="Opens the storefront app in a new tab."
          routes={STOREFRONT_ROUTES}
          base={`${store}/${slug}`}
          external
        />
      ))}
    </KitFrame>
  );
}
