import * as React from 'react';
import { CheckIcon } from 'lucide-react';
import { Button } from '@smartapp/ui/components/button';
import { Spinner } from '@smartapp/ui/components/spinner';
import { cn } from 'cn';

export type AsyncStatus = 'idle' | 'loading' | 'success';

// How long the check shows before the page moves on or the button goes back to its verb.
const SUCCESS_HOLD_MS = 700;
const RESET_MS = 1500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Drives an AsyncButton (the c-button-44 pattern, decision T43): `run(task)` shows the spinner, then
 * the check for a moment, then resolves with the task's result so the caller can close or navigate.
 * A failed task goes back to idle and rethrows, so the caller words the error.
 */
export function useAsyncAction() {
  const [status, setStatus] = React.useState<AsyncStatus>('idle');
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = React.useCallback(async <T,>(task: () => Promise<T>): Promise<T> => {
    setStatus('loading');
    try {
      const result = await task();
      if (mounted.current) setStatus('success');
      await wait(SUCCESS_HOLD_MS);
      setTimeout(() => {
        if (mounted.current) setStatus('idle');
      }, RESET_MS);
      return result;
    } catch (err: unknown) {
      if (mounted.current) setStatus('idle');
      throw err;
    }
  }, []);

  return { status, run, busy: status !== 'idle' };
}

export interface AsyncButtonProps extends Omit<React.ComponentProps<typeof Button>, 'children'> {
  status: AsyncStatus;
  children: React.ReactNode;
  busyLabel: string;
  doneLabel: string;
}

/**
 * One button for every server action (c-button-44 pattern): verb, then spinner with "Saving", then a
 * check with "Saved". It keeps its width so nothing jumps, and screen readers hear each state.
 */
export function AsyncButton({
  status,
  children,
  busyLabel,
  doneLabel,
  disabled,
  className,
  ...props
}: AsyncButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled === true || status !== 'idle'}
      aria-busy={status === 'loading'}
      data-status={status}
      className={cn(
        'min-w-24',
        // A confirm that deletes is solid red, so it reads as the final step.
        props.variant === 'destructive' &&
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        status !== 'idle' && 'disabled:opacity-100',
        className,
      )}
    >
      <span aria-live="polite" className="contents">
        {status === 'loading' ? (
          <>
            <Spinner aria-hidden="true" />
            {busyLabel}
          </>
        ) : status === 'success' ? (
          <>
            <CheckIcon
              aria-hidden="true"
              className="motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-200"
            />
            {doneLabel}
          </>
        ) : (
          children
        )}
      </span>
    </Button>
  );
}
