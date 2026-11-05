import { membersWords } from '@smartapp/core';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Button } from '@smartapp/ui/components/button';
import type { RecentAsk } from './use-counter-actions.js';
import { agoLabel } from './when.js';

const W = membersWords.recent;

/** A second counter stamp within 2 minutes asks first (D2), so a double tap never double-stamps. */
export function RecentStampDialog({
  ask,
  now,
  busy,
  onConfirm,
  onClose,
}: {
  ask: RecentAsk | null;
  now: Date;
  busy: boolean;
  onConfirm: (ask: RecentAsk) => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={ask !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {W.title(ask?.at ? agoLabel(ask.at, now) : W.oneMinute)}
          </AlertDialogTitle>
          <AlertDialogDescription>{W.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 md:h-9">{W.cancel}</AlertDialogCancel>
          <Button
            className="h-11 md:h-9"
            disabled={busy || ask === null}
            onClick={() => {
              if (ask) onConfirm(ask);
            }}
          >
            {W.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
