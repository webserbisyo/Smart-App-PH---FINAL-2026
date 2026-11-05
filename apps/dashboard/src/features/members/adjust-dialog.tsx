import * as React from 'react';
import {
  errorWords,
  MANUAL_REASONS,
  membersWords,
  words,
  type ManualReason,
  type MemberDetail,
} from '@smartapp/core';
import { errorCodeOf, useAdjustStamps } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldLabel } from '@smartapp/ui/components/field';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Textarea } from '@smartapp/ui/components/textarea';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';

const W = membersWords.adjust;
const DIRECTIONS = ['add', 'remove'] as const;
type Direction = (typeof DIRECTIONS)[number];

/** Adjust…: ±1 with a reason and a private note (M6); the 3-a-day limit and "never below 0" on the server. */
export function AdjustDialog({
  member,
  open,
  onOpenChange,
}: {
  member: MemberDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const adjust = useAdjustStamps();
  const action = useAsyncAction();
  const [direction, setDirection] = React.useState<Direction>('add');
  const [reason, setReason] = React.useState<ManualReason>('correction');
  const [note, setNote] = React.useState('');

  // Closing starts the next Adjust fresh.
  const close = (next: boolean) => {
    if (!next) {
      setDirection('add');
      setReason('correction');
      setNote('');
    }
    onOpenChange(next);
  };

  const save = async () => {
    try {
      await action.run(() =>
        adjust.mutateAsync({
          customerId: member.id,
          delta: direction === 'add' ? 1 : -1,
          reason,
          note: note.trim() ? note.trim() : null,
        }),
      );
      notify({
        title: direction === 'add' ? membersWords.toast.added : membersWords.toast.removed,
        tone: 'success',
      });
      close(false);
    } catch (err) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={close} title={W.title} description={W.description}>
      <form
        className="flex flex-col gap-4 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field>
          <FieldLabel>{W.change}</FieldLabel>
          <RadioGroup
            value={direction}
            onValueChange={(value) => {
              const next = DIRECTIONS.find((d) => d === value);
              if (next) setDirection(next);
            }}
            className="grid grid-cols-2 gap-2"
          >
            {DIRECTIONS.map((d) => (
              <label
                key={d}
                htmlFor={`adjust-${d}`}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-sm font-medium"
              >
                <RadioGroupItem
                  value={d}
                  id={`adjust-${d}`}
                  disabled={d === 'remove' && member.balance === 0}
                />
                {d === 'add' ? W.add : W.remove}
              </label>
            ))}
          </RadioGroup>
        </Field>
        <Field>
          <FieldLabel>{W.reason}</FieldLabel>
          <RadioGroup
            value={reason}
            onValueChange={(value) => {
              const next = MANUAL_REASONS.find((r) => r === value);
              if (next) setReason(next);
            }}
            className="grid gap-2 sm:grid-cols-2"
          >
            {MANUAL_REASONS.map((r) => (
              <label
                key={r}
                htmlFor={`reason-${r}`}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-sm font-medium"
              >
                <RadioGroupItem value={r} id={`reason-${r}`} />
                {words.rewards.reason[r]}
              </label>
            ))}
          </RadioGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="adjust-note">{W.note}</FieldLabel>
          <Textarea
            id="adjust-note"
            value={note}
            maxLength={120}
            rows={2}
            placeholder={W.notePlaceholder}
            onChange={(e) => setNote(e.target.value)}
            className="text-base md:text-sm"
          />
        </Field>
        <p className="text-sm text-muted-foreground">
          {membersWords.panel.changesLeft(member.changesLeftToday)}
        </p>
        <ResponsiveDialogFooter>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => close(false)}
            >
              {W.cancel}
            </Button>
            <AsyncButton
              type="submit"
              status={action.status}
              busyLabel={W.saving}
              doneLabel={W.saved}
              disabled={member.changesLeftToday === 0}
              className="h-11 font-semibold md:h-9"
            >
              {W.save}
            </AsyncButton>
          </div>
        </ResponsiveDialogFooter>
      </form>
    </ResponsiveDialog>
  );
}
