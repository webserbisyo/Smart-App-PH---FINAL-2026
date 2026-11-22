'use client';

import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';

export interface QrViewerProps {
  readonly src: string;
  readonly alt: string;
  readonly title: string;
  readonly onClose: () => void;
}

/** The payment QR as big as the screen allows, on white, so another phone can scan it (T107). */
export function QrViewer({ src, alt, title, onClose }: QrViewerProps) {
  return (
    <ResponsiveDialog open onOpenChange={(open) => !open && onClose()} title={title}>
      <div className="flex justify-center rounded-2xl bg-paper p-3">
        <img
          src={src}
          alt={alt}
          decoding="async"
          className="aspect-square max-h-vh-70 w-full max-w-md object-contain"
        />
      </div>
    </ResponsiveDialog>
  );
}
