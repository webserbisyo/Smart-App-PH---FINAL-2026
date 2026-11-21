import * as React from 'react';
import { BellIcon, CheckIcon } from 'lucide-react';
import {
  DEFAULT_BRAND_COLOR,
  formatPeso,
  homeWords,
  imageSources,
  showcaseWords,
  type Item,
  type PublicShop,
  type ShopKind,
  type Showcase,
} from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/badge';
import { BlurFade } from '@smartapp/ui/components/blur-fade';
import { Button } from '@smartapp/ui/components/button';
import {
  Item as ItemRow,
  ItemContent,
  ItemDescription,
  ItemMedia,
} from '@smartapp/ui/components/item';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { CartButton } from '@smartapp/ui/compositions/cart-button';
import { rewardReady, stampBurst } from '@smartapp/ui/compositions/celebrate';
import { PushUpdatesCard, ShopNewsCard } from '@smartapp/ui/compositions/news-settings';
import { ProductCard, type ProductBadge } from '@smartapp/ui/compositions/product-card';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';
import { StampCard } from '@smartapp/ui/compositions/stamp-card';
import { cn } from '@smartapp/ui/lib/utils';
import { SalesCard } from '@/app/home/sales-card';
import { OrderCard } from '@/app/orders/order-card';
import { ChatHeader, ChatThread } from '@/app/orders/order-chat';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import { env } from '@/app/env';
import { phoneClock, phoneDay, StatusBar } from './phone.js';

const W = showcaseWords;
// The sample photos live in the storefront's public folder (like /kit).
const ORIGIN = env.VITE_STOREFRONT_URL;
const HOST = new URL(env.VITE_STOREFRONT_URL).host;
const pic = (ref: string | null | undefined) => imageSources(ref, ORIGIN);
const noop = () => undefined;
const noopAsync = () => Promise.resolve();

export interface SceneProps {
  data: Showcase;
  beat: number;
  now: Date;
  // The tour is playing on screen: the confetti may fire.
  live: boolean;
  reduce: boolean;
}

/** Shows a line with a soft blur-in, or at once under reduced motion. */
function Appear({
  reduce,
  children,
  className,
}: {
  reduce: boolean;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <BlurFade direction="up" duration={0.3} offset={8} {...(className ? { className } : {})}>
      {children}
    </BlurFade>
  );
}

export function shopOf(data: Showcase, slug: string): PublicShop {
  const found = data.shops.find((s) => s.slug === slug) ?? data.shops[0];
  if (!found) throw new Error('The sign-up tour needs a sample shop');
  return found.shop;
}

/** A sample shop's app screen: its colours, the status bar and its name at the top. */
function ShopScreen({
  shop,
  now,
  name,
  logo = true,
  brandColor,
  children,
}: {
  shop: PublicShop;
  now: Date;
  name?: string | undefined;
  logo?: boolean | undefined;
  brandColor?: string | undefined;
  children: React.ReactNode;
}) {
  const look = shop.storefront.look;
  const title = name ?? shop.storefront.info.name;
  const own = brandColor !== undefined;
  return (
    <ShopTheme
      brandColor={brandColor ?? look.brandColor}
      surface={own ? 'light' : look.surface}
      pageColor={own ? null : look.pageColor}
      cardColor={own ? null : look.cardColor}
      fontPair={own ? 'malinaw' : look.fontPair}
    >
      <div className="flex h-full flex-col bg-background text-foreground">
        <StatusBar now={now} />
        <div className="flex items-center gap-3 px-4 pb-3">
          <ShopLogo
            name={title}
            src={logo ? pic(shop.storefront.info.logo) : null}
            size="md"
            shape="round"
          />
          <p className="min-w-0 truncate font-heading text-lg font-bold">{title}</p>
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">{children}</div>
      </div>
    </ShopTheme>
  );
}

function firstPrice(item: Item): number {
  return item.variants[0]?.price ?? item.basePrice;
}

function MenuGrid({
  items,
  pressed,
  badges,
}: {
  items: readonly Item[];
  pressed: number | null;
  badges?: readonly ProductBadge[] | undefined;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, i) => (
        <ProductCard
          key={item.id}
          name={item.name}
          priceLabel={formatPeso(firstPrice(item))}
          photo={pic(item.photos[0])}
          sizes="170px"
          openLabel={W.openLabel(item.name, formatPeso(firstPrice(item)))}
          onOpen={noop}
          add={{ label: W.addLabel(item.name), onClick: noop }}
          badges={badges}
          assetOrigin={ORIGIN}
          className={cn(
            'transition-shadow duration-base',
            pressed === i && 'ring-2 ring-shop-10-text',
          )}
        />
      ))}
    </div>
  );
}

function BasketBar({ count, total }: { count: number; total: number }) {
  if (count === 0) return null;
  return (
    <div className="absolute inset-x-4 bottom-4 flex items-center gap-3">
      <span className="flex h-12 flex-1 items-center justify-center rounded-full bg-shop-10 px-4 text-sm font-semibold text-shop-10-foreground tabular shadow-lg">
        {W.basket(count, formatPeso(total))}
      </span>
      <CartButton
        variant="dock"
        count={count}
        label={W.basket(count, formatPeso(total))}
        onClick={noop}
      />
    </div>
  );
}

// ------------------------------------------------------------------ 1 Order (Kanto Smash)

export function OrderScene({ data, beat, now }: SceneProps) {
  const shop = shopOf(data, 'kanto-smash');
  const items = shop.catalog.items.slice(0, 4);
  const added = beat >= 3 ? 2 : beat >= 1 ? 1 : 0;
  const total = items.slice(0, added).reduce((sum, item) => sum + firstPrice(item), 0);
  const banner = shop.storefront.look.banners[0];
  return (
    <ShopScreen shop={shop} now={now}>
      {banner ? (
        <ShopImage
          src={pic(banner.ref)}
          alt=""
          ratio="21:9"
          sizes="330px"
          className="overflow-hidden rounded-xl"
        />
      ) : null}
      <MenuGrid items={items} pressed={beat === 1 ? 0 : beat === 3 ? 1 : null} />
      <BasketBar count={added} total={total} />
    </ShopScreen>
  );
}

// ------------------------------------------------------------------ 2 Chat and payment (owner side)

export function ChatScene({ data, now }: SceneProps) {
  const chat = data.chat;
  return (
    <div className="flex h-full flex-col bg-card text-foreground">
      <StatusBar now={now} />
      {chat ? (
        <>
          <ChatHeader order={chat.order} detail={chat.detail} close={null} />
          <div className="min-h-0 flex-1 overflow-hidden">
            <ChatThread
              order={chat.order}
              detail={chat.detail}
              slug={data.shops[0]?.slug ?? 'kanto-smash'}
              kind="food"
              active={false}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ 3 Stamp and reward (Kanto Smash)

function useCelebrate(
  beat: number,
  live: boolean,
  target: React.RefObject<HTMLElement | null>,
  last: number,
) {
  React.useEffect(() => {
    if (!live || beat === 0) return;
    if (beat === last) {
      void rewardReady();
      return;
    }
    if (beat > last) return;
    const box = target.current?.getBoundingClientRect();
    if (!box) return;
    void stampBurst({
      x: (box.left + box.width / 2) / window.innerWidth,
      y: (box.top + box.height * 0.7) / window.innerHeight,
    });
  }, [beat, live, target, last]);
}

export function StampsScene({ data, beat, now, live }: SceneProps) {
  const shop = shopOf(data, 'kanto-smash');
  const card = shop.storefront.stampCard;
  const needed = card.rule.stampsNeeded;
  const start = needed - 3;
  const stamped = Math.min(needed, start + beat);
  const ready = stamped >= needed;
  const box = React.useRef<HTMLDivElement>(null);
  useCelebrate(beat, live, box, 3);
  return (
    <ShopScreen shop={shop} now={now}>
      <div ref={box}>
        <StampCard
          needed={needed}
          stamped={stamped}
          title={W.stampTitle}
          body={W.stampRule(formatPeso(card.rule.minOrderTotal))}
          progressLabel={W.stampProgress(stamped, needed)}
          prize={{ title: card.reward.title, photo: pic(card.reward.image), label: W.prizeLabel }}
          ready={ready}
          readyLine={W.rewardReady}
          pressIndex={beat > 0 && !ready ? stamped - 1 : undefined}
          assetOrigin={ORIGIN}
          action={
            ready ? (
              <Button className="h-11 rounded-full bg-shop-10 text-shop-10-foreground">
                {W.useReward}
              </Button>
            ) : undefined
          }
        />
      </div>
      <p className="text-center text-sm font-semibold text-muted-foreground">{card.reward.title}</p>
    </ShopScreen>
  );
}

// ------------------------------------------------------------------ 4 Push updates (allow, then the lock screen)

interface Push {
  id: string;
  title: string;
  body: string;
}

function LockScreen({
  shop,
  now,
  pushes,
  reduce,
}: {
  shop: PublicShop;
  now: Date;
  pushes: readonly Push[];
  reduce: boolean;
}) {
  const name = shop.storefront.info.name;
  return (
    <div className="flex h-full flex-col bg-shop-10 text-shop-10-foreground">
      <StatusBar now={now} />
      <div className="flex flex-col items-center gap-1 pt-10">
        <p className="text-base font-semibold">{phoneDay(now)}</p>
        <p className="text-8xl leading-none font-bold tracking-tight tabular">{phoneClock(now)}</p>
      </div>
      <div className="mt-auto flex flex-col gap-2 px-3 pb-10">
        {pushes.map((push) => (
          <Appear key={push.id} reduce={reduce}>
            <ItemRow className="items-start rounded-2xl bg-popover/90 text-popover-foreground shadow-lg backdrop-blur-md">
              <ItemMedia>
                <ShopLogo name={name} src={pic(shop.storefront.info.logo)} size="sm" />
              </ItemMedia>
              <ItemContent className="min-w-0 gap-0.5">
                <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{name}</span>
                  <span>{W.now}</span>
                </span>
                <span className="text-sm leading-snug font-semibold">{push.title}</span>
                {push.body ? (
                  <ItemDescription className="line-clamp-2 text-sm">{push.body}</ItemDescription>
                ) : null}
              </ItemContent>
            </ItemRow>
          </Appear>
        ))}
      </div>
      <span
        aria-hidden="true"
        className="mx-auto mb-3 h-1 w-28 rounded-full bg-shop-10-foreground/60"
      />
    </div>
  );
}

export function PushScene({ data, beat, now, reduce }: SceneProps) {
  const shop = shopOf(data, 'kanto-smash');
  const card = shop.storefront.stampCard;
  const needed = card.rule.stampsNeeded;
  const no = orderNoLabel(data.chat?.order.orderNo ?? data.board[0]?.orderNo ?? 45);
  if (beat >= 3) {
    const all: Push[] = [
      { id: 'done', title: W.pushDone(no, needed - 1, needed), body: '' },
      ...data.news.slice(0, 1).map((n) => ({ id: n.id, title: n.title, body: n.body })),
      { id: 'reward', title: W.pushReward(card.reward.title), body: '' },
    ];
    const shown = all.slice(0, Math.max(0, beat - 3)).reverse();
    return (
      <ShopTheme brandColor={shop.storefront.look.brandColor} surface="light">
        <LockScreen shop={shop} now={now} pushes={shown} reduce={reduce} />
      </ShopTheme>
    );
  }
  return (
    <ShopScreen shop={shop} now={now}>
      <p className="text-xl font-bold">{W.notificationsTitle}</p>
      <PushUpdatesCard state={beat >= 2 ? 'granted' : 'ask'} onTurnOn={noop} />
      <ShopNewsCard checked onCheckedChange={noop} />
      {beat === 1 ? (
        <Appear reduce={reduce} className="absolute inset-x-4 top-0">
          <div className="flex flex-col gap-3 rounded-2xl bg-popover p-4 text-popover-foreground shadow-xl ring-1 ring-foreground/10">
            <p className="flex items-start gap-2 text-sm font-medium">
              <BellIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {W.allowAsk(HOST)}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="h-10">
                {W.block}
              </Button>
              <Button className="h-10 ring-2 ring-ring ring-offset-2 ring-offset-popover">
                {W.allow}
              </Button>
            </div>
          </div>
        </Appear>
      ) : null}
    </ShopScreen>
  );
}

// ------------------------------------------------------------------ 5 Retail (Tala Apparel)

export function RetailScene({ data, beat, now, reduce }: SceneProps) {
  const shop = shopOf(data, 'tala-apparel');
  const item = shop.catalog.items[0];
  const card = shop.storefront.stampCard;
  if (!item) return null;
  const sizes = item.axes[0]?.values.map((v) => v.name) ?? [];
  const picked = beat >= 2 ? sizes[1] : beat >= 1 ? sizes[0] : undefined;
  const price = formatPeso(firstPrice(item));
  const left = card.reward.quantityLeft;
  return (
    <ShopScreen shop={shop} now={now}>
      <ShopImage
        src={pic(item.photos[0])}
        alt=""
        ratio="16:9"
        sizes="330px"
        className="overflow-hidden rounded-xl"
      />
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-base font-semibold">{item.name}</p>
        <p className="text-base font-bold tabular">{price}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-muted-foreground">{W.sizeLabel}</p>
        <ToggleGroup value={picked ? [picked] : []} className="grid w-full grid-cols-4">
          {sizes.map((s) => (
            <ToggleGroupItem key={s} value={s} className="h-10">
              {s}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <Button className="h-11 rounded-full bg-shop-10 font-semibold text-shop-10-foreground">
        {beat >= 3 && picked ? (
          <>
            <CheckIcon aria-hidden="true" />
            {W.added(picked, price)}
          </>
        ) : (
          W.addToBasket
        )}
      </Button>
      {beat >= 4 ? (
        <Appear reduce={reduce}>
          <StampCard
            needed={card.rule.stampsNeeded}
            stamped={card.rule.stampsNeeded - 2}
            title={card.reward.title}
            body={left === null ? null : W.prizeLeft(left)}
            progressLabel={W.stampProgress(card.rule.stampsNeeded - 2, card.rule.stampsNeeded)}
            prize={{
              title: card.reward.title,
              photo: pic(card.reward.image),
              label: W.prizeLabel,
            }}
            assetOrigin={ORIGIN}
          />
        </Appear>
      ) : null}
    </ShopScreen>
  );
}

// ------------------------------------------------------------------ 6 Your dashboard (owner side)

export function OwnerScene({ data, beat, now }: SceneProps) {
  const first = data.board[0];
  const shop = shopOf(data, 'kanto-smash');
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <StatusBar now={now} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-4">
        <p className="px-1 text-lg font-bold">{W.todayTitle(shop.storefront.info.name)}</p>
        {first ? (
          <OrderCard
            order={first}
            now={now}
            kind={shop.storefront.info.kind}
            onOpen={noop}
            onAdvance={noopAsync}
            onPayAndComplete={noopAsync}
            fresh={beat >= 1 && beat <= 3}
          />
        ) : null}
        <SalesCard data={data.today} periodText={homeWords.period.picks.today} live asOf={now} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Your app (from the form)

export interface Yours {
  name: string;
  kind: ShopKind;
  colour: string | null;
}

export function YoursScene({ data, now, yours }: SceneProps & { yours: Yours }) {
  const pack = shopOf(data, yours.kind === 'retail' ? 'tala-apparel' : 'kanto-smash');
  const items = pack.catalog.items.slice(0, 2);
  const card = pack.storefront.stampCard;
  const needed = card.rule.stampsNeeded;
  const name = yours.name.trim() === '' ? W.yoursName : yours.name.trim();
  return (
    <ShopScreen
      shop={pack}
      now={now}
      name={name}
      logo={false}
      brandColor={yours.colour ?? DEFAULT_BRAND_COLOR}
    >
      <MenuGrid items={items} pressed={null} badges={[{ tone: 'sample', label: W.sampleBadge }]} />
      <StampCard
        needed={needed}
        stamped={1}
        title={W.stampTitle}
        body={W.stampRule(formatPeso(card.rule.minOrderTotal))}
        progressLabel={W.stampProgress(1, needed)}
        prize={{ title: card.reward.title, photo: pic(card.reward.image), label: W.prizeLabel }}
        assetOrigin={ORIGIN}
      />
      <Badge variant="secondary" className="self-center">
        {W.sample(name)}
      </Badge>
    </ShopScreen>
  );
}
