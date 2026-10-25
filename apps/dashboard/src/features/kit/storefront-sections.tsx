import { useState } from 'react';
import { GiftIcon, HouseIcon, ReceiptTextIcon, UtensilsIcon } from 'lucide-react';
import {
  contrastRatio,
  DEMO_SHOPS,
  imageSources,
  shopPalette,
  words,
  type DemoShopSlug,
  type IconKey,
} from '@smartapp/core';
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
import { ShopImage, type ShopImageRatio } from '@smartapp/ui/compositions/shop-image';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';
import { StorefrontDock } from '@smartapp/ui/compositions/storefront-dock';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { startReveal } from '@smartapp/ui/lib/reveal-clip';
import { AddToCartButton } from '@smartapp/ui/vendor/opensource-ui/add-to-cart';
import { LikeButton } from '@smartapp/ui/vendor/opensource-ui/like-toggle';
import { ThermalReceiptCard } from '@smartapp/ui/vendor/opensource-ui/thermal-receipt';
import { env } from '@/app/env';
import { KitSection } from './kit-section.js';

// Demo photos live in the storefront's public folder; the kit loads them from there.
const ORIGIN = env.VITE_STOREFRONT_URL;

interface KitShop {
  slug: DemoShopSlug;
  item: string;
  icon: IconKey;
}

const KIT_SHOPS: readonly KitShop[] = [
  { slug: 'kanto-smash', item: 'classic-smash', icon: 'burger' },
  { slug: 'aqualinis', item: 'refill-purified', icon: 'water_gallon' },
  { slug: 'tala-apparel', item: 'tala-basic-tee-sand', icon: 'tshirt' },
  { slug: 'kape-juan', item: 'spanish-latte', icon: 'coffee' },
  { slug: 'lola-remy', item: 'classic-pandesal', icon: 'bread' },
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

function PaletteSwatches({ brandColor }: { brandColor: string }) {
  const palette = shopPalette(brandColor);
  const pairs = [
    {
      name: 'shop-60',
      bg: 'bg-shop-60',
      fg: 'text-foreground',
      ratio: contrastRatio(palette.shop60, 'oklch(0.145 0 0)'),
    },
    {
      name: 'shop-30',
      bg: 'bg-shop-30',
      fg: 'text-foreground',
      ratio: contrastRatio(palette.shop30, 'oklch(0.145 0 0)'),
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
      name: 'shop-10-soft',
      bg: 'bg-shop-10-soft',
      fg: 'text-foreground',
      ratio: contrastRatio(palette.shop10Soft, 'oklch(0.145 0 0)'),
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

// 0, 1, 3 and 9 items, and a ₱12,345.50 total at phone widths (decision N30).
function DockStates({ shop }: { shop: KitShop }) {
  const photo = imageSources(`demo:${shop.slug}/items/${shop.item}`, ORIGIN);
  const states = [
    { label: 'Empty basket (no cart segment)', count: 0, total: '₱0', width: 'max-w-sm' },
    { label: '1 item', count: 1, total: '₱189', width: 'max-w-sm' },
    { label: '3 items', count: 3, total: '₱567', width: 'max-w-sm' },
    { label: '9 items, ₱12,345.50 at 390 px', count: 9, total: '₱12,345.50', width: 'max-w-97.5' },
    { label: '9 items, ₱12,345.50 at 360 px', count: 9, total: '₱12,345.50', width: 'max-w-90' },
  ];
  return (
    <div id="kit-dock" className="flex flex-col gap-4">
      {states.map((s) => (
        <div key={s.label} className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{s.label}</span>
          <div
            className={`relative h-24 w-full ${s.width} transform-gpu overflow-hidden rounded-xl border border-border bg-muted`}
          >
            <StorefrontDock
              label="Demo"
              items={DOCK_TABS}
              cart={{
                count: s.count,
                totalLabel: s.total,
                thumbs: Array.from({ length: Math.min(3, s.count) }, () => photo),
                link: <button type="button" />,
                label: `Basket, ${s.count} items, ${s.total}`,
              }}
            />
          </div>
        </div>
      ))}
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

      <ShopTheme brandColor={summary.brandColor}>
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
            <PaletteSwatches brandColor={summary.brandColor} />
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
            usedIn="kit only"
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
            <DockStates shop={shop} />
          </KitSection>

          <KitSection
            title="Motion utilities"
            library="globals.css"
            path="packages/ui/src/styles/globals.css · lib/reveal-clip.ts · hooks/use-reduced-motion.ts"
            usedIn="kit"
          >
            <MotionDemos />
          </KitSection>
        </div>
      </ShopTheme>
    </div>
  );
}
