import * as React from 'react';
import { showcaseWords } from '@smartapp/core';
import { SampleDataProvider, useShowcase } from '@smartapp/data';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { ShowcasePhone, useManilaNow } from './phone.js';
import { OwnerScene, PACE } from './scenes.js';
import { StagePanel, usePhoneSize } from './stage.js';

const W = showcaseWords;
const STEPS = PACE.owner.length;

function Hero() {
  const query = useShowcase();
  const reduce = useReducedMotion();
  const now = useManilaNow();
  const size = usePhoneSize(true);
  // Each round: the pushes stack on the lock screen, then the dashboard opens on the new order; the next
  // round brings the next order.
  const [round, setRound] = React.useState({ pick: 0, beat: reduce ? STEPS - 2 : 0 });
  const next = React.useEffectEvent(() =>
    setRound((r) =>
      r.beat + 1 < STEPS ? { ...r, beat: r.beat + 1 } : { pick: r.pick + 1, beat: 0 },
    ),
  );
  React.useEffect(() => {
    if (reduce) return;
    const id = window.setTimeout(next, PACE.owner[round.beat] ?? 1200);
    return () => window.clearTimeout(id);
  }, [reduce, round]);
  const beat = reduce ? STEPS - 2 : round.beat;
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <StagePanel
        wide
        phone={
          <ShowcasePhone label={`${W.phoneLabel}: ${W.chapters.owner.title}`} size={size}>
            {query.data ? (
              <div
                key={beat < 4 ? 'lock' : 'home'}
                className="animate-in fade-in-0 zoom-in-98 flex h-full min-h-0 flex-col duration-300 motion-reduce:animate-none"
              >
                <OwnerScene
                  data={query.data}
                  beat={beat}
                  now={now}
                  live={false}
                  reduce={reduce}
                  pick={round.pick}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-4 pt-14">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-56 w-full rounded-xl" />
              </div>
            )}
          </ShowcasePhone>
        }
      />
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-base font-semibold text-foreground">{W.chapters.owner.title}</p>
        <p className="text-sm text-muted-foreground">{W.chapters.owner.line}</p>
      </div>
    </div>
  );
}

/** The log in page's laptop side (T108): the owner's phone, pushes then the dashboard, on sample data. */
export default function LoginHero() {
  return (
    <SampleDataProvider>
      <Hero />
    </SampleDataProvider>
  );
}
