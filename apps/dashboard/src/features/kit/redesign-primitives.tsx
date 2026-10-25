import { AvatarGroup } from '@smartapp/ui/components/avatar-group';
import { AnimatedShinyText } from '@smartapp/ui/components/animated-shiny-text';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { Marquee, MarqueeContent, MarqueeEdge, MarqueeItem } from '@smartapp/ui/components/marquee';
import { ShineBorder } from '@smartapp/ui/components/shine-border';
import { SparklesIcon, TruckIcon } from 'lucide-react';
import { useKitShop } from './kit-shop.js';
import { KitSection } from './kit-section.js';

const P = (name: string) => `packages/ui/src/components/${name}.tsx`;

const NEWS = [
  'Free delivery over ₱500 today',
  'New: Kanto Overload is back',
  'Get 1 free stamp when you join',
] as const;

/** The parts installed for the storefront redesign (decision R9), each in the picked shop's colours. */
export function RedesignPrimitiveSections() {
  const shop = useKitShop();
  return (
    <>
      <KitSection
        title="Avatar group (DiceUI)"
        library="DiceUI"
        path={P('avatar-group')}
        usedIn="kit; members row on Home (redesign)"
      >
        <div className="flex flex-wrap items-center gap-6 rounded-lg bg-shop-60 p-4">
          <AvatarGroup size={36} max={4}>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <Avatar key={n} className="ring-2 ring-background">
                <AvatarImage src={shop.face(n)} alt="" />
                <AvatarFallback>{n + 1}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
          <span className="text-sm text-muted-foreground">max 4, the rest as +n</span>
        </div>
      </KitSection>

      <KitSection
        title="Marquee"
        library="DiceUI"
        path={P('marquee')}
        usedIn="kit; one-line announcement strip (redesign)"
      >
        <div className="rounded-lg bg-shop-60 p-4">
          <Marquee
            speed={30}
            pauseOnHover
            className="rounded-full bg-shop-10-soft text-shop-10-soft-foreground"
          >
            <MarqueeContent>
              {NEWS.map((line) => (
                <MarqueeItem
                  key={line}
                  className="flex items-center gap-2 py-2 text-sm font-medium"
                >
                  <TruckIcon className="size-4" aria-hidden="true" />
                  {line}
                </MarqueeItem>
              ))}
            </MarqueeContent>
            <MarqueeEdge side="left" />
            <MarqueeEdge side="right" />
          </Marquee>
        </div>
      </KitSection>

      <KitSection
        title="Shine border"
        library="Magic UI (CSS only)"
        path={P('shine-border')}
        usedIn="kit; Join card and reward ready (redesign)"
      >
        <div className="rounded-lg bg-shop-60 p-4">
          <div className="relative max-w-sm overflow-hidden rounded-xl bg-card p-5">
            <ShineBorder borderWidth={2} shineColor={['var(--shop-10)', 'var(--highlight)']} />
            <p className="font-semibold">Join and get 1 free stamp</p>
            <p className="text-sm text-muted-foreground">10 stamps = 1 free Classic Smash</p>
          </div>
        </div>
      </KitSection>

      <KitSection
        title="Animated shiny text"
        library="Magic UI (CSS only)"
        path={P('animated-shiny-text')}
        usedIn="kit; reward ready line (redesign)"
      >
        <div className="flex rounded-lg bg-shop-60 p-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm">
            <SparklesIcon className="size-4 text-shop-10-text" aria-hidden="true" />
            <AnimatedShinyText className="mx-0 via-foreground/80 text-muted-foreground">
              Your free Classic Smash is ready
            </AnimatedShinyText>
          </span>
        </div>
      </KitSection>
    </>
  );
}
