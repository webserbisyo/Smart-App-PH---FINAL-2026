import type * as React from 'react';
import { CheckIcon, ChevronRightIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { homeWords, type HomeSetupStepState, type SetupStep } from '@smartapp/core';
import {
  CircularProgress,
  CircularProgressIndicator,
  CircularProgressRange,
  CircularProgressTrack,
  CircularProgressValueText,
} from '@smartapp/ui/components/circular-progress';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
  ItemDescription,
} from '@smartapp/ui/components/item';
import { cn } from 'cn';
import { CARD } from './home-card.js';

const W = homeWords.setup;

function StepLink({
  step,
  ...props
}: { step: SetupStep } & Pick<React.ComponentProps<'a'>, 'className' | 'children'>) {
  switch (step) {
    case 'items':
      return <Link {...props} to="/catalog" />;
    case 'look':
      return <Link {...props} to="/editor" />;
    case 'hours':
      return <Link {...props} to="/settings/hours" />;
    case 'payments':
      return <Link {...props} to="/settings/payments" />;
    case 'stamp_card':
      return <Link {...props} to="/members/stamp-card" />;
    case 'first_order':
      return <Link {...props} to="/orders" />;
  }
}

/** The new-shop checklist (T69): a ring, then one row per step that opens the right place. */
export function SetupCard({
  steps,
  activeItems,
}: {
  steps: readonly HomeSetupStepState[];
  activeItems: number;
}) {
  const done = steps.filter((s) => s.done).length;
  return (
    <section aria-labelledby="setup-title" className={cn(CARD, 'gap-4')}>
      <div className="flex items-center gap-4">
        <CircularProgress
          value={done}
          max={steps.length}
          size={64}
          thickness={6}
          getValueText={() => W.progress(done, steps.length)}
          aria-label={W.title}
          className="shrink-0"
        >
          <CircularProgressIndicator>
            <CircularProgressTrack className="text-muted" />
            <CircularProgressRange className="text-primary duration-slow" />
          </CircularProgressIndicator>
          <CircularProgressValueText
            aria-hidden="true"
            className="text-sm font-extrabold text-foreground tabular-nums"
          >
            {`${done}/${steps.length}`}
          </CircularProgressValueText>
        </CircularProgress>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="setup-title" className="text-base font-bold">
            {W.title}
          </h2>
          <p className="text-sm text-muted-foreground">{W.progress(done, steps.length)}</p>
        </div>
      </div>
      <ol className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((s) => (
          <li key={s.step}>
            <Item
              variant="outline"
              className={cn('h-full min-h-14', s.done && 'bg-muted/40')}
              render={<StepLink step={s.step} />}
            >
              <ItemMedia
                className={cn(
                  'size-7 rounded-full border-2',
                  s.done
                    ? 'border-success bg-success text-success-foreground'
                    : 'border-dashed border-border',
                )}
              >
                {s.done ? (
                  <CheckIcon className="size-4" aria-label={W.doneAria} />
                ) : (
                  <span className="sr-only">{W.todoAria}</span>
                )}
              </ItemMedia>
              <ItemContent>
                <ItemTitle className={cn(s.done && 'text-muted-foreground line-through')}>
                  {W.steps[s.step].title}
                </ItemTitle>
                <ItemDescription>{W.steps[s.step].hint(activeItems)}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              </ItemActions>
            </Item>
          </li>
        ))}
      </ol>
    </section>
  );
}
