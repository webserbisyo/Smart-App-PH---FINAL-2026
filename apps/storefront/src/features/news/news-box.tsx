'use client';

import { useId } from 'react';
import { shopNewsWords } from '@smartapp/core';
import { useNewsChoice, useOnline, useSetNewsChoice } from '@smartapp/data';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { notify } from '@smartapp/ui/compositions/notify';

const W = shopNewsWords;

/**
 * Shop news, yes or no, for this phone (decision T106, P5): always unticked until the customer ticks it.
 * Used on Join and under Notify me on an order's page; both load late, so it stays out of first JS (T31).
 */
export function NewsBox({ slug, place }: { slug: string; place: 'join' | 'order' }) {
  const id = useId();
  const choice = useNewsChoice(slug);
  const save = useSetNewsChoice(slug);
  const online = useOnline();
  const checked = choice.data?.news ?? false;

  function handleChange(next: boolean) {
    save.mutate(next, {
      onSuccess: () => {
        // Join says it once the form is sent; the order page answers the tap at once.
        if (place === 'order') notify({ title: next ? W.boxOn : W.boxOff, tone: 'success' });
      },
      onError: () => notify({ title: W.offline, tone: 'error' }),
    });
  }

  return (
    <Field orientation="horizontal" className="items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        disabled={choice.isPending || save.isPending || !online}
        onCheckedChange={(next) => handleChange(next)}
        aria-describedby={`${id}-help`}
        className="mt-0.5 size-5 border-muted-foreground"
      />
      <FieldContent>
        <FieldLabel htmlFor={id} className="text-base font-medium">
          {place === 'join' ? W.joinBox : W.box}
        </FieldLabel>
        <FieldDescription id={`${id}-help`}>
          {place === 'join' ? W.joinHelp : W.boxHelp}
        </FieldDescription>
      </FieldContent>
    </Field>
  );
}
