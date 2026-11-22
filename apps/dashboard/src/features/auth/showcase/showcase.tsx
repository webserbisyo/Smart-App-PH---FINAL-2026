import * as React from 'react';
import {
  BellRingIcon,
  ExternalLinkIcon,
  MessageCircleIcon,
  PauseIcon,
  PlayIcon,
  ShoppingBagIcon,
  SmartphoneIcon,
  StampIcon,
  type LucideIcon,
} from 'lucide-react';
import { imageSources, SAMPLES_PATH, showcaseWords, type Showcase } from '@smartapp/core';
import { SampleDataProvider, useShowcase } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@smartapp/ui/components/carousel';
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
  StampsScene,
  YoursScene,
  type SceneProps,
  type Yours,
} from './scenes.js';

const W = showcaseWords;

// Every sample shop plays these five chapters on its own data, then the next shop starts.
const CHAPTERS = ['order', 'chat', 'stamps', 'push', 'owner'] as const;
type Chapter = (typeof CHAPTERS)[number];

const ICON: Record<Chapter, LucideIcon> = {
  order: ShoppingBagIcon,
  chat: MessageCircleIcon,
  stamps: StampIcon,
  push: BellRingIcon,
  owner: SmartphoneIcon,
};
const SCENE: Record<Chapter, (props: SceneProps) => React.ReactNode> = {
  order: OrderScene,
  chat: ChatScene,
  stamps: StampsScene,
  push: PushScene,
  owner: OwnerScene,
};

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

interface Spot {
  shop: number;
  chapter: Chapter;
  beat: number;
}

function Tour({ yours, wide }: { yours: Yours | null; wide: boolean }) {
  const query = useShowcase();
  const reduce = useReducedMotion();
  const now = useManilaNow();
  const size = usePhoneSize(wide);
  const root = React.useRef<HTMLElement>(null);
  const visible = useVisible(root);
  const [spot, setSpot] = React.useState<Spot>({ shop: 0, chapter: 'order', beat: 0 });
  const [stopped, setStopped] = React.useState(false);
  // The form values the person chose to leave: the tour plays again until they type something new.
  const [leftYours, setLeftYours] = React.useState('');
  const data = query.data;
  const shopCount = data?.shops.length ?? 1;

  const autoplay = !reduce && !savesData();
  // What the person types turns the phone into their own app (L1).
  const yoursKey = yours ? `${yours.name.trim()}|${yours.kind}|${yours.colour ?? ''}` : '';
  const touched = yours !== null && (yours.name.trim() !== '' || yours.colour !== null);
  const showingYours = touched && leftYours !== yoursKey;
  const playing = autoplay && !stopped && !showingYours && visible;

  // One step on: the next beat, the next chapter, then the next shop's story.
  const advance = React.useEffectEvent(() => {
    setSpot(({ shop, chapter, beat }) => {
      if (beat + 1 < steps(chapter)) return { shop, chapter, beat: beat + 1 };
      const next = CHAPTERS[CHAPTERS.indexOf(chapter) + 1];
      return next
        ? { shop, chapter: next, beat: 0 }
        : { shop: (shop + 1) % shopCount, chapter: 'order', beat: 0 };
    });
  });

  React.useEffect(() => {
    if (!playing || !data) return;
    const id = window.setTimeout(advance, PACE[spot.chapter][spot.beat] ?? 1200);
    return () => window.clearTimeout(id);
  }, [playing, data, spot]);

  // Without autoplay a chapter shows its last moment at once.
  const go = (shop: number, chapter: Chapter) => {
    setLeftYours(yoursKey);
    setSpot({ shop, chapter, beat: autoplay ? 0 : steps(chapter) - 1 });
    if (autoplay) setStopped(false);
  };
  const playShop = (shop: number) => {
    if (shop !== spot.shop || showingYours) go(shop, 'order');
  };

  const entry = data?.shops[spot.shop] ?? data?.shops[0];
  const shownBeat = autoplay ? spot.beat : steps(spot.chapter) - 1;
  const Scene = SCENE[spot.chapter];
  const caption = showingYours ? W.chapters.yours : W.chapters[spot.chapter];
  const sceneKey = showingYours ? 'yours' : `${entry?.slug ?? ''}-${spot.chapter}`;
  // Elapsed share of the chapter at the end of this step, for the progress line.
  const pace = PACE[spot.chapter];
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
            {data && entry ? (
              <SceneFade key={sceneKey}>
                {showingYours && yours ? (
                  <YoursScene data={data} now={now} yours={yours} />
                ) : (
                  <Scene entry={entry} beat={shownBeat} now={now} live={playing} reduce={reduce} />
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
        {showingYours ? (
          <>
            <Button
              variant="ghost"
              className="h-11 rounded-full px-3"
              onClick={() => go(spot.shop, spot.chapter)}
            >
              <PlayIcon aria-hidden="true" />
              {W.backToTour}
            </Button>
            <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-border" />
          </>
        ) : autoplay ? (
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
          const current = !showingYours && c === spot.chapter;
          return (
            <button
              key={c}
              type="button"
              aria-label={W.chapters[c].title}
              aria-current={current ? 'step' : undefined}
              onClick={() => go(spot.shop, c)}
              className={cn(
                'relative flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-base outline-none focus-visible:ring-2 focus-visible:ring-ring',
                current
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover-hover:hover:bg-muted hover-hover:hover:text-foreground',
                showingYours && 'max-sm:hidden',
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
        <ShopStrip
          data={data}
          current={showingYours ? null : spot.shop}
          reduce={reduce}
          onPick={playShop}
        />
      ) : null}
      <Button
        variant="link"
        className="h-11 text-muted-foreground"
        nativeButton={false}
        render={
          <a
            href={`${env.VITE_STOREFRONT_URL}${SAMPLES_PATH}`}
            target="_blank"
            rel="noopener noreferrer"
          />
        }
      >
        {W.allSamples}
        <ExternalLinkIcon aria-hidden="true" />
      </Button>
    </section>
  );
}

/**
 * The sample shops under the phone (L12, finalize): a row you drag with the mouse or a finger, or step with
 * the arrows. The shop in the middle is the one playing; letting go on another shop, or tapping it, plays
 * that shop's own story from its first chapter. When the tour moves to the next shop, the row follows.
 */
function ShopStrip({
  data,
  current,
  reduce,
  onPick,
}: {
  data: Showcase;
  current: number | null;
  reduce: boolean;
  onPick: (index: number) => void;
}) {
  const [api, setApi] = React.useState<CarouselApi>();
  const selected = React.useEffectEvent((carousel: NonNullable<CarouselApi>) => {
    const index = carousel.selectedScrollSnap();
    if (index !== current) onPick(index);
  });

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => selected(api);
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  React.useEffect(() => {
    if (!api || current === null || api.selectedScrollSnap() === current) return;
    api.scrollTo(current, reduce);
  }, [api, current, reduce]);

  return (
    <Carousel
      setApi={setApi}
      opts={{ align: 'center', loop: true, duration: reduce ? 0 : 24 }}
      aria-label={W.shopsLabel}
      className="w-full min-w-0 px-12"
    >
      <CarouselContent className="-ml-2 py-1">
        {data.shops.map(({ slug, shop }, index) => {
          const info = shop.storefront.info;
          const on = index === current;
          return (
            <CarouselItem key={slug} className="basis-auto pl-2">
              <button
                type="button"
                aria-label={W.playShop(info.name)}
                aria-pressed={on}
                onClick={() => {
                  onPick(index);
                  api?.scrollTo(index, reduce);
                }}
                className={cn(
                  'flex h-14 max-w-56 cursor-grab items-center gap-2.5 rounded-2xl bg-card py-2 pr-4 pl-2 text-left shadow-xs ring-1 ring-border transition duration-base outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing hover-hover:hover:bg-muted',
                  on && 'ring-2 ring-primary',
                )}
              >
                <ShopLogo
                  name={info.name}
                  src={imageSources(info.logo, env.VITE_STOREFRONT_URL)}
                  size="sm"
                  shape="round"
                  className="size-10"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {info.name}
                  </span>
                  {info.tagline ? (
                    <span className="truncate text-xs text-muted-foreground">{info.tagline}</span>
                  ) : null}
                </span>
              </button>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="left-0 size-11" />
      <CarouselNext className="right-0 size-11" />
    </Carousel>
  );
}

/**
 * The sign-up and log in tour (T108 L1, L11 to L14, final pass, finalize): a phone playing each sample shop's
 * own story in five short chapters with the real screens (the storefront, its item sheet and floating dock,
 * the order chat, the stamp card and its confetti, the notification cards, the owner's pushes and
 * dashboard), then the next shop. Typing a shop name turns it into the person's own app; a shop picked in the
 * row plays its own story. It always reads the sample shops, whatever the app's data source.
 */
export default function ShowcaseTour({ yours, wide }: { yours: Yours | null; wide: boolean }) {
  return (
    <SampleDataProvider>
      <Tour yours={yours} wide={wide} />
    </SampleDataProvider>
  );
}
