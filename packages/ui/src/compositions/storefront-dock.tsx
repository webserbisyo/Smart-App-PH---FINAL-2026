import { useState, type ReactNode } from 'react';
import { useKeyboardOpen } from '../hooks/use-keyboard-open';
import { cssVars } from '../lib/css-vars';
import { useNavLink, type NavItem } from '../lib/nav';

export interface StorefrontDockProps {
  label: string;
  // Up to 4: Home, Menu or Products, Rewards (when the stamp card is on), Orders.
  items: readonly NavItem[];
  // The round cart button beside the pill (CartButton, dock variant); leave out with an empty basket.
  cart?: ReactNode;
}

// Each tab takes the same width, icon over a short label, so nothing changes size on a switch. The
// active tab's icon gives one small pop; its colour follows the pill sliding underneath.
function StorefrontDockSlot({ item }: { item: NavItem }) {
  return useNavLink(item, {
    className:
      'group/slot pressable relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-muted-foreground outline-none transition-colors duration-base ease-standard focus-visible:ring-2 focus-visible:ring-ring data-active:text-shop-10-foreground',
    children: (
      <>
        <span aria-hidden="true" className="flex shrink-0 *:size-5 group-data-active/slot:dock-pop">
          {item.icon}
        </span>
        <span className="max-w-full truncate text-xs font-semibold">{item.label}</span>
      </>
    ),
  });
}

// The active tab's place, kept while no tab is active (Account, Join) so the pill fades out and back
// in where it was instead of sliding in from the left edge.
function useIndicatorIndex(items: readonly NavItem[]): { index: number; shown: boolean } {
  const active = items.findIndex((item) => item.active);
  const [last, setLast] = useState(Math.max(active, 0));
  if (active >= 0 && active !== last) setLast(active);
  return { index: active >= 0 ? active : last, shown: active >= 0 };
}

// Floating glass pill for the storefront on phones and tablets (composition C7, decisions R5, R6 and
// R20): equal tabs with one shop-colour pill that slides behind the active one (CSS transform only),
// and the cart as its own round button that slides in beside the pill when the basket has items.
// Router- and breakpoint-agnostic like BottomDock (the app hides it from 1024 px, where the top bar
// takes over); hidden while the keyboard is open.
export function StorefrontDock({ label, items, cart }: StorefrontDockProps) {
  const keyboardOpen = useKeyboardOpen();
  const { index, shown } = useIndicatorIndex(items);
  return (
    <div
      data-slot="storefront-dock"
      data-keyboard={keyboardOpen ? 'open' : 'closed'}
      className="fixed inset-x-4 dock-pill z-dock mx-auto flex items-center gap-2 keyboard-open:hidden"
    >
      <nav
        aria-label={label}
        className="flex h-full min-w-0 flex-1 rounded-full border glass p-1.5 shadow-lg"
      >
        <div className="relative flex h-full min-w-0 flex-1 items-center">
          <span
            aria-hidden="true"
            data-shown={shown ? '' : undefined}
            className="absolute inset-y-0 left-0 dock-indicator rounded-full bg-shop-10 opacity-0 shadow-sm data-shown:opacity-100"
            style={cssVars({ '--dock-tabs': Math.max(items.length, 1), '--dock-index': index })}
          />
          {items.map((item) => (
            <StorefrontDockSlot key={item.id} item={item} />
          ))}
        </div>
      </nav>
      {cart ? (
        <div className="flex shrink-0 transition-all duration-base ease-spring starting:scale-50 starting:opacity-0">
          {cart}
        </div>
      ) : null}
    </div>
  );
}
