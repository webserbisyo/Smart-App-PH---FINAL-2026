import * as React from 'react';
import {
  BellRingIcon,
  MessageCircleIcon,
  PauseIcon,
  PlayIcon,
  ShirtIcon,
  ShoppingBagIcon,
  SmartphoneIcon,
  StampIcon,
  type LucideIcon,
} from 'lucide-react';
import { imageSources, showcaseWords, type Showcase } from '@smartapp/core';
import { SampleDataProvider, useShowcase } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Marquee, MarqueeContent, MarqueeEdge, MarqueeItem } from '@smartapp/ui/components/marquee';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { cn } from '@smartapp/ui/lib/utils';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { env } from '@/app/env';
import { ShowcasePhone, useManilaNow } from './phone.js';
import { StagePanel, usePhoneSize } from './stage.js';
import {
  ChatScene,
  OrderScene,
  OwnerScene,
  PACE,
  PushScene,
  RetailScene,
  shopOf,
  ShopScene,
  StampsScene,
  YoursScene,
  type SceneProps,
  type Yours,
} from './scenes.js';

const W = showcaseWords;

const CHAPTERS = ['order', 'chat', 'stamps', 'push', 'retail', 'owner'] as const;
type Chapter = (typeof CHAPTERS)[number];

const ICON: Record<Chapter, LucideIcon> = {
  order: ShoppingBagIcon,
  chat: MessageCircleIcon,
  stamps: StampIcon,
  push: BellRingIcon,
  retail: ShirtIcon,
  owner: SmartphoneIcon,
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

const steps = (c: Chapter) => PACE[c].length;

/** The phone's data saver: no autoplay when the person asked to save data. */
function savesData(): boolean {
  const connection: unknown = Reflect.get(navigator, 'connection');
  return (
    typeof connection === 'object' &&
    connection !== null &&
    Reflect.get(connection, 'saveData') === true
  );
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

/** A new screen fades in softly instead of cutting, like an app opening. */
function SceneFade({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in-0 zoom-in-98 flex h-full min-h-0 flex-col duration-300 motion-reduce:animate-none">
      {children}
    </div>
  );
}

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
  // A sample shop picked from the strip: the phone shows its home until a chapter is picked.
  const [shop, setShop] = React.useState<string | null>(null);
  // The form values the person chose to leave: the tour plays again until they type something new.
  const [leftYours, setLeftYours] = React.useState('');
  const data = query.data;

  const autoplay = !reduce && !savesData();
  // What the person types turns the phone into their own app (L1).
  const yoursKey = yours ? `${yours.name.trim()}|${yours.kind}|${yours.colour ?? ''}` : '';
  const touched = yours !== null && (yours.name.trim() !== '' || yours.colour !== null);
  const showingYours = touched && leftYours !== yoursKey;
  const showingShop = !showingYours && shop !== null;
  const touring = !showingYours && !showingShop;
  const playing = autoplay && !stopped && touring && visible;

  const turnTo = (next: Chapter, nextBeat: number) => {
    setChapter(next);
    setBeat(nextBeat);
  };

  const advance = React.useEffectEvent(() => {
    if (beat + 1 < steps(chapter)) setBeat(beat + 1);
    else turnTo(CHAPTERS[(CHAPTERS.indexOf(chapter) + 1) % CHAPTERS.length] ?? 'order', 0);
  });

  React.useEffect(() => {
    if (!playing || !data) return;
    const id = window.setTimeout(advance, PACE[chapter][beat] ?? 1200);
    return () => window.clearTimeout(id);
  }, [playing, data, beat, chapter]);

  const go = (next: Chapter) => {
    setLeftYours(yoursKey);
    setShop(null);
    // Without autoplay the scene shows its last moment at once.
    turnTo(next, autoplay ? 0 : steps(next) - 1);
    if (autoplay) setStopped(false);
  };

  const openShop = (slug: string) => {
    setLeftYours(yoursKey);
    setShop(slug);
  };

  const shownBeat = autoplay ? beat : steps(chapter) - 1;
  const Scene = SCENE[chapter];
  const sceneProps: SceneProps | null = data
    ? { data, beat: shownBeat, now, live: playing, reduce }
    : null;
  const shopName = data && shop ? shopOf(data, shop).storefront.info.name : '';
  const caption = showingYours
    ? W.chapters.yours
    : showingShop
      ? { title: W.sample(shopName), line: W.shopLine }
      : W.chapters[chapter];
  const sceneKey = showingYours ? 'yours' : showingShop ? `shop-${shop}` : chapter;
  // Elapsed share of the chapter at the end of this step, for the progress line.
  const pace = PACE[chapter];
  const total = pace.reduce((a, b) => a + b, 0);
  const done = pace.slice(0, shownBeat + 1).reduce((a, b) => a + b, 0) / total;

  return (
    <section
      ref={root}
      aria-label={W.chaptersLabel}
      className="flex w-full min-w-0 flex-col items-center gap-4"
    >
      <StagePanel
        wide={wide}
        phone={
          <ShowcasePhone label={`${W.phoneLabel}: ${caption.title}`} size={size}>
            {sceneProps ? (
              <SceneFade key={sceneKey}>
                {showingYours && yours ? (
                  <YoursScene {...sceneProps} yours={yours} />
                ) : showingShop && shop ? (
                  <ShopScene {...sceneProps} slug={shop} />
                ) : (
                  <Scene {...sceneProps} />
                )}
              </SceneFade>
            ) : (
              <div className="flex flex-col gap-3 p-4 pt-14">
                <Skeleton className="h-10 w-2/3 rounded-xl" />
                <Skeleton className="h-36 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            )}
          </ShowcasePhone>
        }
      />

      <div className="flex min-h-12 flex-col items-center gap-0.5 text-center">
        <p className="text-base font-semibold text-foreground">{caption.title}</p>
        <p className="text-sm text-muted-foreground">{caption.line}</p>
      </div>

      <div
        role="group"
        aria-label={W.playerLabel}
        className="flex items-center gap-1 rounded-full bg-card p-1 shadow-sm ring-1 ring-border"
      >
        {touring ? (
          autoplay ? (
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
          ) : null
        ) : (
          <>
            <Button variant="ghost" className="h-11 rounded-full px-3" onClick={() => go(chapter)}>
              <PlayIcon aria-hidden="true" />
              {W.backToTour}
            </Button>
            <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-border" />
          </>
        )}
        {CHAPTERS.map((c) => {
          const Icon = ICON[c];
          const current = touring && c === chapter;
          return (
            <button
              key={c}
              type="button"
              aria-label={W.chapters[c].title}
              aria-current={current ? 'step' : undefined}
              onClick={() => go(c)}
              className={cn(
                'relative flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-base outline-none focus-visible:ring-2 focus-visible:ring-ring',
                current
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover-hover:hover:bg-muted hover-hover:hover:text-foreground',
                !touring && 'max-sm:hidden',
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
      </div>

      {data ? (
        <Strip
          data={data}
          reduce={reduce}
          picked={showingShop ? shop : null}
          edge={wide ? 'from-sidebar' : 'from-background'}
          onShop={openShop}
          onFeature={go}
        />
      ) : null}
    </section>
  );
}

/**
 * The sample shops and the features, sliding by in one row (L12). A shop opens its own app in the phone; a
 * feature plays its chapter. The player above is the keyboard and screen reader way in, so the moving
 * copies stay out of the tab order.
 */
function Strip({
  data,
  reduce,
  picked,
  edge,
  onShop,
  onFeature,
}: {
  data: Showcase;
  reduce: boolean;
  picked: string | null;
  edge: string;
  onShop: (slug: string) => void;
  onFeature: (chapter: Chapter) => void;
}) {
  const chip =
    'flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-card px-3 text-sm font-medium whitespace-nowrap shadow-xs ring-1 ring-border transition-colors duration-base hover-hover:hover:bg-muted';
  const shops = data.shops.map(({ slug, shop }) => (
    <button
      key={slug}
      type="button"
      tabIndex={-1}
      className={cn(chip, picked === slug && 'ring-2 ring-primary')}
      onClick={() => onShop(slug)}
    >
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
      <Marquee speed={26} pauseOnHover autoFill gap="0.5rem" className="py-1">
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
 * The sign-up tour (T108 L1, L11 to L14, final pass): a phone playing six short chapters on our sample shops
 * with the real screens (the storefront and its floating dock, the order chat, the stamp card and its
 * confetti, the notification cards, the owner's pushes and dashboard). Typing a shop name turns it into the
 * person's own app; a shop in the strip opens its own app. It always reads the sample shops, whatever the
 * app's data source.
 */
export default function ShowcaseTour({ yours, wide }: { yours: Yours | null; wide: boolean }) {
  return (
    <SampleDataProvider>
      <Tour yours={yours} wide={wide} />
    </SampleDataProvider>
  );
}
