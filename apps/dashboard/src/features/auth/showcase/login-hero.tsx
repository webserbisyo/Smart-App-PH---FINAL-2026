import * as React from 'react';
import { formatPeso, showcaseWords } from '@smartapp/core';
import { SampleDataProvider, useShowcase } from '@smartapp/data';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { CustomerFace } from '@/app/owner-avatar';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import { ShowcasePhone, useManilaNow } from './phone.js';
import { OwnerScene, shopOf } from './scenes.js';
import { StageCard, StagePanel, usePhoneSize } from './stage.js';

const W = showcaseWords;
// One order every 5 beats: it lands with a ring (beats 1 to 3), then the next one comes in.
const BEATS = 5;
const BEAT_MS = 1200;

function Hero() {
  const query = useShowcase();
  const reduce = useReducedMotion();
  const now = useManilaNow();
  const size = usePhoneSize(true);
  const [tick, setTick] = React.useState(1);
  React.useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setTick((t) => t + 1), BEAT_MS);
    return () => window.clearInterval(id);
  }, [reduce]);
  const data = query.data;
  const pick = Math.floor(tick / BEATS);
  const beat = tick % BEATS;
  const board = data?.board ?? [];
  // The newest order floats on one side, the one before on the other.
  const cards = board.length === 0 ? [] : [pick, pick - 1].filter((p) => p >= 0);
  const shopName = data ? shopOf(data, 'kanto-smash').storefront.info.name : '';
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <StagePanel
        wide
        phone={
          <ShowcasePhone label={`${W.phoneLabel}: ${W.chapters.owner.title}`} size={size}>
            {data ? (
              <OwnerScene
                data={data}
                beat={beat}
                now={now}
                live={false}
                reduce={reduce}
                pick={pick}
              />
            ) : (
              <div className="flex flex-col gap-3 p-4 pt-14">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-56 w-full rounded-xl" />
              </div>
            )}
          </ShowcasePhone>
        }
      >
        {cards.map((p) => {
          const order = board[p % board.length];
          if (!order) return null;
          return (
            <StageCard
              key={p}
              wide
              side={p % 2 === 0 ? 'start' : 'end'}
              media={<CustomerFace avatar={order.customerAvatar} name={order.customerName} />}
              title={`${W.orderNow(orderNoLabel(order.orderNo))} · ${formatPeso(order.total)}`}
              meta={[order.customerName, shopName, W.now].join(' · ')}
              reduce={reduce}
            />
          );
        })}
      </StagePanel>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-base font-semibold text-foreground">{W.chapters.owner.title}</p>
        <p className="text-sm text-muted-foreground">{W.chapters.owner.line}</p>
      </div>
    </div>
  );
}

/** The log in page's laptop side (T108): the owner's week on a phone, orders popping in, on sample data. */
export default function LoginHero() {
  return (
    <SampleDataProvider>
      <Hero />
    </SampleDataProvider>
  );
}
