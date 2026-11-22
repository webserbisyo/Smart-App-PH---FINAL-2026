import { useState, type ReactNode } from 'react';
import { EllipsisIcon } from 'lucide-react';
import { Badge } from '@smartapp/ui/components/badge';
import { useKeyboardOpen } from '../hooks/use-keyboard-open';
import { countLabel, useNavLink, type NavItem } from '../lib/nav';
import { NavDrawer } from './nav-drawer';

export interface BottomDockProps {
  label: string;
  // Up to 5 items, or 4 when `more` is set (3 when `action` is set too).
  items: readonly NavItem[];
  more?: { label: string; items: readonly NavItem[] } | undefined;
  // The page's one main action in the middle of the dock (T111: New order): a lifted round button
  // with its word under it, after the first `actionAfter` items.
  action?: NavItem | undefined;
  actionAfter?: number | undefined;
}

// Shared by every slot and the More button.
export const dockSlotClass =
  'group/slot pressable relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-xs font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring data-active:text-foreground';

function SlotContent({
  icon,
  label,
  count,
}: {
  icon: ReactNode;
  label: string;
  count?: number | undefined;
}) {
  return (
    <>
      <span className="relative flex h-7 w-12 items-center justify-center rounded-full transition-colors group-data-active/slot:bg-accent group-data-active/slot:text-primary">
        <span aria-hidden="true" className="flex *:size-5">
          {icon}
        </span>
        {count !== undefined && count > 0 ? (
          <Badge className="absolute -top-1 -right-2 h-4 min-w-4 px-1 tabular">
            {countLabel(count)}
          </Badge>
        ) : null}
      </span>
      <span className="max-w-full truncate leading-tight">{label}</span>
    </>
  );
}

function DockAction({ item }: { item: NavItem }) {
  return useNavLink(item, {
    className:
      'group/action pressable relative flex h-14 min-w-0 flex-1 flex-col items-center justify-end gap-0.5 rounded-full text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
    children: (
      <>
        <span
          aria-hidden="true"
          className="-mt-6 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground elevation-md ring-4 ring-background transition-transform duration-fast *:size-6 group-active/action:scale-95 motion-reduce:transition-none"
        >
          {item.icon}
        </span>
        <span className="max-w-full truncate leading-tight">{item.label}</span>
      </>
    ),
  });
}

function DockSlot({ item }: { item: NavItem }) {
  return useNavLink(item, {
    className: dockSlotClass,
    children: <SlotContent icon={item.icon} label={item.label} count={item.count} />,
  });
}

// Floating pill navigation for phones. Hidden while the on-screen keyboard is
// open; it never hides on scroll.
export function BottomDock({ label, items, more, action, actionAfter = 2 }: BottomDockProps) {
  const keyboardOpen = useKeyboardOpen();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = more?.items.some((item) => item.active) ?? false;

  return (
    <>
      <nav
        aria-label={label}
        data-slot="bottom-dock"
        data-keyboard={keyboardOpen ? 'open' : 'closed'}
        className="fixed inset-x-4 dock-pill z-30 mx-auto flex items-center gap-1 rounded-full border border-border frost px-1 elevation-md keyboard-open:hidden"
      >
        {items.slice(0, action ? actionAfter : items.length).map((item) => (
          <DockSlot key={item.id} item={item} />
        ))}
        {action ? <DockAction item={action} /> : null}
        {action
          ? items.slice(actionAfter).map((item) => <DockSlot key={item.id} item={item} />)
          : null}
        {more ? (
          <button
            type="button"
            className={dockSlotClass}
            data-active={moreActive ? '' : undefined}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
          >
            <SlotContent icon={<EllipsisIcon />} label={more.label} />
          </button>
        ) : null}
      </nav>
      {more ? (
        <NavDrawer
          title={more.label}
          items={more.items}
          open={moreOpen}
          onOpenChange={setMoreOpen}
        />
      ) : null}
    </>
  );
}
