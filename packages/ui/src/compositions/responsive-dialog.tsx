import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@smartapp/ui/components/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@smartapp/ui/components/drawer';
import { useFormFactor } from '../hooks/use-form-factor';

export interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  // The body scrolls inside the sheet, so the corners stay round; end it with ResponsiveDialogFooter.
  scroll?: boolean | undefined;
}

/** The pinned bottom row of a scrolling ResponsiveDialog (Save), inside the form it submits. */
export function ResponsiveDialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 -mb-6 border-t bg-popover px-4 py-3 pb-safe sm:-mx-6 sm:px-6">
      {children}
    </div>
  );
}

// Overlays: Dialog on tablet and desktop, bottom Drawer on phone, same content.
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  scroll = false,
}: ResponsiveDialogProps) {
  const formFactor = useFormFactor();

  if (scroll) {
    const body = (
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-6 sm:px-6">
        {children}
      </div>
    );
    if (formFactor === 'phone') {
      return (
        <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
          <DrawerContent className="max-h-vh-92 overflow-hidden">
            <DrawerHeader className="pb-3">
              <DrawerTitle>{title}</DrawerTitle>
              {description ? <DrawerDescription>{description}</DrawerDescription> : null}
            </DrawerHeader>
            {body}
          </DrawerContent>
        </Drawer>
      );
    }
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-vh-85 flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b px-6 pt-5 pb-4">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  if (formFactor === 'phone') {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent className="max-h-[85vh] overflow-y-auto pb-safe">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description ? <DrawerDescription>{description}</DrawerDescription> : null}
          </DrawerHeader>
          <div className="px-4 pb-4">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
