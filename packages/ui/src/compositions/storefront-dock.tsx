import type { ReactNode } from 'react';
import { useKeyboardOpen } from '../hooks/use-keyboard-open';
import { useNavLink, type NavItem } from '../lib/nav';

export interface StorefrontDockProps {
  label: string;
  // Up to 4: Home, Menu or Products, Rewards (when the stamp card is on), Orders.
  items: readonly NavItem[];
  // The round cart button beside the pill (CartButton, dock variant); leave out with an empty basket.
  cart?: ReactNode;
}

// Each tab is an icon in a 44 px round well; the active one grows into an icon and label capsule in
// the shop colour and takes the free width. Labels stay in the accessibility tree for every tab.
function StorefrontDockSlot({ item }: { item: NavItem }) {
  return useNavLink(item, {
    className:
      'group/slot pressable flex h-full min-w-0 shrink-0 grow-0 basis-11 items-center justify-center rounded-full outline-none transition-all duration-base ease-standard focus-visible:ring-2 focus-visible:ring-ring data-active:shrink data-active:grow',
    children: (
      <span className="flex h-11 w-full min-w-11 items-center justify-center gap-1.5 rounded-full bg-muted/70 text-muted-foreground transition-all duration-base ease-standard group-data-active/slot:bg-shop-10 group-data-active/slot:px-3 group-data-active/slot:text-shop-10-foreground">
        <span aria-hidden="true" className="flex shrink-0 *:size-5">
          {item.icon}
        </span>
        <span className="sr-only truncate text-sm font-semibold group-data-active/slot:not-sr-only">
          {item.label}
        </span>
      </span>
    ),
  });
}

// Floating glass pill for the storefront on phones and tablets (composition C7, decisions R5 and R6):
// the tabs, and the cart as its own round button that slides in beside the pill when the basket has
// items. Router- and breakpoint-agnostic like BottomDock (the app hides it from 1024 px, where the top
// bar takes over); hidden while the keyboard is open.
export function StorefrontDock({ label, items, cart }: StorefrontDockProps) {
  const keyboardOpen = useKeyboardOpen();
  return (
    <div
      data-slot="storefront-dock"
      data-keyboard={keyboardOpen ? 'open' : 'closed'}
      className="fixed inset-x-4 dock-pill z-dock mx-auto flex items-center gap-2 keyboard-open:hidden"
    >
      <nav
        aria-label={label}
        className="flex h-full min-w-0 flex-1 items-center gap-1 rounded-full border glass px-1.5 shadow-lg"
      >
        {items.map((item) => (
          <StorefrontDockSlot key={item.id} item={item} />
        ))}
      </nav>
      {cart ? (
        <div className="flex shrink-0 transition-all duration-base ease-spring starting:scale-50 starting:opacity-0">
          {cart}
        </div>
      ) : null}
    </div>
  );
}
