import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { useRender } from '@base-ui/react/use-render';
import type { ImageSources } from '@smartapp/core/media';
import { Avatar, AvatarGroup } from '@smartapp/ui/components/avatar';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { useKeyboardOpen } from '../hooks/use-keyboard-open';
import { countLabel, useNavLink, type NavItem } from '../lib/nav';
import { dockSlotClass } from './bottom-dock';
import { ShopImage } from './shop-image';

export interface DockCart {
  count: number;
  totalLabel: string;
  // First lines' photos; null shows the shop-coloured tile.
  thumbs: readonly (ImageSources | null)[];
  // The app's button that opens the basket.
  link: ReactElement;
  // Spoken label, e.g. "Basket, 3 items, ₱345".
  label: string;
}

export interface StorefrontDockProps {
  label: string;
  // Up to 4: Home, Menu or Products, Rewards (when the stamp card is on), Orders.
  items: readonly NavItem[];
  cart: DockCart | null;
}

// Sizes the segment needs, in px (see cartThumbCount).
const SLOT_MIN = 44;
const GAP = 4;
const DOCK_PAD = 4;
const SEGMENT_PAD = 24;
const BADGE = 20;
const SEGMENT_GAP = 8;
const CHAR = 7;
const THUMB = 32;
const THUMB_STEP = 20;

/**
 * How many basket thumbnails (0 to 3) fit next to the tabs without wrapping: a long total
 * (₱12,345.50) or a narrow phone drops them one by one.
 */
export function cartThumbCount(input: {
  dockWidth: number;
  items: number;
  totalLabel: string;
  thumbs: number;
}): number {
  const slots = input.items * (SLOT_MIN + GAP) + DOCK_PAD * 2;
  const segment = SEGMENT_PAD + BADGE + SEGMENT_GAP + input.totalLabel.length * CHAR;
  const room = input.dockWidth - slots - segment;
  for (let n = Math.min(3, input.thumbs); n > 0; n--) {
    if (THUMB + (n - 1) * THUMB_STEP + SEGMENT_GAP <= room) return n;
  }
  return 0;
}

function StorefrontDockSlot({ item }: { item: NavItem }) {
  return useNavLink(item, {
    className: dockSlotClass,
    children: (
      <>
        <span className="relative flex h-7 w-10 items-center justify-center rounded-full transition-colors group-data-active/slot:bg-shop-10-soft group-data-active/slot:text-foreground">
          <span aria-hidden="true" className="flex *:size-5">
            {item.icon}
          </span>
        </span>
        <span className="max-w-full truncate leading-tight">{item.label}</span>
      </>
    ),
  });
}

function CartSegment({ cart, thumbs }: { cart: DockCart; thumbs: number }): ReactNode {
  return useRender({
    render: cart.link,
    props: {
      'aria-label': cart.label,
      className:
        'pressable flex h-14 shrink-0 items-center gap-2 overflow-hidden rounded-full bg-shop-10 px-3 text-shop-10-foreground outline-none transition-[max-width] duration-base ease-standard focus-visible:ring-2 focus-visible:ring-ring max-w-80 starting:max-w-0',
      children: (
        <>
          {thumbs > 0 ? (
            <AvatarGroup className="-space-x-3" aria-hidden="true">
              {cart.thumbs.slice(0, thumbs).map((src, i) => (
                <Avatar key={i} className="size-8 rounded-md bg-card after:rounded-md">
                  <ShopImage src={src} alt="" ratio="1:1" sizes="32px" className="size-8" />
                </Avatar>
              ))}
            </AvatarGroup>
          ) : null}
          <Badge size="sm" radius="full" variant="invert" className="tabular" aria-hidden="true">
            {countLabel(cart.count)}
          </Badge>
          <span className="text-sm font-semibold whitespace-nowrap tabular" aria-hidden="true">
            {cart.totalLabel}
          </span>
        </>
      ),
    },
  });
}

// Floating pill for the storefront on phones and tablets: tabs, plus a cart segment that grows in
// when the basket has items (decision N30). Router- and breakpoint-agnostic like BottomDock (the app
// hides it from 1024 px, where the top bar takes over); hidden while the keyboard is open.
export function StorefrontDock({ label, items, cart }: StorefrontDockProps) {
  const keyboardOpen = useKeyboardOpen();
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const thumbs = cart
    ? cartThumbCount({
        dockWidth: width,
        items: items.length,
        totalLabel: cart.totalLabel,
        thumbs: cart.thumbs.length,
      })
    : 0;

  return (
    <nav
      ref={ref}
      aria-label={label}
      data-slot="storefront-dock"
      data-keyboard={keyboardOpen ? 'open' : 'closed'}
      className="fixed inset-x-4 dock-pill z-dock mx-auto flex items-center gap-1 rounded-full border border-border bg-card px-1 shadow-lg keyboard-open:hidden"
    >
      {items.map((item) => (
        <StorefrontDockSlot key={item.id} item={item} />
      ))}
      {cart && cart.count > 0 ? <CartSegment cart={cart} thumbs={thumbs} /> : null}
    </nav>
  );
}
