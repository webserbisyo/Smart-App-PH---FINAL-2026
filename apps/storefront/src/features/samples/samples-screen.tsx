import Link from 'next/link';
import {
  DEMO_SHOP_SLUGS,
  PLAN_TRIAL_DAYS,
  samplesWords,
  words,
  type ShopKind,
} from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { buttonVariants } from '@smartapp/ui/components/button';
import { BrandLockup } from '@smartapp/ui/compositions/brand-lockup';
import { appEnv, dashboardOrigin, dataSource } from '@/env';
import { SampleCard } from './sample-card';

const W = samplesWords;
const KINDS = ['food', 'retail'] as const satisfies readonly ShopKind[];

// "See the owner side" needs the dashboard's sample sign-in, which only development and preview builds on
// sample data have (T100). Live builds show Open the shop alone.
const OWNER_SIDE = appEnv !== 'production' && dataSource === 'mock';

/**
 * The Sample shops page (T109): every demo shop as a card, food shops first, then retail, with chips that jump
 * to each group. Links only and built ahead, so the page sends no JavaScript of its own; the shops come from
 * the same server reader as each shop's own pages.
 */
export function SamplesScreen() {
  const shops = DEMO_SHOP_SLUGS.flatMap((slug) => {
    const shop = getStorefrontForServer(slug);
    return shop ? [{ slug, shop }] : [];
  });
  const groups = KINDS.map((kind) => ({
    kind,
    shops: shops.filter(({ shop }) => shop.storefront.info.kind === kind),
  })).filter((g) => g.shops.length > 0);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 pt-safe pb-10 md:px-6">
      <header className="flex flex-col gap-4 pt-6">
        <Link href="/" className="self-start rounded-lg">
          <BrandLockup
            name={words.appName}
            size="sm"
            markSrc="/brand/smartappph-mark-96.webp"
            markSrc2x="/brand/smartappph-mark-192.webp"
          />
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-balance">{W.title}</h1>
          <p className="max-w-prose text-base text-muted-foreground">{W.intro}</p>
        </div>
        <nav aria-label={W.filterLabel} className="flex flex-wrap gap-2">
          {groups.map(({ kind, shops: list }) => (
            <a
              key={kind}
              href={`#${kind}`}
              className="flex h-11 items-center gap-2 rounded-full bg-card px-4 text-sm font-medium ring-1 ring-border transition-colors duration-base outline-none focus-visible:ring-2 focus-visible:ring-ring hover-hover:hover:bg-muted"
            >
              {W.kind[kind]}
              <span className="text-muted-foreground tabular">{list.length}</span>
            </a>
          ))}
        </nav>
      </header>

      {groups.map(({ kind, shops: list }, g) => (
        <section
          key={kind}
          id={kind}
          aria-labelledby={`${kind}-title`}
          className="flex scroll-mt-4 flex-col gap-3"
        >
          <h2 id={`${kind}-title`} className="text-xl font-bold">
            {W.kind[kind]}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map(({ slug, shop }, index) => (
              <li key={slug}>
                <SampleCard
                  slug={slug}
                  shop={shop}
                  priority={g === 0 && index < 2}
                  ownerHref={OWNER_SIDE ? `${dashboardOrigin}/login?sample=${slug}` : null}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-center text-sm text-muted-foreground">{W.sampleNote}</p>

      <section className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 text-center ring-1 ring-border">
        <h2 className="text-xl font-bold">{W.readyTitle}</h2>
        <p className="text-base text-muted-foreground">{W.readyLine(PLAN_TRIAL_DAYS)}</p>
        <a
          href={`${dashboardOrigin}/signup`}
          className={buttonVariants({ size: 'lg', className: 'h-12 px-6 text-base' })}
        >
          {W.start(PLAN_TRIAL_DAYS)}
        </a>
      </section>
    </main>
  );
}
