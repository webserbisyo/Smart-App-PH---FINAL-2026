import { CheckIcon } from 'lucide-react';
import { editorWords, errorWords, type EditorChange } from '@smartapp/core';
import { errorCodeOf } from '@smartapp/data';
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
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { changeText } from './change-text.js';

const P = editorWords.publish;
const D = editorWords.discard;

/** Publish shows what will change before it goes live (rule E2). */
export function PublishDialog({
  open,
  onOpenChange,
  changes,
  onPublish,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: EditorChange[];
  onPublish: () => Promise<void>;
}) {
  const action = useAsyncAction();
  const publish = async () => {
    try {
      await action.run(onPublish);
      onOpenChange(false);
      notify({ title: P.done, tone: 'success' });
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!action.busy) onOpenChange(next);
      }}
      title={P.title(changes.length)}
      description={P.body}
    >
      <ul className="flex flex-col gap-2 py-2">
        {changes.map((change, i) => (
          <li key={`${change.kind}-${i}`} className="flex items-start gap-2 text-sm">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            <span className="min-w-0">{changeText(change)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          className="h-11 md:h-9"
          disabled={action.busy}
          onClick={() => onOpenChange(false)}
        >
          {P.keep}
        </Button>
        <AsyncButton
          className="h-11 font-semibold md:h-9"
          status={action.status}
          busyLabel={P.busy}
          doneLabel={P.published}
          onClick={() => void publish()}
        >
          {P.confirm}
        </AsyncButton>
      </div>
    </ResponsiveDialog>
  );
}

export function DiscardDialog({
  open,
  onOpenChange,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => Promise<void>;
}) {
  const action = useAsyncAction();
  const discard = async () => {
    try {
      await action.run(onDiscard);
      onOpenChange(false);
      notify({ title: D.done, tone: 'success' });
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{D.title}</AlertDialogTitle>
          <AlertDialogDescription>{D.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 md:h-9">{D.keep}</AlertDialogCancel>
          <AsyncButton
            variant="destructive"
            className="h-11 font-semibold md:h-9"
            status={action.status}
            busyLabel={D.busy}
            doneLabel={D.discarded}
            onClick={() => void discard()}
          >
            {D.confirm}
          </AsyncButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
