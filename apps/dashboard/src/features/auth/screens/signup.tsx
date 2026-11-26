import * as React from 'react';
import { ExternalLinkIcon, GiftIcon, SmartphoneIcon, WalletIcon } from 'lucide-react';
import {
  formatPeso,
  PLAN_TRIAL_DAYS,
  PRO_PRICE_MONTHLY,
  SAMPLES_PATH,
  signupWords,
  words,
} from '@smartapp/core';
import { useTrackEvent, type UserClaims } from '@smartapp/data';
import { Badge } from '@smartapp/ui/components/badge';
import { BorderBeam } from '@smartapp/ui/components/border-beam';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { WordRotate } from '@smartapp/ui/components/word-rotate';
import { BrandLockup } from '@smartapp/ui/compositions/brand-lockup';
import { MessengerIcon } from '@smartapp/ui/compositions/messenger-icon';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { cn } from '@smartapp/ui/lib/utils';
import { Link } from '@tanstack/react-router';
import { env } from '@/app/env';
import { captureAttribution, newEventId, pixelTrack, readFbp, startPixel } from '@/app/meta-pixel';
import { usePageTitle } from '@/app/use-page-title';
import { AuthAside, StageSkeleton, useWide } from '../auth-frame.js';
import { SignupForm, type ShopDraft } from '../signup-form.js';

// The tour is the heaviest part of the page, so it loads after the form (T108).
const ShowcaseTour = React.lazy(() => import('../showcase/showcase.js'));

const W = signupWords;

function TourSkeleton() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <Skeleton className="h-148 w-full rounded-3xl" />
      <Skeleton className="h-13 w-80 max-w-full rounded-full" />
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
 * The sign-up page (decision T89, redesigned in T108): the logo, a rotating headline, the price chips and the
 * 3-step form on the left; the stage with the tour on our sample shops pinned on the right (it turns into the
 * person's own app as they type). Phones get the stage between the chips and the form, and a sticky Start
 * button. The Meta Pixel loads here only (T90).
 */
export function SignupScreen({ finishing = null }: { finishing?: UserClaims | null }) {
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
    startPixel(finishing?.isAdmin ?? false);
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

  const wide = useWide();
  const tour = (
    <React.Suspense fallback={wide ? <StageSkeleton /> : <TourSkeleton />}>
      <ShowcaseTour yours={draft} wide={wide} />
    </React.Suspense>
  );

  return (
    <main className="relative grid min-h-dvh bg-background pt-safe lg:grid-cols-2">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 brand-gradient lg:hidden" />
      <div className="flex min-w-0 justify-center px-4 py-6 md:px-8 md:py-10 lg:px-12 lg:py-6">
        <div className="flex w-full max-w-md flex-col gap-5 lg:max-w-lg lg:gap-4">
          <div className="flex items-center justify-between gap-3">
            <BrandLockup name={words.appName} size="sm" />
            <p className="text-sm text-muted-foreground">
              {W.haveAccount}{' '}
              <Link
                to="/login"
                className="font-medium text-foreground underline underline-offset-4"
              >
                {W.logIn}
              </Link>
            </p>
          </div>
          <div>
            <h1 className="sr-only">{W.headlineSpoken}</h1>
            <div
              aria-hidden="true"
              className="text-3xl leading-tight font-extrabold tracking-tight text-foreground lg:text-4xl"
            >
              <p>{W.headlineStart}</p>
              <div className="flex flex-wrap items-center gap-x-2.5">
                <span className="py-2">{W.headlineFor}</span>
                {reduce ? (
                  <span className="py-2 text-primary">{W.shopTypes[0]}</span>
                ) : (
                  <WordRotate words={[...W.shopTypes]} duration={2600} className="text-primary" />
                )}
              </div>
            </div>
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
          {wide ? null : tour}
          <div ref={formBox} className="scroll-mt-4">
            <div className="relative rounded-xl">
              <SignupForm attribution={attribution} onDraft={setDraft} finishing={finishing} />
              {/* The moving border runs on every frame, so phones skip it (T110): the tour above is the
                  motion there. */}
              {reduce || !wide ? null : (
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
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              className="h-11"
              nativeButton={false}
              render={
                <a
                  href={`${env.VITE_STOREFRONT_URL}${SAMPLES_PATH}`}
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
        </div>
      </div>
      {wide ? <AuthAside>{tour}</AuthAside> : null}
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
