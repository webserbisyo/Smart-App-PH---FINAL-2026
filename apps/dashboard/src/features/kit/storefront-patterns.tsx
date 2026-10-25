import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from 'react';
import { DEMO_SHOP_SLUGS, DEMO_SHOPS, type DemoShopSlug } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';
import { KitShopProvider } from './kit-shop.js';
import { PATTERN_SCREENS, KIT_PATTERNS, type PatternScreen } from './patterns.js';

// One lazy chunk per screen, so /kit stays quick.
const SECTIONS: Record<PatternScreen, ComponentType> = {
  shell: lazy(() => import('./patterns-shell.js')),
  howWhere: lazy(() => import('./patterns-how-where.js')),
  home: lazy(() => import('./patterns-home.js')),
  menu: lazy(() => import('./patterns-menu.js')),
  itemSheet: lazy(() => import('./patterns-item-sheet.js')),
  basket: lazy(() => import('./patterns-basket.js')),
  checkout: lazy(() => import('./patterns-checkout.js')),
  receipt: lazy(() => import('./patterns-receipt.js')),
  myOrders: lazy(() => import('./patterns-my-orders.js')),
  rewards: lazy(() => import('./patterns-rewards.js')),
  shopInfo: lazy(() => import('./patterns-shop-info.js')),
};

/** Mounts its section only once it comes near the screen. */
function LazySection({ screen }: { screen: PatternScreen }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const Section = SECTIONS[screen];
  const fallback = <Skeleton className="h-64 w-full rounded-xl" />;
  return (
    <div ref={ref} className="min-h-64">
      {near ? (
        <Suspense fallback={fallback}>
          <Section />
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}

export function StorefrontPatterns() {
  const [slug, setSlug] = useState<DemoShopSlug>('kanto-smash');
  const summary = DEMO_SHOPS.find((s) => s.slug === slug) ?? DEMO_SHOPS[0];
  if (!summary) return null;

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Storefront patterns</h2>
          <p className="text-sm text-muted-foreground">
            {KIT_PATTERNS.length} ReUI patterns, grouped by the screen that will use them. Pick a
            demo shop: its colours and photos fill every example.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEMO_SHOP_SLUGS.map((s) => (
            <Button key={s} variant={s === slug ? 'default' : 'outline'} onClick={() => setSlug(s)}>
              {DEMO_SHOPS.find((d) => d.slug === s)?.name ?? s}
            </Button>
          ))}
        </div>
      </section>

      <KitShopProvider slug={slug}>
        <ShopTheme brandColor={summary.brandColor} surface={summary.surface}>
          <div className="space-y-10">
            {PATTERN_SCREENS.map((screen) => (
              <section key={screen.key} className="min-w-0 space-y-4">
                <h3 className="text-xl font-semibold">{screen.title}</h3>
                <LazySection screen={screen.key} />
              </section>
            ))}
          </div>
        </ShopTheme>
      </KitShopProvider>
    </div>
  );
}
