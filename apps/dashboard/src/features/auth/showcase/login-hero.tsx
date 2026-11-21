import * as React from 'react';
import { showcaseWords } from '@smartapp/core';
import { SampleDataProvider, useShowcase } from '@smartapp/data';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { ShowcasePhone, useManilaNow } from './phone.js';
import { OwnerScene } from './scenes.js';

const BEATS = 5;

function Hero() {
  const query = useShowcase();
  const reduce = useReducedMotion();
  const now = useManilaNow();
  const [beat, setBeat] = React.useState(1);
  React.useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setBeat((b) => (b + 1) % BEATS), 1200);
    return () => window.clearInterval(id);
  }, [reduce]);
  return (
    <ShowcasePhone label={`${showcaseWords.phoneLabel}: ${showcaseWords.chapters.owner.title}`}>
      {query.data ? (
        <OwnerScene data={query.data} beat={beat} now={now} live={false} reduce={reduce} />
      ) : (
        <div className="flex flex-col gap-3 p-4 pt-14">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      )}
    </ShowcasePhone>
  );
}

/** The log in page's laptop side (T108 L8): the owner's day on a phone, orders coming in, on sample data. */
export default function LoginHero() {
  return (
    <SampleDataProvider>
      <Hero />
    </SampleDataProvider>
  );
}
