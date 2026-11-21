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
import { CustomerFace } from '@/app/owner-avatar';
import { ShowcasePhone, useManilaNow } from './phone.js';
import { StageCard, StagePanel, usePhoneSize, type CardSide } from './stage.js';
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

interface Moment {
  title: string;
  meta: string;
  media: React.ReactNode;
}

/** What each chapter "just did", for the live card beside the phone: a real face where a Suki did it. */
function moment(data: Showcase, chapter: Chapter): Moment {
  const kanto = shopOf(data, 'kanto-smash');
  const tala = shopOf(data, 'tala-apparel');
  const chat = data.chat?.order ?? data.board[0];
  const no = orderNoLabel(chat?.orderNo ?? 1);
  const logo = (shop: typeof kanto) => (
    <ShopLogo
      name={shop.storefront.info.name}
      src={imageSources(shop.storefront.info.logo, env.VITE_STOREFRONT_URL)}
      size="md"
      shape="round"
    />
  );
  const face = (
    person:
      { name: string; avatar: Showcase['board'][number]['customerAvatar'] } | null | undefined,
  ) => (person ? <CustomerFace avatar={person.avatar} name={person.name} /> : logo(kanto));
  const member = data.member;
  const meta = (shop: typeof kanto, who?: string | undefined) =>
    [who, shop.storefront.info.name, W.now].filter(Boolean).join(' · ');
  switch (chapter) {
    case 'order': {
      const item = kanto.catalog.items[0];
      return {
        title: W.feed.order(item?.name ?? '', formatPeso(item?.variants[0]?.price ?? 0)),
        meta: meta(kanto, member?.name),
        media: face(member),
      };
    }
    case 'chat':
      return {
        title: W.feed.chat(no),
        meta: meta(kanto, chat?.customerName),
        media: face(chat ? { name: chat.customerName, avatar: chat.customerAvatar } : null),
      };
    case 'stamps':
      return { title: W.feed.stamps, meta: meta(kanto, member?.name), media: face(member) };
    case 'push':
      return { title: W.feed.push(no), meta: meta(kanto), media: logo(kanto) };
    case 'retail': {
      const item = tala.catalog.items[0];
      return {
        title: W.feed.retail(item?.name ?? '', formatPeso(item?.variants[0]?.price ?? 0)),
        meta: meta(tala),
        media: logo(tala),
      };
    }
    case 'owner':
      return {
        title: W.feed.owner(formatPeso(data.week.money.sales)),
        meta: meta(kanto),
        media: logo(kanto),
      };
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

// Chapters next to each other float on opposite sides, so the newest and the one before never overlap.
const sideOf = (c: Chapter): CardSide => (CHAPTERS.indexOf(c) % 2 === 0 ? 'start' : 'end');

function Tour({ yours, wide }: { yours: Yours | null; wide: boolean }) {
  const query = useShowcase();
  const reduce = useReducedMotion();
  const now = useManilaNow();
  const size = usePhoneSize(wide);
  const root = React.useRef<HTMLElement>(null);
  const visible = useVisible(root);
  const [chapter, setChapter] = React.useState<Chapter>('order');
  const [beat, setBeat] = React.useState(0);
  const [stopped, setStopped] = React.useState(false);
  // The chapter played before this one: its card stays on the other side of the phone.
  const [previous, setPrevious] = React.useState<Chapter | null>(null);
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
    if (next !== chapter) setPrevious(chapter);
    setChapter(next);
    setBeat(nextBeat);
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
  const caption = showingYours ? W.chapters.yours : W.chapters[chapter];
  // The newest moment shows once the scene has started; laptops keep the one before on the other side.
  const cards: Chapter[] =
    !data || showingYours
      ? []
      : [
          ...(shownBeat >= 1 ? [chapter] : []),
          ...(wide && previous && previous !== chapter ? [previous] : []),
        ];

  return (
    <section
      ref={root}
      aria-label={W.chaptersLabel}
      className="flex w-full min-w-0 flex-col items-center gap-4"
    >
      <StagePanel
        wide={wide}
        phone={
          <ShowcasePhone label={phoneLabel} size={size}>
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
        }
      >
        {data
          ? cards.map((c) => {
              const m = moment(data, c);
              return (
                <StageCard
                  key={c}
                  wide={wide}
                  side={sideOf(c)}
                  media={m.media}
                  title={m.title}
                  meta={m.meta}
                  reduce={reduce}
                  onOpen={c === chapter ? undefined : () => go(c)}
                />
              );
            })
          : null}
      </StagePanel>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-base font-semibold text-foreground">{caption.title}</p>
        <p className="text-sm text-muted-foreground">{caption.line}</p>
      </div>

      <div
        role="group"
        aria-label={W.playerLabel}
        className="flex items-center gap-1 rounded-full bg-card p-1 shadow-sm ring-1 ring-border"
      >
        {showingYours ? (
          <Button variant="ghost" className="h-11 rounded-full px-4" onClick={() => go('order')}>
            <PlayIcon aria-hidden="true" />
            {W.backToTour}
          </Button>
        ) : (
          <>
            {autoplay ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-full"
                  aria-label={stopped ? W.play : W.pause}
                  onClick={() => setStopped(!stopped)}
                >
                  {stopped ? <PlayIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
                </Button>
                <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-border" />
              </>
            ) : null}
            {CHAPTERS.map((c) => {
              const Icon = ICON[c];
              const current = c === chapter;
              const done = current ? (shownBeat + 1) / BEATS[c] : 0;
              return (
                <button
                  key={c}
                  type="button"
                  aria-label={W.chapters[c].title}
                  aria-current={current ? 'step' : undefined}
                  onClick={() => go(c)}
                  className={cn(
                    'relative flex size-11 items-center justify-center rounded-full transition-colors duration-base outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    current
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover-hover:hover:bg-muted hover-hover:hover:text-foreground',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {current ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-primary/20"
                    >
                      <span
                        style={cssVars({ '--p': done })}
                        className={cn(
                          'block h-full origin-left scale-x-(--p) rounded-full bg-primary',
                          playing && 'transition-transform duration-1000 ease-linear',
                        )}
                      />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </>
        )}
      </div>

      {data ? (
        <Strip
          data={data}
          reduce={reduce}
          edge={wide ? 'from-sidebar' : 'from-background'}
          onShop={(slug) => go(SHOP_CHAPTER[slug] ?? 'order')}
          onFeature={go}
        />
      ) : null}
    </section>
  );
}

/**
 * The sample shops and the features, sliding by in one row (L12). Each one jumps to its chapter. The player
 * above is the keyboard and screen reader way in, so the moving copies stay out of the tab order.
 */
function Strip({
  data,
  reduce,
  edge,
  onShop,
  onFeature,
}: {
  data: Showcase;
  reduce: boolean;
  edge: string;
  onShop: (slug: string) => void;
  onFeature: (chapter: Chapter) => void;
}) {
  const chip =
    'flex h-10 shrink-0 items-center gap-2 rounded-full bg-card px-3 text-sm font-medium whitespace-nowrap shadow-xs ring-1 ring-border transition-colors duration-base hover-hover:hover:bg-muted';
  const shops = data.shops.map(({ slug, shop }) => (
    <button key={slug} type="button" tabIndex={-1} className={chip} onClick={() => onShop(slug)}>
      <ShopLogo
        name={shop.storefront.info.name}
        src={imageSources(shop.storefront.info.logo, env.VITE_STOREFRONT_URL)}
        size="sm"
        shape="round"
        className="size-6"
      />
      {shop.storefront.info.name}
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
        <Icon aria-hidden="true" className="size-4 text-primary" />
        {f.label}
      </button>
    );
  });
  // Shops and features take turns along the strip.
  const mixed = Array.from({ length: Math.max(shops.length, features.length) }, (_, i) => [
    shops[i],
    features[i],
  ])
    .flat()
    .filter((chip) => chip !== undefined);

  if (reduce) {
    return (
      <div aria-hidden="true" className="flex w-full flex-wrap justify-center gap-2">
        {mixed}
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="w-full min-w-0">
      <Marquee speed={28} pauseOnHover autoFill gap="0.5rem" className="py-1">
        <MarqueeContent>
          {mixed.map((c) => (
            <MarqueeItem key={c.key}>{c}</MarqueeItem>
          ))}
        </MarqueeContent>
        <MarqueeEdge side="left" className={edge} />
        <MarqueeEdge side="right" className={edge} />
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
export default function ShowcaseTour({ yours, wide }: { yours: Yours | null; wide: boolean }) {
  return (
    <SampleDataProvider>
      <Tour yours={yours} wide={wide} />
    </SampleDataProvider>
  );
}
