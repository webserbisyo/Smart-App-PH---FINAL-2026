import { useState } from 'react';
import {
  GiftIcon,
  HouseIcon,
  MapPinIcon,
  PhoneIcon,
  ReceiptTextIcon,
  UtensilsIcon,
} from 'lucide-react';
import {
  artPath,
  contrastRatio,
  DEMO_SHOPS,
  imageSources,
  shopPalette,
  words,
  type DemoShopSlug,
  type IconKey,
  type ShopSurface,
} from '@smartapp/core';
import type { ImageSources } from '@smartapp/core/media';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { Confetti } from '@smartapp/ui/components/confetti';
import { GridPattern } from '@smartapp/ui/components/grid-pattern';
import { NumberTicker } from '@smartapp/ui/components/number-ticker';
import { QRCode, QRCodeSvg } from '@smartapp/ui/components/qr-code';
import { BannerCarousel, type BannerSlide } from '@smartapp/ui/compositions/banner-carousel';
import { BrandPanel } from '@smartapp/ui/compositions/brand-panel';
import { rewardReady, stampBurst } from '@smartapp/ui/compositions/celebrate';
import { CountUp } from '@smartapp/ui/compositions/count-up';
import { EmptyState } from '@smartapp/ui/compositions/empty-state';
import { ShopImage, type ShopImageRatio } from '@smartapp/ui/compositions/shop-image';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';
import { StatusLogo } from '@smartapp/ui/compositions/status-logo';
import { StampCard } from '@smartapp/ui/compositions/stamp-card';
import { OtpResend } from '@smartapp/ui/compositions/otp-resend';
import { InfoList } from '@smartapp/ui/compositions/info-list';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';
import { StorefrontDock } from '@smartapp/ui/compositions/storefront-dock';
import { CartButton } from '@smartapp/ui/compositions/cart-button';
import { HeartToggle } from '@smartapp/ui/compositions/heart-toggle';
import { ProductCard, ProductCardSkeleton } from '@smartapp/ui/compositions/product-card';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { startReveal } from '@smartapp/ui/lib/reveal-clip';
import { AddToCartButton } from '@smartapp/ui/vendor/opensource-ui/add-to-cart';
import { LikeButton } from '@smartapp/ui/vendor/opensource-ui/like-toggle';
import { ThermalReceiptCard } from '@smartapp/ui/vendor/opensource-ui/thermal-receipt';
import { env } from '@/app/env';
import { KitSection } from './kit-section.js';
import { KitShopProvider } from './kit-shop.js';
import { RedesignPrimitiveSections } from './redesign-primitives.js';

// Demo photos live in the storefront's public folder; the kit loads them from there.
const ORIGIN = env.VITE_STOREFRONT_URL;

interface KitShop {
  slug: DemoShopSlug;
  item: string;
  itemName: string;
  icon: IconKey;
}

const KIT_SHOPS: readonly KitShop[] = [
  { slug: 'kanto-smash', item: 'classic-smash', itemName: 'Classic Smash', icon: 'burger' },
  { slug: 'aqualinis', item: 'refill-purified', itemName: 'Purified Refill', icon: 'water_gallon' },
  { slug: 'tala-apparel', item: 'tala-basic-tee-sand', itemName: 'Tala Basic Tee', icon: 'tshirt' },
  { slug: 'kape-juan', item: 'spanish-latte', itemName: 'Spanish Latte', icon: 'coffee' },
  { slug: 'lola-remy', item: 'classic-pandesal', itemName: 'Classic Pandesal', icon: 'bread' },
];

const RATIOS: readonly ShopImageRatio[] = ['1:1', '4:3', '16:9', '21:9'];

const BANNER_LABELS = {
  region: words.media.banners,
  slideOf: words.media.slideOf,
  showBanner: words.media.showBanner,
};

function ImageStates({ shop, ratio }: { shop: KitShop; ratio: ShopImageRatio }) {
  const photo = imageSources(`demo:${shop.slug}/items/${shop.item}`, ORIGIN);
  const broken = photo && {
    ...photo,
    avif: photo.avif.replaceAll(shop.item, 'missing-file'),
    webp: photo.webp.replaceAll(shop.item, 'missing-file'),
  };
  const states = [
    { label: 'Photo', node: <ShopImage src={photo} alt="Photo" ratio={ratio} sizes="160px" /> },
    {
      label: 'No photo (icon)',
      node: (
        <ShopImage
          src={null}
          alt="No photo"
          ratio={ratio}
          sizes="160px"
          fallbackIcon={shop.icon}
          assetOrigin={ORIGIN}
        />
      ),
    },
    {
      label: 'No photo (initials)',
      node: (
        <ShopImage
          src={null}
          alt="No photo"
          ratio={ratio}
          sizes="160px"
          fallbackText="Classic Smash"
        />
      ),
    },
    {
      label: 'Broken URL',
      node: (
        <ShopImage
          src={broken}
          alt="Broken"
          ratio={ratio}
          sizes="160px"
          fallbackIcon={shop.icon}
          assetOrigin={ORIGIN}
        />
      ),
    },
    {
      label: 'Loading',
      node: <ShopImage src={photo} alt="Loading" ratio={ratio} sizes="160px" isLoading />,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {states.map((state) => (
        <figure key={state.label} className="min-w-0 space-y-1">
          {state.node}
          <figcaption className="text-xs text-muted-foreground">
            {ratio} · {state.label}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function PaletteSwatches({ brandColor, surface }: { brandColor: string; surface: ShopSurface }) {
  const palette = shopPalette(brandColor, surface);
  const pairs = [
    {
      name: 'shop-60',
      bg: 'bg-shop-60',
      fg: 'text-foreground',
      ratio: contrastRatio(palette.shop60, palette.foreground),
    },
    {
      name: 'shop-30',
      bg: 'bg-shop-30',
      fg: 'text-foreground',
      ratio: contrastRatio(palette.shop30, palette.foreground),
    },
    {
      name: 'shop-10',
      bg: 'bg-shop-10',
      fg: 'text-shop-10-foreground',
      ratio: contrastRatio(palette.shop10, palette.shop10Foreground),
    },
    {
      name: 'shop-10-hover',
      bg: 'bg-shop-10-hover',
      fg: 'text-shop-10-foreground',
      ratio: contrastRatio(palette.shop10Hover, palette.shop10Foreground),
    },
    {
      name: 'shop-10-text',
      bg: 'bg-shop-60',
      fg: 'text-shop-10-text',
      ratio: contrastRatio(palette.shop60, palette.shop10Text),
    },
    {
      name: 'shop-10-soft',
      bg: 'bg-shop-10-soft',
      fg: 'text-shop-10-soft-foreground',
      ratio: contrastRatio(palette.shop10Soft, palette.shop10SoftForeground),
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {pairs.map((pair) => (
        <div key={pair.name} className="overflow-hidden rounded-lg border bg-card">
          <div
            className={`flex h-16 items-center justify-center text-sm font-semibold ${pair.bg} ${pair.fg}`}
          >
            Aa {pair.ratio.toFixed(1)}:1
          </div>
          <div className="flex items-center justify-between gap-1 p-2 text-xs">
            <span className="truncate font-mono">{pair.name}</span>
            <Badge variant={pair.ratio >= 4.5 ? 'secondary' : 'destructive'}>
              {pair.ratio >= 4.5 ? 'AA' : 'Fails'}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function MotionDemos() {
  const [stampKey, setStampKey] = useState(0);
  const [checkKey, setCheckKey] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const reducedMotion = useReducedMotion();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Reduced motion is {reducedMotion ? 'on: animations are off' : 'off'}.
      </p>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <span
            key={stampKey}
            className="flex size-12 press-stamp items-center justify-center rounded-full bg-member text-member-foreground"
          >
            ✓
          </span>
          <Button variant="outline" onClick={() => setStampKey((k) => k + 1)}>
            press-stamp
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <svg
            key={checkKey}
            viewBox="0 0 24 24"
            className="size-12 fill-none stroke-success stroke-2"
            aria-hidden="true"
          >
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              pathLength={1}
              className="draw-check"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <Button variant="outline" onClick={() => setCheckKey((k) => k + 1)}>
            draw-check
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-28 items-center justify-center rounded-lg text-sm font-semibold reveal-clip ${revealed ? 'bg-shop-10 text-shop-10-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {revealed ? 'Ready' : 'Waiting'}
          </span>
          <Button
            variant="outline"
            onClick={(event) =>
              startReveal({ x: event.clientX, y: event.clientY }, () => setRevealed((r) => !r))
            }
          >
            reveal-clip
          </Button>
        </div>
      </div>
    </div>
  );
}

const DOCK_TABS: NavItem[] = [
  { id: 'home', label: 'Home', icon: <HouseIcon />, link: <a href="#kit-dock" />, active: true },
  {
    id: 'menu',
    label: 'Menu',
    icon: <UtensilsIcon />,
    link: <a href="#kit-dock" />,
    active: false,
  },
  {
    id: 'rewards',
    label: 'Rewards',
    icon: <GiftIcon />,
    link: <a href="#kit-dock" />,
    active: false,
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: <ReceiptTextIcon />,
    link: <a href="#kit-dock" />,
    active: false,
  },
];

// Glass pill with the cart beside it (decisions R5, R6 and R20): empty, 1 item, 9 items and 99+, at
// 390 and 360 px, with a different active tab each time, and no tab active (Account, Join).
function DockStates() {
  const states = [
    { label: 'No tab active (Account, Join)', count: 0, active: 'none', width: 'max-w-sm' },
    { label: 'Empty basket (no cart)', count: 0, active: 'home', width: 'max-w-sm' },
    { label: '1 item, Menu active', count: 1, active: 'menu', width: 'max-w-sm' },
    {
      label: '9 items at 390 px, Rewards active',
      count: 9,
      active: 'rewards',
      width: 'max-w-97.5',
    },
    {
      label: '120 items at 360 px, Orders active',
      count: 120,
      active: 'orders',
      width: 'max-w-90',
    },
  ];
  return (
    <div id="kit-dock" className="flex flex-col gap-4">
      {states.map((s) => (
        <div key={s.label} className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{s.label}</span>
          <div
            className={`relative h-24 w-full ${s.width} transform-gpu overflow-hidden rounded-xl border border-border bg-background`}
          >
            <StorefrontDock
              label="Demo"
              items={DOCK_TABS.map((tab) => ({ ...tab, active: tab.id === s.active }))}
              cart={
                s.count > 0 ? (
                  <CartButton
                    variant="dock"
                    count={s.count}
                    label={`Basket, ${s.count} items`}
                    onClick={() => {}}
                  />
                ) : null
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Open (turning green ring), busy (amber), closed (grey, decision R4) and loading (no word yet).
function StatusLogos({ name, logo }: { name: string; logo: ImageSources | null }) {
  const states = [
    { state: 'open', label: 'Open' },
    { state: 'busy', label: 'Busy' },
    { state: 'closed', label: 'Closed' },
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-8">
      {states.map((s) => (
        <StatusLogo key={s.state} name={name} src={logo} state={s.state} stateLabel={s.label} />
      ))}
      <StatusLogo name={name} src={null} state="open" stateLabel="Open" size="lg" />
      <StatusLogo name={name} src={logo} state={null} stateLabel="" />
    </div>
  );
}

// The top bar's outline cart and the dock's shop-colour cart: 0, 3 and 99+.
function CartButtons() {
  const [count, setCount] = useState(3);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <CartButton count={0} label="Basket, empty" onClick={() => {}} />
      <CartButton count={count} label={`Basket, ${count} items`} onClick={() => {}} />
      <CartButton
        variant="dock"
        count={count}
        label={`Basket, ${count} items`}
        onClick={() => {}}
      />
      <CartButton variant="dock" count={120} label="Basket, 120 items" onClick={() => {}} />
      <Button variant="outline" onClick={() => setCount((c) => c + 1)}>
        Add one (pops)
      </Button>
    </div>
  );
}

// Guest, member with stamps on the way, reward ready (shine) and paused; a 20-stamp card.
function StampCards({ prizePhoto }: { prizePhoto: ImageSources | null }) {
  const prize = { title: 'Free Classic Smash', photo: prizePhoto, label: 'Prize' };
  const action = (label: string, variant: 'default' | 'outline' = 'default') => (
    <Button size="lg" variant={variant} className="h-11">
      {label}
    </Button>
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <StampCard
        needed={8}
        stamped={0}
        title="8 stamps = Free Classic Smash"
        body="Join free and get 1 stamp now."
        progressLabel="0 of 8 stamps"
        prize={prize}
        assetOrigin={ORIGIN}
        action={action('Join free')}
      />
      <StampCard
        needed={10}
        stamped={4}
        pending={2}
        title="6 more stamps to go"
        body="2 stamps on the way"
        progressLabel="4 of 10 stamps"
        prize={prize}
        assetOrigin={ORIGIN}
        action={action('See rewards', 'outline')}
      />
      <StampCard
        needed={8}
        stamped={8}
        ready
        readyLine="Your reward is ready"
        title="Free Classic Smash is ready"
        progressLabel="8 of 8 stamps"
        prize={prize}
        assetOrigin={ORIGIN}
        action={action('Claim')}
      />
      <StampCard
        needed={8}
        stamped={1}
        pressIndex={0}
        title="Welcome! 7 more to Free Classic Smash"
        body="The welcome stamp presses in once (no motion under reduced motion)."
        progressLabel="1 of 8 stamps"
        prize={prize}
        assetOrigin={ORIGIN}
        action={action('See my stamp card')}
      />
      <StampCard
        needed={20}
        stamped={13}
        title="Stamps are paused"
        body="Your stamps are safe. The shop will turn them back on soon."
        progressLabel="13 of 20 stamps"
        prize={{ ...prize, photo: null }}
        assetOrigin={ORIGIN}
        action={action('See rewards', 'outline')}
      />
    </div>
  );
}

// Fresh code with the resend countdown, a wrong code, and Resend ready (the join step, T12).
function OtpResends() {
  const [code, setCode] = useState('');
  const [resendAt, setResendAt] = useState(() => new Date(Date.now() + 60_000).toISOString());
  const [wrong, setWrong] = useState('12');
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <OtpResend
        id="kit-otp-fresh"
        value={code}
        onChange={setCode}
        label="Enter the 6-digit code"
        sentLine="We sent it to a••@example.com"
        hint="Not there? Check Spam or Promotions."
        resendAt={resendAt}
        onResend={() => setResendAt(new Date(Date.now() + 60_000).toISOString())}
        resendLabel="Send a new code"
        resendInLabel={(seconds) => `Send a new code in ${seconds} s`}
      />
      <OtpResend
        id="kit-otp-wrong"
        value={wrong}
        onChange={setWrong}
        label="Enter the 6-digit code"
        sentLine="We sent it to a••@example.com"
        hint="Not there? Check Spam or Promotions."
        resendAt={null}
        onResend={() => setWrong('')}
        resendLabel="Send a new code"
        resendInLabel={(seconds) => `Send a new code in ${seconds} s`}
        error="Wrong code, try again."
      />
      <OtpResend
        id="kit-otp-busy"
        value="123456"
        onChange={() => {}}
        label="Enter the 6-digit code"
        sentLine="We sent it to a••@example.com"
        hint="Checking your code…"
        resendAt={null}
        onResend={() => {}}
        resendLabel="Send a new code"
        resendInLabel={(seconds) => `Send a new code in ${seconds} s`}
        resending
        disabled
      />
    </div>
  );
}

// Plain, new + best seller with a saved heart, sold out today, no photo (category icon) with a long
// name, and the loading shape.
function ProductCards({ shop }: { shop: KitShop }) {
  const name = shop.itemName;
  const [saved, setSaved] = useState<readonly string[]>(['b']);
  const heart = (id: string, itemName: string) => ({
    pressed: saved.includes(id),
    onPressedChange: (on: boolean) =>
      setSaved((ids) => (on ? [...ids, id] : ids.filter((other) => other !== id))),
    label: `Save ${itemName}`,
    pressedLabel: `Remove ${itemName} from favourites`,
  });
  const photo = imageSources(`demo:${shop.slug}/items/${shop.item}`, ORIGIN);
  const add = (itemName: string) => ({ label: `Add ${itemName}`, onClick: () => undefined });
  const cards = [
    { id: 'a', title: name, price: '₱149', badges: [], soldOut: false, src: photo },
    {
      id: 'b',
      title: name,
      price: 'from ₱189',
      badges: [
        { tone: 'new' as const, label: 'New' },
        { tone: 'bestSeller' as const, label: 'Best seller' },
      ],
      soldOut: false,
      src: photo,
    },
    {
      id: 'c',
      title: name,
      price: '₱149',
      badges: [{ tone: 'soldOut' as const, label: 'Sold out today' }],
      soldOut: true,
      src: photo,
    },
    {
      id: 'd',
      title: 'A very long product name that wraps past two lines on a phone card',
      price: '₱12,499',
      badges: [],
      soldOut: false,
      src: null,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <ProductCard
          key={card.id}
          name={card.title}
          priceLabel={card.price}
          photo={card.src}
          fallbackIcon={shop.icon}
          sizes="200px"
          openLabel={`${card.title}, ${card.price}`}
          onOpen={() => undefined}
          badges={card.badges}
          soldOut={card.soldOut}
          heart={heart(card.id, card.title)}
          add={add(card.title)}
          assetOrigin={ORIGIN}
        />
      ))}
      <ProductCardSkeleton />
    </div>
  );
}

// Glass chip on a photo (32 px with a 56 px touch area) and the 44 px card button, off and on.
function HeartToggles({ photo }: { photo: ImageSources | null }) {
  const [on, setOn] = useState(false);
  const [onCard, setOnCard] = useState(true);
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative w-40 overflow-hidden rounded-xl">
        <ShopImage src={photo} alt="" ratio="1:1" sizes="160px" assetOrigin={ORIGIN} />
        <HeartToggle
          pressed={on}
          onPressedChange={setOn}
          label="Save item"
          pressedLabel="Remove item from favourites"
          className="absolute top-2 right-2"
        />
      </div>
      <HeartToggle
        pressed={onCard}
        onPressedChange={setOnCard}
        label="Save item"
        pressedLabel="Remove item from favourites"
        variant="card"
        size="md"
      />
    </div>
  );
}

// Fluent 3D pictures for empty and success states (served by the storefront).
function EmptyStates() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <EmptyState
        art={`${ORIGIN}${artPath('basket_empty')}`}
        title="Your basket is empty"
        description="Add something you like and it shows up here."
        action={<Button className="h-11 rounded-full px-6">Browse menu</Button>}
      />
      <EmptyState
        art={`${ORIGIN}${artPath('search_empty')}`}
        title="No match for “halo-halo”"
        description="Try another word, or look in a category."
        action={
          <Button variant="outline" className="h-11 rounded-full bg-card px-6">
            Clear
          </Button>
        }
      />
      <EmptyState
        art={`${ORIGIN}${artPath('completed')}`}
        title="Completed"
        description="Thanks for ordering!"
        variant="plain"
      />
    </div>
  );
}

// Grouped hours with today highlighted, and tappable contact rows.
function InfoLists() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InfoList
        rows={[
          { id: 'mon', label: 'Mon to Thu', value: '11 AM to 10 PM' },
          { id: 'fri', label: 'Fri to Sun', value: '11 AM to 12 MN', highlight: true },
        ]}
      />
      <InfoList
        rows={[
          {
            id: 'call',
            icon: <PhoneIcon />,
            label: 'Call',
            description: '0917 123 4567',
            href: 'tel:09171234567',
          },
          {
            id: 'map',
            icon: <MapPinIcon />,
            label: 'Directions',
            description: 'A very long street address that keeps going past the edge, Marikina City',
            href: '#kit-info-list',
          },
        ]}
      />
    </div>
  );
}

export function StorefrontSections() {
  const [slug, setSlug] = useState<DemoShopSlug>('kanto-smash');
  const summary = DEMO_SHOPS.find((s) => s.slug === slug) ?? DEMO_SHOPS[0];
  const shop = KIT_SHOPS.find((s) => s.slug === slug) ?? KIT_SHOPS[0];
  if (!summary || !shop) return null;

  const logo = imageSources(`demo:${slug}/brand/logo`, ORIGIN);
  const banners: BannerSlide[] = [1, 2, 3].map((n) => ({
    src: imageSources(`demo:${slug}/banners/banner-${n}`, ORIGIN),
    alt: `${summary.name} banner ${n}`,
    fallbackIcon: shop.icon,
  }));

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Storefront</h2>
          <p className="text-sm text-muted-foreground">
            Pick a demo shop: every section below is wrapped in ShopTheme with its palette.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {KIT_SHOPS.map((s) => (
            <Button
              key={s.slug}
              variant={s.slug === slug ? 'default' : 'outline'}
              onClick={() => setSlug(s.slug)}
            >
              {DEMO_SHOPS.find((d) => d.slug === s.slug)?.name ?? s.slug}
            </Button>
          ))}
        </div>
      </section>

      <ShopTheme brandColor={summary.brandColor} surface={summary.surface}>
        <div className="space-y-12 rounded-xl bg-shop-60 p-4 text-foreground md:p-6">
          <KitSection
            title="Shop palette (ShopTheme)"
            library="composition"
            path="packages/ui/src/compositions/shop-theme.tsx · core rules/palette.ts"
            usedIn="kit"
          >
            <p className="text-sm">
              Brand <span className="font-mono">{summary.brandColor}</span> → shopPalette()
            </p>
            <PaletteSwatches brandColor={summary.brandColor} surface={summary.surface} />
          </KitSection>

          <KitSection
            title="Shop image"
            library="composition"
            path="packages/ui/src/compositions/shop-image.tsx"
            usedIn="banner-carousel, brand-panel, kit"
          >
            <div className="space-y-6">
              {RATIOS.map((ratio) => (
                <ImageStates key={ratio} shop={shop} ratio={ratio} />
              ))}
            </div>
          </KitSection>

          <KitSection
            title="Shop logo"
            library="composition"
            path="packages/ui/src/compositions/shop-logo.tsx"
            usedIn="brand-panel, kit"
          >
            <div className="flex flex-wrap items-center gap-4">
              <ShopLogo name={summary.name} src={logo} size="lg" />
              <ShopLogo name={summary.name} src={null} size="lg" />
              <ShopLogo name={summary.name} src={logo} size="md" />
              <ShopLogo name={summary.name} src={null} size="sm" />
              <ShopLogo name={summary.name} src={null} isLoading size="lg" />
            </div>
          </KitSection>

          <KitSection
            title="Status logo"
            library="composition"
            path="packages/ui/src/compositions/status-logo.tsx"
            usedIn="storefront top bar, kit"
          >
            <StatusLogos name={summary.name} logo={logo} />
          </KitSection>

          <KitSection
            title="Cart button"
            library="composition"
            path="packages/ui/src/compositions/cart-button.tsx"
            usedIn="storefront top bar (1024 px up), storefront dock, kit"
          >
            <CartButtons />
          </KitSection>

          <KitSection
            title="Stamp card"
            library="composition"
            path="packages/ui/src/compositions/stamp-card.tsx"
            usedIn="storefront Home, Rewards, Join done, kit"
          >
            <StampCards prizePhoto={imageSources(`demo:${slug}/items/${shop.item}`, ORIGIN)} />
          </KitSection>

          <KitSection
            title="Code with resend"
            library="composition"
            path="packages/ui/src/compositions/otp-resend.tsx"
            usedIn="storefront Join (email code), kit"
          >
            <OtpResends />
          </KitSection>

          <KitSection
            title="Product card"
            library="composition"
            path="packages/ui/src/compositions/product-card.tsx"
            usedIn="storefront Menu, Home best sellers and favourites rows, kit"
          >
            <ProductCards shop={shop} />
          </KitSection>

          <KitSection
            title="Heart toggle"
            library="composition"
            path="packages/ui/src/compositions/heart-toggle.tsx"
            usedIn="storefront product card and item sheet, kit"
          >
            <HeartToggles photo={imageSources(`demo:${slug}/items/${shop.item}`, ORIGIN)} />
          </KitSection>

          <KitSection
            title="Empty state"
            library="composition"
            path="packages/ui/src/compositions/empty-state.tsx"
            usedIn="storefront basket, Menu search and favourites, receipt not found, My orders, Rewards, Account, offline page, kit"
          >
            <EmptyStates />
          </KitSection>

          <KitSection
            title="Info list"
            library="composition"
            path="packages/ui/src/compositions/info-list.tsx"
            usedIn="storefront Shop info sheet and Home info card, privacy notice contact, kit"
          >
            <div id="kit-info-list">
              <InfoLists />
            </div>
          </KitSection>

          <KitSection
            title="Brand panel"
            library="composition"
            path="packages/ui/src/compositions/brand-panel.tsx"
            usedIn="kit"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <BrandPanel
                name={summary.name}
                tagline="Fresh every day, ordered from your phone."
                logo={logo}
              />
              <BrandPanel name="A new shop with a very long name that keeps going" logo={null} />
            </div>
          </KitSection>

          <KitSection
            title="Banner carousel"
            library="composition"
            path="packages/ui/src/compositions/banner-carousel.tsx (+ banner-carousel-slides.tsx, lazy)"
            usedIn="kit"
          >
            <div className="space-y-6">
              <BannerCarousel
                slides={banners}
                seconds={5}
                labels={BANNER_LABELS}
                assetOrigin={ORIGIN}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <figure className="space-y-1">
                  <BannerCarousel
                    slides={banners.slice(0, 1)}
                    labels={BANNER_LABELS}
                    assetOrigin={ORIGIN}
                  />
                  <figcaption className="text-xs text-muted-foreground">
                    One banner: no carousel code
                  </figcaption>
                </figure>
                <figure className="space-y-1">
                  <BannerCarousel
                    slides={[
                      { src: null, alt: 'Missing banner', fallbackIcon: shop.icon },
                      ...banners.slice(1),
                    ]}
                    labels={BANNER_LABELS}
                    assetOrigin={ORIGIN}
                  />
                  <figcaption className="text-xs text-muted-foreground">
                    First banner missing: tile
                  </figcaption>
                </figure>
              </div>
            </div>
          </KitSection>

          <KitSection
            title="Count up (Number Ticker)"
            library="composition · Magic UI"
            path="packages/ui/src/compositions/count-up.tsx · components/number-ticker.tsx"
            usedIn="kit"
          >
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <CountUp value={7} className="text-4xl font-bold" />
                <p className="text-xs text-muted-foreground">
                  CountUp (final number under reduced motion)
                </p>
              </div>
              <div>
                <NumberTicker value={1234} className="text-4xl font-bold text-current" />
                <p className="text-xs text-muted-foreground">Number Ticker as installed</p>
              </div>
            </div>
          </KitSection>

          <KitSection
            title="Celebrate (canvas-confetti) · Confetti"
            library="composition · Magic UI"
            path="packages/ui/src/compositions/celebrate.ts · components/confetti.tsx"
            usedIn="kit"
          >
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={(event) =>
                  void stampBurst({
                    x: event.clientX / window.innerWidth,
                    y: event.clientY / window.innerHeight,
                  })
                }
              >
                stampBurst()
              </Button>
              <Button variant="outline" onClick={() => void rewardReady()}>
                rewardReady()
              </Button>
            </div>
            <div className="relative h-32 overflow-hidden rounded-lg border bg-card">
              <Confetti
                className="absolute inset-0 size-full"
                manualstart={false}
                globalOptions={{ disableForReducedMotion: true, resize: true }}
              />
              <p className="relative p-3 text-xs text-muted-foreground">
                Magic UI Confetti canvas (fires once on load)
              </p>
            </div>
          </KitSection>

          <KitSection
            title="Grid pattern"
            library="Magic UI"
            path="packages/ui/src/components/grid-pattern.tsx"
            usedIn="brand-panel, kit"
          >
            <div className="relative h-32 overflow-hidden rounded-lg border bg-shop-30">
              <GridPattern
                width={24}
                height={24}
                className="fill-shop-10/10 stroke-shop-10/20"
                squares={[
                  [2, 1],
                  [5, 2],
                  [8, 1],
                ]}
              />
            </div>
          </KitSection>

          <KitSection
            title="Add to Cart"
            library="Opensource UI (copy)"
            path="packages/ui/src/vendor/opensource-ui/add-to-cart.tsx"
            usedIn="kit"
          >
            <div className="flex flex-wrap gap-3">
              <AddToCartButton
                label="Add · ₱289"
                loadingLabel="Adding…"
                addedLabel="Added to basket"
              />
              <AddToCartButton
                label="Add · ₱12,345.50"
                loadingLabel="Adding…"
                addedLabel="Added to basket"
              />
            </div>
          </KitSection>

          <KitSection
            title="Thermal Receipt"
            library="Opensource UI (copy)"
            path="packages/ui/src/vendor/opensource-ui/thermal-receipt.tsx"
            usedIn="kit"
          >
            <div className="max-w-xs py-2">
              <ThermalReceiptCard
                storeName={summary.name.toUpperCase()}
                storeAddress={summary.city}
                orderId="#0042"
                date="25 OCT 2026 · 12:31 PM"
                items={[
                  { key: '1', name: '2 × Classic Smash', price: '₱378' },
                  { key: '2', name: '1 × Kanto Fries', price: '₱89' },
                  { key: '3', name: '1 × House Iced Tea', price: '₱55' },
                ]}
                subtotalLabel="Subtotal"
                subtotal="₱522"
                totalLabel="TOTAL"
                total="₱571"
                footer="ORDER SLIP · NOT AN OFFICIAL RECEIPT"
                code={
                  <QRCode
                    value="https://shop.webserbisyo.com/kanto-smash/o/demo-completed"
                    size={72}
                  >
                    <QRCodeSvg />
                  </QRCode>
                }
              />
            </div>
          </KitSection>

          <KitSection
            title="Like Toggle"
            library="Opensource UI (copy)"
            path="packages/ui/src/vendor/opensource-ui/like-toggle.tsx"
            usedIn="kit; its burst plays in the heart toggle"
          >
            <div className="flex gap-3">
              <LikeButton
                label="Add to favourites"
                likedLabel="Remove from favourites"
                count={128}
              />
              <LikeButton
                label="Add to favourites"
                likedLabel="Remove from favourites"
                defaultLiked
                count={12}
              />
            </div>
          </KitSection>

          <KitSection
            title="Storefront dock"
            library="composition"
            path="packages/ui/src/compositions/storefront-dock.tsx"
            usedIn="storefront shell (phone and tablet), kit"
          >
            <DockStates />
          </KitSection>

          <KitSection
            title="Motion utilities"
            library="globals.css"
            path="packages/ui/src/styles/globals.css · lib/reveal-clip.ts · hooks/use-reduced-motion.ts"
            usedIn="kit"
          >
            <MotionDemos />
          </KitSection>

          <KitShopProvider slug={slug}>
            <RedesignPrimitiveSections />
          </KitShopProvider>
        </div>
      </ShopTheme>
    </div>
  );
}
