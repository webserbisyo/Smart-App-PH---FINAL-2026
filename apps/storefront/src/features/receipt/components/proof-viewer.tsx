'use client';

import { words } from '@smartapp/core';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';

export interface ProofViewerProps {
  // The photo to show bigger; null keeps the dialog closed.
  readonly src: string | null;
  readonly onClose: () => void;
}

/** The proof photo, bigger. Loads once the page is idle, only on orders with a proof (decision R49). */
export function ProofViewer({ src, onClose }: ProofViewerProps) {
  const T = words.receipt.thread;
  return (
    <ResponsiveDialog
      open={src !== null}
      onOpenChange={(open) => !open && onClose()}
      title={T.proofDialog}
    >
      <div className="flex flex-col items-center justify-center p-2">
        {src ? (
          <img
            src={src}
            alt={T.proofDialog}
            decoding="async"
            className="max-h-vh-70 w-auto max-w-full rounded-lg object-contain"
          />
        ) : null}
      </div>
    </ResponsiveDialog>
  );
}
