'use client';

import { useSyncExternalStore, type ReactNode, type Ref } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@smartapp/ui/components/input-otp';

const LENGTH = 6;

export interface OtpResendProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  // Called once all 6 digits are in (typed or pasted).
  onComplete?: ((value: string) => void) | undefined;
  label: string;
  // "We sent a code to j***@example.com." and the Spam hint.
  sentLine: ReactNode;
  hint: string;
  // When Resend unlocks (ISO); null = now.
  resendAt: string | null;
  onResend: () => void;
  resendLabel: string;
  resendInLabel: (seconds: number) => string;
  resending?: boolean | undefined;
  error?: string | null | undefined;
  disabled?: boolean | undefined;
  inputRef?: Ref<HTMLInputElement> | undefined;
  className?: string | undefined;
}

// A shared one-second clock, so the Resend countdown never reads the time during render.
function subscribeSeconds(listener: () => void): () => void {
  const timer = setInterval(listener, 1000);
  return () => clearInterval(timer);
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function secondsLeft(resendAt: string | null, now: number): number {
  if (!resendAt || now === 0) return 0;
  return Math.max(0, Math.floor(new Date(resendAt).getTime() / 1000) - now);
}

/**
 * The 6-digit email code with a timed Resend (composition from the c-input-otp-6 pattern): one box per
 * digit, paste fills all, the phone suggests the code (one-time-code), Resend unlocks after its countdown.
 */
export function OtpResend({
  id,
  value,
  onChange,
  onComplete,
  label,
  sentLine,
  hint,
  resendAt,
  onResend,
  resendLabel,
  resendInLabel,
  resending = false,
  error,
  disabled = false,
  inputRef,
  className,
}: OtpResendProps) {
  const now = useSyncExternalStore(subscribeSeconds, nowSeconds, () => 0);
  const left = secondsLeft(resendAt, now);

  const errorId = `${id}-error`;
  return (
    <Field data-invalid={error ? 'true' : undefined} className={cn('gap-3', className)}>
      <div className="flex flex-col gap-1 text-sm">
        <p>{sentLine}</p>
        <FieldDescription>{hint}</FieldDescription>
      </div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputOTP
        id={id}
        {...(inputRef ? { ref: inputRef } : {})}
        maxLength={LENGTH}
        value={value}
        onChange={onChange}
        {...(onComplete ? { onComplete } : {})}
        inputMode="numeric"
        pattern="^[0-9]+$"
        autoComplete="one-time-code"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        containerClassName="w-full justify-center"
      >
        {/* Six boxes share the width on a 360 px phone (never wider than 48 px, 52 from 640 px). */}
        <InputOTPGroup className="w-full justify-center gap-1.5 sm:gap-2">
          {Array.from({ length: LENGTH }, (_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              aria-invalid={Boolean(error)}
              className="h-12 max-w-12 min-w-0 flex-1 rounded-xl border text-xl font-semibold first:rounded-xl last:rounded-xl sm:h-13 sm:max-w-13"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {error ? (
        <p id={errorId} role="alert" className="text-center text-sm text-destructive-text">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        onClick={onResend}
        disabled={left > 0 || resending || disabled}
        className="h-11 gap-2 self-center rounded-full px-4"
      >
        <RefreshCwIcon aria-hidden="true" className={cn('size-4', resending && 'animate-spin')} />
        <span className="tabular">{left > 0 ? resendInLabel(left) : resendLabel}</span>
      </Button>
    </Field>
  );
}
