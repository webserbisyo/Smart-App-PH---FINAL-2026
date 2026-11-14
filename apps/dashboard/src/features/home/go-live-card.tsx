import { CheckIcon, ChevronRightIcon, HourglassIcon, RocketIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import {
  canAskToGoLive,
  errorWords,
  formatManila,
  goLiveWords,
  PLAN_TRIAL_DAYS,
  type OnboardingStep,
  type OwnerOnboarding,
} from '@smartapp/core';
import { errorCodeOf, useAskToGoLive } from '@smartapp/data';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@smartapp/ui/components/item';
import { Status, StatusIndicator, StatusLabel } from '@smartapp/ui/components/status';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from 'cn';
import { useOnlineStatus } from '@/app/use-online-status';
import { CARD } from './home-card.js';

const W = goLiveWords;

function StepLink({
  step,
  ...props
}: { step: OnboardingStep['step'] } & Pick<React.ComponentProps<'a'>, 'className' | 'children'>) {
  switch (step) {
    case 'items':
      return <Link {...props} to="/catalog" />;
    case 'look':
      return <Link {...props} to="/editor" />;
    case 'hours':
      return <Link {...props} to="/settings/hours" />;
    case 'payments':
      return <Link {...props} to="/settings/payments" />;
  }
}

/**
 * Going live (decision T89): a new shop sets up at once, then asks; the founder checks it and turns the
 * link on. The free days start then, not at sign-up.
 */
export function GoLiveCard({ onboarding }: { onboarding: OwnerOnboarding }) {
  const ask = useAskToGoLive();
  const action = useAsyncAction();
  const online = useOnlineStatus();
  const done = onboarding.steps.filter((s) => s.done).length;
  const asked = onboarding.stage === 'asked';
  const ready = canAskToGoLive(onboarding.stage, onboarding.steps);

  return (
    <section
      aria-labelledby="go-live-title"
      className={cn(CARD, 'gap-4 border-primary/30 bg-primary/5')}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <RocketIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="go-live-title" className="text-base font-bold">
              {W.title}
            </h2>
            {asked ? (
              <Status variant="warning">
                <StatusIndicator />
                <StatusLabel className="flex items-center gap-1">
                  <HourglassIcon className="size-3.5" aria-hidden="true" />
                  {W.waiting}
                </StatusLabel>
              </Status>
            ) : (
              <span className="text-sm text-muted-foreground tabular-nums">
                {W.progress(done, onboarding.steps.length)}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {asked && onboarding.askedAt
              ? W.asked(formatManila(onboarding.askedAt, 'datetime'))
              : W.settingUp}
          </p>
        </div>
      </div>
      {asked ? null : (
        <ol className="grid gap-2 sm:grid-cols-2">
          {onboarding.steps.map((s) => (
            <li key={s.step}>
              <Item
                variant="outline"
                className={cn('h-full min-h-12 bg-card', s.done && 'bg-muted/40')}
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
                    {W.steps[s.step]}
                  </ItemTitle>
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                </ItemActions>
              </Item>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{W.trialNote(PLAN_TRIAL_DAYS)}</p>
        {asked ? null : (
          <AsyncButton
            status={action.status}
            busyLabel={W.asking}
            doneLabel={W.ask}
            disabled={!online || !ready}
            className="h-11 font-semibold md:h-9"
            onClick={() =>
              void action
                .run(async () => {
                  await ask.mutateAsync();
                  notify({ title: W.sent, tone: 'success' });
                })
                .catch((err: unknown) =>
                  notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }),
                )
            }
          >
            <RocketIcon aria-hidden="true" />
            {W.ask}
          </AsyncButton>
        )}
      </div>
    </section>
  );
}
