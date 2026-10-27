'use client';

import type { ReactNode } from 'react';
import { words } from '@smartapp/core';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@smartapp/ui/components/alert-dialog';
import { Button } from '@smartapp/ui/components/button';
import { useFocusOnArrival } from '../../shell/use-when-idle';

const W = words.account;

export interface SignOutConfirmProps {
  readonly buttonId: string;
  readonly buttonClassName: string;
  readonly children: ReactNode;
  readonly pending: boolean;
  readonly onConfirm: () => void;
  // Sign out was tapped before this had loaded: ask at once, and keep keyboard focus on the button.
  readonly openNow: boolean;
  readonly focused: boolean;
}

/** Sign out with a confirm (c-alert-dialog-2), loaded once the page is idle (decision R49). */
export function SignOutConfirm({
  buttonId,
  buttonClassName,
  children,
  pending,
  onConfirm,
  openNow,
  focused,
}: SignOutConfirmProps) {
  const trigger = useFocusOnArrival<HTMLButtonElement>(focused);

  return (
    <AlertDialog defaultOpen={openNow}>
      <AlertDialogTrigger
        render={
          <Button ref={trigger} id={buttonId} variant="outline" className={buttonClassName} />
        }
      >
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{W.signOutTitle}</AlertDialogTitle>
          <AlertDialogDescription>{W.signOutBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">{W.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
            className="h-11"
          >
            {W.signOut}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
