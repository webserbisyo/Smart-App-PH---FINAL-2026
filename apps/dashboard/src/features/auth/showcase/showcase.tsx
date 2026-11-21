import * as React from 'react';
import {
  BellRingIcon,
  ChartLineIcon,
  MessageCircleIcon,
  PauseIcon,
  PlayIcon,
  ShirtIcon,
  ShoppingBagIcon,
  StampIcon,
  type LucideIcon,
} from 'lucide-react';
import { formatPeso, imageSources, showcaseWords, type Showcase } from '@smartapp/core';
import { SampleDataProvider, useShowcase } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Marquee, MarqueeContent, MarqueeEdge, MarqueeItem } from '@smartapp/ui/components/marquee';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { cn } from '@smartapp/ui/lib/utils';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import { env } from '@/app/env';
import { ShowcasePhone, useManilaNow } from './phone.js';
import {
  ChatScene,
  OrderScene,
  OwnerScene,
  PushScene,
  RetailScene,
  shopOf,
  StampsScene,
  YoursScene,
  type SceneProps,
  type Yours,
} from './scenes.js';

const W = showcaseWords;
const BEAT_MS = 1000;

const CHAPTERS = ['order', 'chat', 'stamps', 'push', 'retail', 'owner'] as const;
type Chapter = (typeof CHAPTERS)[number];

const BEATS: Record<Chapter, number> = {
  order: 6,
  chat: 5,
  stamps: 6,
  push: 7,
  retail: 6,
  owner: 5,
};
const ICON: Record<Chapter, LucideIcon> = {
  order: ShoppingBagIcon,
  chat: MessageCircleIcon,
  stamps: StampIcon,
  push: BellRingIcon,
  retail: ShirtIcon,
  owner: ChartLineIcon,
};
const SCENE: Record<Chapter, (props: SceneProps) => React.ReactNode> = {
  order: OrderScene,
  chat: ChatScene,
  stamps: StampsScene,
  push: PushScene,
  retail: RetailScene,
  owner: OwnerScene,
};
const FEATURE_CHAPTER: Record<keyof typeof W.features, Chapter> = {
  stamps: 'stamps',
  reward: 'stamps',
  chat: 'chat',
  photo: 'chat',
  push: 'push',
  news: 'push',
  sizes: 'retail',
  prize: 'retail',
  board: 'owner',
  link: 'order',
  ahead: 'order',
};
const FEATURES = Object.entries(W.features).flatMap(([key, label]) => {
  const chapter = Object.entries(FEATURE_CHAPTER).find(([k]) => k === key)?.[1];
  return chapter ? [{ key, label, chapter }] : [];
});
// A sample shop's logo opens the chapter it shows best.
const SHOP_CHAPTER: Record<string, Chapter> = { 'tala-apparel': 'retail' };

/** The phone's data saver: no autoplay when the person asked to save data. */
function savesData(): boolean {
  const connection: unknown = Reflect.get(navigator, 'connection');
  return (
    typeof connection === 'object' &&
    connection !== null &&
    Reflect.get(connection, 'saveData') === true
  );
}

function feedLine(data: Showcase, chapter: Chapter): string {
  const kanto = shopOf(data, 'kanto-smash');
  const tala = shopOf(data, 'tala-apparel');
  const no = orderNoLabel(data.chat?.order.orderNo ?? data.board[0]?.orderNo ?? 1);
  switch (chapter) {
    case 'order': {
      const item = kanto.catalog.items[0];
      return W.feed.order(item?.name ?? '', formatPeso(item?.variants[0]?.price ?? 0));
    }
    case 'chat':
      return W.feed.chat(no);
    case 'stamps':
      return W.feed.stamps;
    case 'push':
      return W.feed.push(no);
    case 'retail': {
      const item = tala.catalog.items[0];
      return W.feed.retail(item?.name ?? '', formatPeso(item?.variants[0]?.price ?? 0));
    }
    case 'owner':
      return W.feed.owner(formatPeso(data.today.money.sales));
  }
}

function useVisible(ref: React.RefObject<HTMLElement | null>): boolean {
  const [onScreen, setOnScreen] = React.useState(true);
  const [tabShown, setTabShown] = React.useState(true);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? true), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  React.useEffect(() => {
    const sync = () => setTabShown(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  return onScreen && tabShown;
}

function Tour({ yours }: { yours: Yours | null }) {
  const query = useShowcase();
  const reduce = useReducedMotion();
  const now = useManilaNow();
  const root = React.useRef<HTMLElement>(null);
  const visible = useVisible(root);
  const [chapter, setChapter] = React.useState<Chapter>('order');
  const [beat, setBeat] = React.useState(0);
  const [stopped, setStopped] = React.useState(false);
  // The chapters played, newest first: the live list beside the phone.
  const [history, setHistory] = React.useState<Chapter[]>(['order']);
  // The form values the person chose to leave: the tour plays again until they type something new.
  const [leftYours, setLeftYours] = React.useState('');
  const data = query.data;

  const autoplay = !reduce && !savesData();
  // What the person types turns the phone into their own app (L1).
  const yoursKey = yours ? `${yours.name.trim()}|${yours.kind}|${yours.colour ?? ''}` : '';
  const touched = yours !== null && (yours.name.trim() !== '' || yours.colour !== null);
  const showingYours = touched && leftYours !== yoursKey;
  const playing = autoplay && !stopped && !showingYours && visible;

  const turnTo = (next: Chapter, nextBeat: number) => {
    setChapter(next);
    setBeat(nextBeat);
    setHistory((h) => [next, ...h.filter((c) => c !== next)].slice(0, 3));
  };

  const advance = React.useEffectEvent(() => {
    if (beat + 1 < BEATS[chapter]) setBeat(beat + 1);
    else turnTo(CHAPTERS[(CHAPTERS.indexOf(chapter) + 1) % CHAPTERS.length] ?? 'order', 0);
  });

  React.useEffect(() => {
    if (!playing || !data) return;
    const id = window.setTimeout(advance, BEAT_MS);
    return () => window.clearTimeout(id);
  }, [playing, data, beat, chapter]);

  const go = (next: Chapter) => {
    setLeftYours(yoursKey);
    // Without autoplay the scene shows its last moment at once.
    turnTo(next, autoplay ? 0 : BEATS[next] - 1);
    if (autoplay) setStopped(false);
  };

  const shownBeat = autoplay ? beat : BEATS[chapter] - 1;
  const Scene = SCENE[chapter];
  const sceneProps: SceneProps | null = data
    ? { data, beat: shownBeat, now, live: playing, reduce }
    : null;
  const phoneLabel = showingYours
    ? `${W.phoneLabel}: ${W.chapters.yours.title}`
    : `${W.phoneLabel}: ${W.chapters[chapter].title}`;

  return (
    <section ref={root} aria-label={W.chaptersLabel} className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 justify-center rounded-3xl brand-gradient p-5 shadow-lg">
          <ShowcasePhone label={phoneLabel}>
            {sceneProps ? (
              showingYours && yours ? (
                <YoursScene {...sceneProps} yours={yours} />
              ) : (
                <Scene key={chapter} {...sceneProps} />
              )
            ) : (
              <div className="flex flex-col gap-3 p-4 pt-14">
                <Skeleton className="h-10 w-2/3 rounded-xl" />
                <Skeleton className="h-36 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            )}
          </ShowcasePhone>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-4">
          <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-col sm:overflow-visible sm:px-0 sm:pb-0">
            {CHAPTERS.map((c) => {
              const Icon = ICON[c];
              const current = !showingYours && c === chapter;
              const done = current ? (shownBeat + 1) / BEATS[c] : 0;
              return (
                <li key={c} className="shrink-0 sm:shrink">
                  <button
                    type="button"
                    aria-current={current ? 'step' : undefined}
                    onClick={() => go(c)}
                    className={cn(
                      'flex min-h-11 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-base outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      current
                        ? 'bg-card shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover-hover:hover:bg-muted',
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn('mt-0.5 size-4 shrink-0', current && 'text-primary')}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span
                        className={cn(
                          'text-sm font-semibold whitespace-nowrap',
                          current && 'text-foreground',
                        )}
                      >
                        {W.chapters[c].title}
                      </span>
                      <span className="hidden text-sm text-muted-foreground sm:block">
                        {W.chapters[c].line}
                      </span>
                      <span
                        aria-hidden="true"
                        className="block h-0.5 overflow-hidden rounded-full bg-muted"
                      >
                        <span
                          style={cssVars({ '--p': done })}
                          className={cn(
                            'block h-full origin-left scale-x-(--p) rounded-full bg-primary',
                            playing && current && 'transition-transform duration-1000 ease-linear',
                          )}
                        />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {showingYours ? (
            <Button variant="outline" className="h-11 self-start" onClick={() => go('order')}>
              <PlayIcon aria-hidden="true" />
              {W.backToTour}
            </Button>
          ) : null}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
                {W.liveTitle}
              </h2>
              {autoplay && !showingYours ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 gap-1.5"
                  onClick={() => setStopped(!stopped)}
                >
                  {stopped ? <PlayIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
                  {stopped ? W.play : W.pause}
                </Button>
              ) : null}
            </div>
            <ul className="flex flex-col gap-2">
              {(data ? history : []).map((c, i) => {
                const Icon = ICON[c];
                return (
                  <li key={c} className={cn(i === 2 && 'hidden sm:block')}>
                    <button
                      type="button"
                      onClick={() => go(c)}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-card px-3 py-2 text-left text-sm shadow-xs ring-1 ring-border transition-colors duration-base outline-none focus-visible:ring-2 focus-visible:ring-ring hover-hover:hover:bg-muted"
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">{data ? feedLine(data, c) : null}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{W.now}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {data ? (
        <Strips
          data={data}
          reduce={reduce}
          onShop={(slug) => go(SHOP_CHAPTER[slug] ?? 'order')}
          onFeature={go}
        />
      ) : null}
    </section>
  );
}

/**
 * The sample shops and the features, sliding by (L12). Each one jumps to its chapter. The chapters above are
 * the keyboard and screen reader way in, so the moving copies stay out of the tab order.
 */
function Strips({
  data,
  reduce,
  onShop,
  onFeature,
}: {
  data: Showcase;
  reduce: boolean;
  onShop: (slug: string) => void;
  onFeature: (chapter: Chapter) => void;
}) {
  const chip =
    'flex h-10 items-center gap-2 rounded-full bg-card px-3 text-sm font-medium shadow-xs ring-1 ring-border transition-colors duration-base hover-hover:hover:bg-muted';
  const shops = data.shops.map(({ slug, shop }) => (
    <button key={slug} type="button" tabIndex={-1} className={chip} onClick={() => onShop(slug)}>
      <ShopLogo
        name={shop.storefront.info.name}
        src={imageSources(shop.storefront.info.logo, env.VITE_STOREFRONT_URL)}
        size="sm"
        shape="round"
        className="size-6"
      />
      {W.sample(shop.storefront.info.name)}
    </button>
  ));
  const features = FEATURES.map((f) => {
    const Icon = ICON[f.chapter];
    return (
      <button
        key={f.key}
        type="button"
        tabIndex={-1}
        className={chip}
        onClick={() => onFeature(f.chapter)}
      >
        <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
        {f.label}
      </button>
    );
  });

  if (reduce) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">{shops}</div>
        <div className="flex flex-wrap gap-2">{features}</div>
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <Marquee speed={30} pauseOnHover autoFill gap={8}>
        <MarqueeContent>
          {shops.map((s) => (
            <MarqueeItem key={s.key}>{s}</MarqueeItem>
          ))}
        </MarqueeContent>
        <MarqueeEdge side="left" />
        <MarqueeEdge side="right" />
      </Marquee>
      <Marquee speed={24} pauseOnHover autoFill gap={8} reverse>
        <MarqueeContent>
          {features.map((f) => (
            <MarqueeItem key={f.key}>{f}</MarqueeItem>
          ))}
        </MarqueeContent>
        <MarqueeEdge side="left" />
        <MarqueeEdge side="right" />
      </Marquee>
    </div>
  );
}

/**
 * The sign-up tour (T108 L1, L11 to L14): a phone playing six short chapters on our sample shops with the
 * real screens (menu cards, the order chat, the stamp card and its confetti, the notification cards, the
 * order card and the sales card). Typing a shop name turns it into the person's own app. It always reads
 * the sample shops, whatever the app's data source.
 */
export default function ShowcaseTour({ yours }: { yours: Yours | null }) {
  return (
    <SampleDataProvider>
      <Tour yours={yours} />
    </SampleDataProvider>
  );
}
