import * as React from 'react';
import { signupWords, words } from '@smartapp/core';
import { Android } from '@smartapp/ui/components/android';
import { BlurFade } from '@smartapp/ui/components/blur-fade';
import { BorderBeam } from '@smartapp/ui/components/border-beam';
import { Button } from '@smartapp/ui/components/button';
import { WordRotate } from '@smartapp/ui/components/word-rotate';
import { BrandLockup } from '@smartapp/ui/compositions/brand-lockup';
import {
  NOTIFY_STATES,
  PushUpdatesCard,
  ShopNewsCard,
  type NotifyState,
} from '@smartapp/ui/compositions/news-settings';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';
import { KitSection } from './kit-section.js';

function BlurFadeDemo() {
  const [run, setRun] = React.useState(0);
  return (
    <div className="flex flex-col items-start gap-3">
      <div key={run} className="flex flex-col gap-2">
        {['New order · Classic Smash · ₱149', 'Payment photo checked', 'Push sent'].map(
          (line, i) => (
            <BlurFade key={line} delay={i * 0.12} direction="up">
              <p className="rounded-xl bg-card px-3 py-2 text-sm ring-1 ring-border">{line}</p>
            </BlurFade>
          ),
        )}
      </div>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Play again
      </Button>
    </div>
  );
}

function NewsCardsDemo() {
  const [state, setState] = React.useState<NotifyState>('ask');
  const [news, setNews] = React.useState(true);
  return (
    <ShopTheme brandColor="#D7372F" surface="light">
      <div className="flex max-w-sm flex-col gap-3 rounded-2xl bg-background p-3">
        <div className="flex flex-wrap gap-1.5">
          {NOTIFY_STATES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === state ? 'default' : 'outline'}
              onClick={() => setState(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <PushUpdatesCard state={state} onTurnOn={() => setState('granted')} />
        <ShopNewsCard checked={news} onCheckedChange={setNews} />
      </div>
    </ShopTheme>
  );
}

/** The sign-up, log in and Forgot password parts (T108). */
export function AuthPrimitiveSections() {
  return (
    <>
      <KitSection
        title="Brand lockup"
        library="composition"
        path="packages/ui/src/compositions/brand-lockup.tsx"
        usedIn="Sign up, Log in, Forgot password (T108): the mark as a picture, the name as text that follows light and dark"
      >
        <div className="flex flex-wrap items-center gap-6">
          <BrandLockup name={words.appName} size="sm" />
          <BrandLockup name={words.appName} size="md" />
          <BrandLockup name={words.appName} size="lg" />
        </div>
      </KitSection>
      <KitSection
        title="Word Rotate"
        library="Magic UI"
        path="packages/ui/src/components/word-rotate.tsx"
        usedIn="Sign up headline (T108); hidden from screen readers (the page has its own spoken h1), one still word under reduced motion"
      >
        <div aria-hidden="true" className="text-2xl font-extrabold">
          <WordRotate words={[...signupWords.shopTypes]} className="text-primary" />
        </div>
      </KitSection>
      <KitSection
        title="Android"
        library="Magic UI"
        path="packages/ui/src/components/android.tsx"
        usedIn="Sign-up tour and Log in phone (T108 L13), drawn at 380 × 830 with a real 360 × 800 screen on top; ships raw greys"
      >
        <div className="h-104 w-48">
          <Android width={380} height={830} className="h-full w-auto" />
        </div>
      </KitSection>
      <KitSection
        title="Blur Fade"
        library="Magic UI"
        path="packages/ui/src/components/blur-fade.tsx"
        usedIn="Sign-up tour: phone notifications and the permission prompt (T108); not used under reduced motion"
      >
        <BlurFadeDemo />
      </KitSection>
      <KitSection
        title="Border Beam"
        library="Magic UI"
        path="packages/ui/src/components/border-beam.tsx"
        usedIn="Sign up form card (T108), logo blue to mint; left out under reduced motion"
      >
        <div className="relative h-32 max-w-sm rounded-xl bg-card ring-1 ring-border">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
            <BorderBeam
              size={100}
              duration={8}
              borderWidth={2}
              colorFrom="var(--logo-blue)"
              colorTo="var(--logo-mint)"
            />
          </div>
        </div>
      </KitSection>
      <KitSection
        title="Push updates and Shop news cards"
        library="composition"
        path="packages/ui/src/compositions/news-settings.tsx"
        usedIn="storefront Account › Notifications (T106) and the sign-up tour's Push chapter (T108): one component, the shop's colours"
      >
        <NewsCardsDemo />
      </KitSection>
    </>
  );
}
