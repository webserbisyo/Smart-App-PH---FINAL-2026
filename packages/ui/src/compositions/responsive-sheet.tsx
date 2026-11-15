import * as React from 'react';
import type { ReactNode } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@smartapp/ui/components/drawer';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@smartapp/ui/components/sheet';
import { cn } from 'cn';
import { useFormFactor } from '../hooks/use-form-factor';
import { cssVars } from '../lib/css-vars';
import { ScrollHint } from './scroll-hint';

export interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Names the panel for screen readers; the visible header comes from `header`.
  title: string;
  description?: string | undefined;
  // Pinned above the scrolling body (the order's receipt header).
  header?: ReactNode;
  // Pinned below the scrolling body (the next-step button).
  footer?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
}

// Phones (T93): the panel opens full height, drags down to half, and down again to close.
const PHONE_SNAPS = [0.5, 1];
const FULL = 1;
type SnapPoint = number | string | null;

/**
 * A side panel that keeps the page behind it: the installed Sheet from the right on tablet and laptop, the
 * installed Drawer from the bottom on phones (same pairing as ResponsiveDialog). Header and footer stay put
 * while the body scrolls, so the main action is always in reach. On phones the Drawer's own snap points give
 * it a full and a half height (T93); at half, the bottom bar rises with it and the body gets room underneath.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  header,
  footer,
  children,
  className,
}: ResponsiveSheetProps) {
  const formFactor = useFormFactor();
  const phone = formFactor === 'phone';
  const [snap, setSnap] = React.useState<SnapPoint>(FULL);
  // Every opening starts full height.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSnap(FULL);
  }

  // The body says when more is hidden below (T77): a fade, "More below", a thin scrollbar for a mouse.
  const body = (
    <ScrollHint className={phone ? 'drawer-snap-room' : undefined}>{children}</ScrollHint>
  );
  const foot = footer ? (
    <div
      className={cn(
        'shrink-0 border-t bg-popover px-4 py-3 pb-safe',
        phone && 'relative z-10 drawer-snap-lift',
      )}
    >
      {footer}
    </div>
  ) : null;

  if (phone) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        showSwipeHandle
        snapPoints={PHONE_SNAPS}
        // A quick flick stops at half first instead of closing.
        snapToSequentialPoints
        snapPoint={snap}
        onSnapPointChange={(next) => setSnap(next)}
      >
        <DrawerContent
          className={cn('overflow-hidden pt-safe', className)}
          style={cssVars({
            '--drawer-content-max-height': '100dvh',
            // How far below the screen the panel's bottom sits at this stop (Base UI's own offset does
            // not reach children), so the bar and the body can make up for it.
            '--sheet-lift':
              typeof snap === 'number' && snap < FULL ? `${(FULL - snap) * 100}dvh` : '0px',
          })}
        >
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          {description ? (
            <DrawerDescription className="sr-only">{description}</DrawerDescription>
          ) : null}
          {header}
          {body}
          {foot}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          'gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md data-[side=right]:lg:max-w-lg',
          className,
        )}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {description ? (
          <SheetDescription className="sr-only">{description}</SheetDescription>
        ) : null}
        {header}
        {body}
        {foot}
      </SheetContent>
    </Sheet>
  );
}
