import { ShoppingBagIcon, SlidersHorizontalIcon, StampIcon, type LucideIcon } from 'lucide-react';
import {
  imageSources,
  samplesWords,
  srcsetUrls,
  type ImageSources,
  type PublicShop,
} from '@smartapp/core';
import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { buttonVariants } from '@smartapp/ui/components/button';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';
import { cn } from '@smartapp/ui/lib/utils';

const W = samplesWords;
// The shop's logo shape, as the shop logo part draws it.
const LOGO_RADIUS = { circle: 'rounded-full', rounded: 'rounded-lg' } as const;
const COVER_SIZES = '(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw';

/**
 * A sample shop's photo drawn on the server, with no JavaScript: the same picture markup as ShopImage, without
 * its broken-photo fallback (the sample photos ship with the app). ShopImage and ShopLogo are client parts, and
 * using them outside a shop split the shop pages' shared code and pushed Join past its 300 KB budget (T109).
 */
function StaticPhoto({
  src,
  sizes,
  priority,
  className,
}: {
  src: ImageSources | null;
  sizes: string;
  priority: boolean;
  className: string;
}) {
  if (!src) return <AspectRatio ratio={16 / 9} className="bg-shop-10-soft" />;
  const largest = srcsetUrls(src.webp).at(-1) ?? '';
  return (
    <picture className="contents">
      {src.avif ? <source type="image/avif" srcSet={src.avif} sizes={sizes} /> : null}
      <source type="image/webp" srcSet={src.webp} sizes={sizes} />
      <img
        src={largest}
        alt=""
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={cn('object-cover', className)}
      />
    </picture>
  );
}

/**
 * What this sample shows best, read from the shop itself so every shop gets the same three lines: the
 * choices on its first item that has some, its stamp card, and how customers get their order.
 */
function highlightsOf(shop: PublicShop): Array<{ icon: LucideIcon; text: string }> {
  const withChoices = shop.catalog.items.find((item) => item.axes.length > 0);
  const card = shop.storefront.stampCard;
  return [
    ...(withChoices
      ? [
          {
            icon: SlidersHorizontalIcon,
            text: W.choices(withChoices.axes.map((a) => a.name).join(' and ')),
          },
        ]
      : []),
    ...(card.status === 'off'
      ? []
      : [{ icon: StampIcon, text: W.stamps(card.rule.stampsNeeded, card.reward.title) }]),
    {
      icon: ShoppingBagIcon,
      text: shop.storefront.orderTypes.map((t) => W.orderTypes[t]).join(' · '),
    },
  ];
}

/**
 * One sample shop on the Sample shops page (T109): its cover with the logo over the edge, name, tagline and
 * what it shows best, in the shop's own colour. Open the shop goes to its storefront; See the owner side opens
 * the dashboard as its owner, only where the sample sign-in works (development and preview builds).
 */
export function SampleCard({
  slug,
  shop,
  ownerHref,
  priority,
}: {
  slug: string;
  shop: PublicShop;
  ownerHref: string | null;
  priority: boolean;
}) {
  const { info, look } = shop.storefront;
  const cover = look.banners[0];
  return (
    <ShopTheme brandColor={look.brandColor} surface="light" fontPair={look.fontPair}>
      <Card className="h-full gap-0 overflow-hidden p-0">
        <div className="relative">
          <StaticPhoto
            src={imageSources(cover?.ref)}
            sizes={COVER_SIZES}
            priority={priority}
            className="block aspect-video w-full"
          />
          <span
            className={cn(
              'absolute -bottom-8 left-4 flex size-16 overflow-hidden bg-shop-10 ring-4 ring-card',
              LOGO_RADIUS[look.logoShape],
            )}
          >
            <StaticPhoto
              src={imageSources(info.logo)}
              sizes="64px"
              priority={priority}
              className="size-full"
            />
          </span>
        </div>
        <CardContent className="flex flex-1 flex-col gap-3 px-4 pt-11 pb-4">
          <div className="flex flex-col gap-1">
            <h3 className="font-heading text-lg leading-snug font-bold">{info.name}</h3>
            {info.tagline ? <p className="text-sm text-muted-foreground">{info.tagline}</p> : null}
          </div>
          <ul className="flex flex-col gap-1.5 text-sm">
            {highlightsOf(shop).map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2">
                <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-shop-10-text" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-2 pt-1">
            <a
              href={`/${slug}`}
              aria-label={W.openLabel(info.name)}
              className={buttonVariants({
                size: 'lg',
                className:
                  'h-11 bg-shop-10 text-shop-10-foreground hover-hover:hover:bg-shop-10/90',
              })}
            >
              {W.open}
            </a>
            {ownerHref ? (
              <a
                href={ownerHref}
                aria-label={W.ownerLabel(info.name)}
                className={buttonVariants({ size: 'lg', variant: 'outline', className: 'h-11' })}
              >
                {W.owner}
              </a>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </ShopTheme>
  );
}
