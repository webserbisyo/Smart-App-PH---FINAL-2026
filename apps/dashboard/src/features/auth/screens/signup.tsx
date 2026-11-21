import * as React from 'react';
import { ExternalLinkIcon, GiftIcon, SmartphoneIcon, WalletIcon } from 'lucide-react';
import { formatPeso, PLAN_TRIAL_DAYS, PRO_PRICE_MONTHLY, signupWords, words } from '@smartapp/core';
import { useTrackEvent } from '@smartapp/data';
import { Badge } from '@smartapp/ui/components/badge';
import { BorderBeam } from '@smartapp/ui/components/border-beam';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { WordRotate } from '@smartapp/ui/components/word-rotate';
import { BrandLockup } from '@smartapp/ui/compositions/brand-lockup';
import { MessengerIcon } from '@smartapp/ui/compositions/messenger-icon';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { cn } from '@smartapp/ui/lib/utils';
import { env } from '@/app/env';
import { captureAttribution, newEventId, pixelTrack, readFbp, startPixel } from '@/app/meta-pixel';
import { usePageTitle } from '@/app/use-page-title';
import { SignupForm, type ShopDraft } from '../signup-form.js';

// The tour is the heaviest part of the page, so it loads after the form (T108).
const ShowcaseTour = React.lazy(() => import('../showcase/showcase.js'));

const W = signupWords;
const SAMPLE_SHOP = 'kanto-smash';

function TourSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <Skeleton className="h-134.5 w-67 shrink-0 rounded-3xl lg:h-155.25 lg:w-76.5" />
      <div className="flex w-full flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** The form card is in view: the phone's sticky button steps aside. */
function useInView(ref: React.RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), {
      threshold: 0.15,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

/**
 * The sign-up page (decision T89, redesigned in T108): the logo and a rotating headline, the price chips, a
 * phone playing the tour on our sample shops (it turns into the person's own app as they type), then the
 * 3-step form. The Meta Pixel loads here only (T90).
 */
export function SignupScreen() {
  usePageTitle(W.pageTitle);
  const [attribution] = React.useState(() => captureAttribution(window.location.search));
  const track = useTrackEvent();
  const counted = React.useRef(false);

  const send = (name: 'PageView' | 'Contact') => {
    const eventId = newEventId(name);
    pixelTrack(name, eventId);
    track.mutate(
      {
        name,
        eventId,
        fbp: readFbp(),
        fbc: attribution.fbc,
        pageUrl: window.location.href.split('#')[0] ?? window.location.href,
        source: attribution.source,
      },
      { onError: () => undefined },
    );
  };

  // Once per visit: the pixel starts and the page view goes to both sides with one id.
  const onOpen = React.useEffectEvent(() => {
    if (counted.current) return;
    counted.current = true;
    startPixel();
    send('PageView');
  });
  React.useEffect(() => onOpen(), []);

  const reduce = useReducedMotion();
  const [draft, setDraft] = React.useState<ShopDraft | null>(null);
  const formBox = React.useRef<HTMLDivElement>(null);
  const formInView = useInView(formBox);
  const toForm = () => {
    formBox.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(
      () => document.getElementById('su-name')?.focus({ preventScroll: true }),
      350,
    );
  };

  return (
    <main className="relative min-h-dvh bg-background pt-safe">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 brand-gradient" />
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 md:px-8 md:py-10 lg:grid-cols-5 lg:items-start lg:gap-10">
        <section className="flex min-w-0 flex-col gap-5 lg:col-span-3">
          <BrandLockup name={words.appName} size="md" />
          <div className="flex flex-col gap-2">
            <h1 className="sr-only">{W.headlineSpoken}</h1>
            <div
              aria-hidden="true"
              className="text-3xl leading-tight font-extrabold tracking-tight text-balance text-foreground md:text-5xl"
            >
              <p>
                {W.headlineStart} {W.headlineFor}
              </p>
              {reduce ? (
                <p className="py-2 text-primary">{W.shopTypes[0]}</p>
              ) : (
                <WordRotate words={[...W.shopTypes]} duration={2600} className="text-primary" />
              )}
            </div>
            <p className="text-base text-pretty text-muted-foreground md:text-lg">{W.sub}</p>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label={W.why}>
            <li>
              <Badge variant="secondary" className="h-8 gap-1.5 px-3 text-sm [&_svg]:size-4">
                <WalletIcon aria-hidden="true" />
                {W.chips.price(formatPeso(PRO_PRICE_MONTHLY))}
              </Badge>
            </li>
            <li>
              <Badge className="h-8 gap-1.5 bg-success-soft px-3 text-sm text-success-text [&_svg]:size-4">
                <GiftIcon aria-hidden="true" />
                {W.chips.trial(PLAN_TRIAL_DAYS)}
              </Badge>
            </li>
            <li>
              <Badge variant="secondary" className="h-8 gap-1.5 px-3 text-sm [&_svg]:size-4">
                <SmartphoneIcon aria-hidden="true" />
                {W.chips.pay}
              </Badge>
            </li>
          </ul>
          <React.Suspense fallback={<TourSkeleton />}>
            <ShowcaseTour yours={draft} />
          </React.Suspense>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="h-11"
              nativeButton={false}
              render={
                <a
                  href={`${env.VITE_STOREFRONT_URL}/${SAMPLE_SHOP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ExternalLinkIcon aria-hidden="true" />
              {W.sample}
            </Button>
            <Button
              variant="ghost"
              className="h-11"
              nativeButton={false}
              render={
                <a
                  href={env.VITE_MESSENGER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => send('Contact')}
                />
              }
            >
              <MessengerIcon aria-hidden="true" />
              {W.messenger}
            </Button>
          </div>
        </section>
        <div ref={formBox} className="scroll-mt-4 lg:sticky lg:top-8 lg:col-span-2">
          <div className="relative rounded-xl">
            <SignupForm attribution={attribution} onDraft={setDraft} />
            {reduce ? null : (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
              >
                <BorderBeam
                  size={140}
                  duration={9}
                  borderWidth={2}
                  colorFrom="var(--logo-blue)"
                  colorTo="var(--logo-mint)"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Phones and tablets: one tap from the tour to the form (L1). */}
      <div
        className={cn(
          'sticky bottom-0 z-10 border-t bg-card/90 px-4 pt-2.5 pb-safe backdrop-blur-md transition-opacity duration-base lg:hidden',
          formInView && 'pointer-events-none opacity-0',
        )}
        aria-hidden={formInView ? true : undefined}
      >
        <Button
          className="mb-2.5 h-12 w-full text-base font-semibold"
          tabIndex={formInView ? -1 : undefined}
          onClick={toForm}
        >
          {W.startFree(PLAN_TRIAL_DAYS)}
        </Button>
      </div>
    </main>
  );
}
