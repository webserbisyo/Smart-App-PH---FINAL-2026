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

/**
 * A side panel that keeps the page behind it: the installed Sheet from the right on tablet and laptop, the
 * installed Drawer from the bottom on phones (same pairing as ResponsiveDialog). Header and footer stay put
 * while the body scrolls, so the main action is always in reach.
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

  // The body says when more is hidden below (T77): a fade, "More below", a thin scrollbar for a mouse.
  const body = <ScrollHint>{children}</ScrollHint>;
  const foot = footer ? (
    <div className="shrink-0 border-t bg-popover px-4 py-3 pb-safe">{footer}</div>
  ) : null;

  if (formFactor === 'phone') {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent className={cn('max-h-vh-92 overflow-hidden', className)}>
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
