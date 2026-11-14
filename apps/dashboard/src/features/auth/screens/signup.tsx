import * as React from 'react';
import { CheckIcon, ExternalLinkIcon, GiftIcon, SmartphoneIcon, WalletIcon } from 'lucide-react';
import { formatPeso, PLAN_TRIAL_DAYS, PRO_PRICE_MONTHLY, signupWords } from '@smartapp/core';
import { useTrackEvent } from '@smartapp/data';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { MessengerIcon } from '@smartapp/ui/compositions/messenger-icon';
import { env } from '@/app/env';
import { captureAttribution, newEventId, pixelTrack, readFbp, startPixel } from '@/app/meta-pixel';
import { usePageTitle } from '@/app/use-page-title';
import { SignupForm } from '../signup-form.js';

const W = signupWords;
const SAMPLE_SHOP = 'kanto-smash';

/**
 * The sign-up page (decision T89): no landing page. It sells in a few lines (price, free days, a sample
 * shop, Messenger), then the 3-step form. The Meta Pixel loads here only (T90).
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

  return (
    <main className="relative min-h-dvh bg-background pt-safe">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 brand-gradient" />
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 md:px-8 md:py-12 lg:grid-cols-2 lg:items-start lg:gap-12">
        <section className="flex flex-col gap-5 lg:sticky lg:top-12">
          <img
            src="/brand/smartappph-lockup-stacked.webp"
            alt="Smart App PH"
            width={160}
            height={164}
            className="h-auto w-24 md:w-28"
          />
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground md:text-4xl">
              {W.headline}
            </h1>
            <p className="text-base text-pretty text-muted-foreground">{W.sub}</p>
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
          <ul className="hidden flex-col gap-2.5 md:flex">
            {W.included.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-text">
                  <CheckIcon className="size-3.5" aria-hidden="true" />
                </span>
                {line}
              </li>
            ))}
          </ul>
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
        <SignupForm attribution={attribution} />
      </div>
    </main>
  );
}
