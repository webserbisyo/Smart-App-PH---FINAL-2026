import * as React from 'react';
import {
  BellIcon,
  CheckIcon,
  GiftIcon,
  HouseIcon,
  PackageIcon,
  ReceiptTextIcon,
  UtensilsIcon,
} from 'lucide-react';
import {
  DEFAULT_BRAND_COLOR,
  formatPeso,
  homeWords,
  imageSources,
  showcaseWords,
  vocab,
  words,
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
import { StatusLogo } from '@smartapp/ui/compositions/status-logo';
import { StorefrontDock } from '@smartapp/ui/compositions/storefront-dock';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { rewardReady, stampBurst } from '@smartapp/ui/compositions/celebrate';
import { PushUpdatesCard, ShopNewsCard } from '@smartapp/ui/compositions/news-settings';
import { ProductCard, type ProductBadge } from '@smartapp/ui/compositions/product-card';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';
import { StampCard } from '@smartapp/ui/compositions/stamp-card';
import { cn } from '@smartapp/ui/lib/utils';
import { CustomerFace } from '@/app/owner-avatar';
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

// How long each step of a chapter stays on screen (ms): short taps, longer looks at the result.
export const PACE = {
  order: [1500, 900, 1100, 900, 1800],
  chat: [1800, 1600, 1500, 1700],
  stamps: [1300, 900, 900, 1100, 2400],
  push: [1700, 1500, 1300, 1100, 1300, 1300, 2000],
  retail: [1500, 1000, 1000, 1300, 2000],
  owner: [1000, 1300, 1300, 1600, 1100, 2200],
} as const;

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

const CATALOG_ICON = { utensils: <UtensilsIcon />, package: <PackageIcon /> } as const;
type DockTab = 'home' | 'catalog' | 'rewards' | 'orders';

/** The storefront's own floating dock (Home, Menu or Products, Rewards, Orders) with the cart beside it. */
function ShopDock({
  shop,
  active,
  count = 0,
  total = 0,
}: {
  shop: PublicShop;
  active: DockTab;
  count?: number | undefined;
  total?: number | undefined;
}) {
  const kind = vocab(shop.storefront.info.kind);
  const tab = (id: DockTab, label: string, icon: React.ReactNode): NavItem => ({
    id,
    label,
    icon,
    link: <button type="button" tabIndex={-1} />,
    active: id === active,
  });
  const items = [
    tab('home', words.nav.home, <HouseIcon />),
    tab('catalog', kind.catalog, CATALOG_ICON[kind.catalogIcon]),
    ...(shop.storefront.stampCard.status === 'off'
      ? []
      : [tab('rewards', words.storefrontShell.rewards, <GiftIcon />)]),
    tab('orders', words.nav.orders, <ReceiptTextIcon />),
  ];
  return (
    <StorefrontDock
      label={words.storefrontShell.mainNav}
      items={items}
      cart={
        count > 0 ? (
          <CartButton
            variant="dock"
            count={count}
            label={words.storefrontShell.openBasket(count, formatPeso(total))}
            onClick={noop}
          />
        ) : null
      }
    />
  );
}

/**
 * A sample shop's app screen like the real storefront on a phone: its colours, the status bar, the open
 * logo and name, the signed-in Suki's face, and the floating dock at the bottom.
 */
function ShopScreen({
  shop,
  now,
  name,
  logo = true,
  brandColor,
  member = null,
  dock,
  children,
}: {
  shop: PublicShop;
  now: Date;
  name?: string | undefined;
  logo?: boolean | undefined;
  brandColor?: string | undefined;
  member?: Showcase['member'] | undefined;
  dock?: React.ReactNode;
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
      <div className="relative flex h-full flex-col bg-background text-foreground">
        <StatusBar now={now} />
        <div className="flex items-center gap-3 px-4 pb-3">
          <StatusLogo
            name={title}
            src={logo ? pic(shop.storefront.info.logo) : null}
            state="open"
            stateLabel={words.shop.openStateShort.open}
            logoShape={own ? 'circle' : look.logoShape}
          />
          <p className="min-w-0 flex-1 truncate font-heading text-lg font-bold">{title}</p>
          {member ? (
            <CustomerFace
              avatar={member.avatar}
              name={member.name}
              className="ring-2 ring-member ring-offset-2 ring-offset-background"
            />
          ) : null}
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pb-24 *:shrink-0">
          {children}
        </div>
        {dock}
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
            'transition duration-base',
            pressed === i && 'scale-97 ring-2 ring-shop-10-text',
          )}
        />
      ))}
    </div>
  );
}

function Banner({ shop }: { shop: PublicShop }) {
  const banner = shop.storefront.look.banners[0];
  if (!banner) return null;
  return (
    <ShopImage
      src={pic(banner.ref)}
      alt=""
      ratio="21:9"
      sizes="330px"
      className="shrink-0 overflow-hidden rounded-xl"
    />
  );
}

// ------------------------------------------------------------------ Phone notifications

export interface Push {
  id: string;
  // A shop's logo for its customers, our app mark for the owner.
  icon: React.ReactNode;
  app: string;
  title: string;
  body: string;
}

/** Our app's mark, the icon on the owner's own notifications. */
export function AppMark() {
  return (
    <img
      src="/brand/smartappph-mark-96.webp"
      alt=""
      className="size-8 shrink-0 rounded-lg bg-card object-contain p-1"
    />
  );
}

function PushRow({ push, className }: { push: Push; className?: string | undefined }) {
  return (
    <ItemRow
      className={cn(
        'items-start rounded-3xl bg-popover/85 text-popover-foreground shadow-lg backdrop-blur-md',
        className,
      )}
    >
      <ItemMedia>{push.icon}</ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{push.app}</span>
          <span>{W.now}</span>
        </span>
        <span className="text-sm leading-snug font-semibold">{push.title}</span>
        {push.body ? (
          <ItemDescription className="line-clamp-2 text-sm">{push.body}</ItemDescription>
        ) : null}
      </ItemContent>
    </ItemRow>
  );
}

/**
 * A notification dropping in over the open app, like Android's heads-up banner. It stays in the tree and
 * slides in and out with a transform, so leaving is as smooth as arriving.
 */
function HeadsUp({ push, shown }: { push: Push; shown: boolean }) {
  return (
    <div
      aria-hidden={shown ? undefined : true}
      className={cn(
        'absolute inset-x-2 top-2 z-30 transition duration-slow ease-out motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0',
      )}
    >
      <PushRow push={push} className="bg-popover/95 ring-1 ring-border" />
    </div>
  );
}

// A neutral photo, the same for every shop, so the shop's colour shows only in its own notifications.
const WALLPAPER = '/showcase/lock-wallpaper-360.webp';
const WALLPAPER_SET =
  '/showcase/lock-wallpaper-360.webp 360w, /showcase/lock-wallpaper-720.webp 720w';

function LockScreen({
  now,
  pushes,
  reduce,
}: {
  now: Date;
  pushes: readonly Push[];
  reduce: boolean;
}) {
  return (
    <div className="dark relative flex h-full flex-col overflow-hidden text-foreground">
      <img
        src={WALLPAPER}
        srcSet={WALLPAPER_SET}
        sizes="360px"
        alt=""
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-background/40 via-transparent to-background/70"
      />
      <div className="relative flex h-full flex-col">
        <StatusBar now={now} />
        <div className="flex flex-col items-center gap-1 pt-10">
          <p className="text-base font-semibold">{phoneDay(now)}</p>
          <p className="text-8xl leading-none font-bold tracking-tight tabular">
            {phoneClock(now)}
          </p>
        </div>
        <div className="mt-auto flex flex-col gap-2 px-3 pb-10">
          {pushes.map((push) => (
            <Appear key={push.id} reduce={reduce}>
              <PushRow push={push} />
            </Appear>
          ))}
        </div>
        <span aria-hidden="true" className="mx-auto mb-3 h-1 w-28 rounded-full bg-foreground/70" />
      </div>
    </div>
  );
}

function shopPushIcon(shop: PublicShop) {
  return (
    <ShopLogo name={shop.storefront.info.name} src={pic(shop.storefront.info.logo)} size="sm" />
  );
}

/** The owner's own pushes, newest last: a new order, a payment photo to check, an order due soon. */
export function ownerPushes(data: Showcase, pick = 0): Push[] {
  const photo = data.chat?.order;
  // The payment photo has its own push, so the other two come from the rest of the board.
  const board = data.board.filter((o) => o.id !== photo?.id);
  const at = (n: number) => (board.length > 0 ? board[(pick + n) % board.length] : undefined);
  const fresh = at(0);
  const due = at(1);
  const app = words.appName;
  return [
    ...(fresh
      ? [
          {
            id: `new-${fresh.id}`,
            icon: <AppMark />,
            app,
            title: W.ownerPush.newOrder(orderNoLabel(fresh.orderNo), formatPeso(fresh.total)),
            body: W.ownerPush.newOrderBody(fresh.customerName, fresh.itemsSummary),
          },
        ]
      : []),
    ...(photo
      ? [
          {
            id: `photo-${photo.id}`,
            icon: <AppMark />,
            app,
            title: W.ownerPush.photo(orderNoLabel(photo.orderNo)),
            body: W.ownerPush.photoBody(photo.customerName, formatPeso(photo.total)),
          },
        ]
      : []),
    ...(due && due.id !== fresh?.id
      ? [
          {
            id: `due-${due.id}`,
            icon: <AppMark />,
            app,
            title: W.ownerPush.due(orderNoLabel(due.orderNo)),
            body: W.ownerPush.dueBody(due.customerName),
          },
        ]
      : []),
  ];
}

// ------------------------------------------------------------------ 1 Order (Kanto Smash)

export function OrderScene({ data, beat, now }: SceneProps) {
  const shop = shopOf(data, 'kanto-smash');
  const items = shop.catalog.items.slice(0, 4);
  const added = beat >= 3 ? 2 : beat >= 1 ? 1 : 0;
  const total = items.slice(0, added).reduce((sum, item) => sum + firstPrice(item), 0);
  return (
    <ShopScreen
      shop={shop}
      now={now}
      member={data.member}
      dock={<ShopDock shop={shop} active="home" count={added} total={total} />}
    >
      <Banner shop={shop} />
      <MenuGrid items={items} pressed={beat === 1 ? 0 : beat === 3 ? 1 : null} />
    </ShopScreen>
  );
}

// ------------------------------------------------------------------ 2 Chat and payment (owner side)

export function ChatScene({ data, beat, now }: SceneProps) {
  const chat = data.chat;
  const push = ownerPushes(data).find((p) => p.id.startsWith('photo-'));
  return (
    <div className="relative flex h-full flex-col bg-card text-foreground">
      <StatusBar now={now} />
      {push ? <HeadsUp push={push} shown={beat <= 1} /> : null}
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
  const stamped = Math.min(needed, start + Math.min(beat, 3));
  const ready = stamped >= needed;
  const box = React.useRef<HTMLDivElement>(null);
  useCelebrate(beat, live, box, 3);
  const first = data.member?.name.split(' ')[0];
  return (
    <ShopScreen
      shop={shop}
      now={now}
      member={data.member}
      dock={<ShopDock shop={shop} active="rewards" />}
    >
      {first ? <p className="text-xl font-bold">{W.hello(first)}</p> : null}
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

export function PushScene({ data, beat, now, reduce }: SceneProps) {
  const shop = shopOf(data, 'kanto-smash');
  const card = shop.storefront.stampCard;
  const needed = card.rule.stampsNeeded;
  const no = orderNoLabel(data.chat?.order.orderNo ?? data.board[0]?.orderNo ?? 45);
  const name = shop.storefront.info.name;
  if (beat >= 3) {
    const icon = shopPushIcon(shop);
    const all: Push[] = [
      { id: 'done', icon, app: name, title: W.pushDone(no, needed - 1, needed), body: '' },
      ...data.news
        .slice(0, 1)
        .map((n) => ({ id: n.id, icon, app: name, title: n.title, body: n.body })),
      { id: 'reward', icon, app: name, title: W.pushReward(card.reward.title), body: '' },
    ];
    const shown = all.slice(0, Math.max(0, beat - 3)).reverse();
    return <LockScreen now={now} pushes={shown} reduce={reduce} />;
  }
  return (
    <ShopScreen
      shop={shop}
      now={now}
      member={data.member}
      dock={<ShopDock shop={shop} active="orders" />}
    >
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
  const inBasket = beat >= 3 && picked !== undefined;
  return (
    <ShopScreen
      shop={shop}
      now={now}
      dock={
        <ShopDock
          shop={shop}
          active="catalog"
          count={inBasket ? 1 : 0}
          total={inBasket ? firstPrice(item) : 0}
        />
      }
    >
      <ShopImage
        src={pic(item.photos[0])}
        alt=""
        ratio="16:9"
        sizes="330px"
        className="shrink-0 overflow-hidden rounded-xl"
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
      <Button className="h-11 shrink-0 rounded-full bg-shop-10 font-semibold text-shop-10-foreground">
        {inBasket ? (
          <>
            <CheckIcon aria-hidden="true" />
            {W.added(picked ?? '', price)}
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

// ------------------------------------------------------------------ 6 The owner's phone

/** The owner's dashboard on their phone: the newest order with its ring, and the last 7 days of sales. */
function OwnerHome({
  data,
  now,
  pick,
  fresh,
  push,
}: {
  data: Showcase;
  now: Date;
  pick: number;
  fresh: boolean;
  push?: Push | undefined;
}) {
  // The same order as the "New order" push that came in on the lock screen.
  const board = data.board.filter((o) => o.id !== data.chat?.order.id);
  const order = board.length > 0 ? board[pick % board.length] : data.board[0];
  const shop = shopOf(data, 'kanto-smash');
  const name = shop.storefront.info.name;
  return (
    <div className="relative flex h-full flex-col bg-background text-foreground">
      <StatusBar now={now} />
      {push ? <HeadsUp push={push} shown={fresh} /> : null}
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-4">
        <div className="flex items-center gap-3 px-1">
          <ShopLogo name={name} src={pic(shop.storefront.info.logo)} size="sm" shape="round" />
          <p className="min-w-0 truncate text-lg font-bold">{name}</p>
        </div>
        {order ? (
          <OrderCard
            key={order.id}
            order={order}
            now={now}
            kind={shop.storefront.info.kind}
            onOpen={noop}
            onAdvance={noopAsync}
            onPayAndComplete={noopAsync}
            fresh={fresh}
          />
        ) : null}
        <SalesCard
          data={data.week}
          periodText={homeWords.period.picks['7d']}
          live={false}
          asOf={now}
        />
      </div>
    </div>
  );
}

/**
 * The owner's phone: their pushes stack up on the lock screen (new order, payment photo, due soon), then the
 * phone opens on the dashboard with the new order ringing. `pick` moves to the next order on Log in.
 */
export function OwnerScene({ data, beat, now, reduce, pick = 0 }: SceneProps & { pick?: number }) {
  const pushes = ownerPushes(data, pick);
  const locked = 4;
  if (beat < locked) {
    return (
      <LockScreen now={now} pushes={pushes.slice(0, Math.max(0, beat)).reverse()} reduce={reduce} />
    );
  }
  return <OwnerHome data={data} now={now} pick={pick} fresh={beat === locked} />;
}

// ------------------------------------------------------------------ A sample shop from the strip

/** Any sample shop's home, opened from its chip: banner, Suki card, the first items and the dock. */
export function ShopScene({ data, now, slug }: SceneProps & { slug: string }) {
  const shop = shopOf(data, slug);
  const card = shop.storefront.stampCard;
  const needed = card.rule.stampsNeeded;
  const items = shop.catalog.items.slice(0, 4);
  return (
    <ShopScreen shop={shop} now={now} dock={<ShopDock shop={shop} active="home" />}>
      <Banner shop={shop} />
      {card.status === 'off' ? null : (
        <StampCard
          needed={needed}
          stamped={Math.min(needed - 1, 3)}
          title={W.stampTitle}
          body={W.stampRule(formatPeso(card.rule.minOrderTotal))}
          progressLabel={W.stampProgress(Math.min(needed - 1, 3), needed)}
          prize={{ title: card.reward.title, photo: pic(card.reward.image), label: W.prizeLabel }}
          assetOrigin={ORIGIN}
        />
      )}
      <MenuGrid items={items} pressed={null} />
    </ShopScreen>
  );
}

// ------------------------------------------------------------------ Your app (from the form)

export interface Yours {
  name: string;
  kind: ShopKind;
  colour: string | null;
}

// The sample shop whose menu fills the preview of the person's own app.
const PACK: Record<ShopKind, string> = { food: 'kanto-smash', retail: 'tala-apparel' };

export function YoursScene({ data, now, yours }: SceneProps & { yours: Yours }) {
  const pack = shopOf(data, PACK[yours.kind]);
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
      dock={<ShopDock shop={pack} active="home" />}
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
