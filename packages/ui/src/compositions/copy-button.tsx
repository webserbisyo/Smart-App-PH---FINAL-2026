'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { CopyIcon } from 'lucide-react';
import { cn } from 'cn';
import { actionWords, words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { copyText } from '@smartapp/ui/lib/copy-text';
import { notify } from '@smartapp/ui/compositions/notify';
import { DrawnCheckIcon } from '@smartapp/ui/compositions/drawn-check';

const COPIED_MS = 1500;

export interface CopyButtonProps extends Omit<
  ComponentProps<typeof Button>,
  'children' | 'onClick' | 'value'
> {
  value: string;
  // The visible word (and the name read out when iconOnly). Defaults to "Copy".
  label?: string | undefined;
  // A round icon button; the label is read out only.
  iconOnly?: boolean | undefined;
  // Called when copying fails; without it a toast says how to copy by hand.
  onCopyFailed?: (() => void) | undefined;
}

/**
 * The one copy button for both apps (c-button-41 pattern, decisions R43, T43, T45): copies through
 * copyText, then turns green for 1.5 s with a check that draws itself and the word "Copied". Each tap
 * starts it again; "Copied" is announced. Copying never fails silently.
 */
export function CopyButton({
  value,
  label,
  iconOnly = false,
  onCopyFailed,
  className,
  variant = 'outline',
  size,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function handleCopy() {
    if (!(await copyText(value))) {
      if (onCopyFailed) onCopyFailed();
      else notify({ title: words.checkout.copyFailed, tone: 'error' });
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    // A new number each tap remounts the check, so it draws again.
    setCopied((n) => n + 1);
    timer.current = setTimeout(() => setCopied(0), COPIED_MS);
  }

  const isCopied = copied > 0;
  const text = isCopied ? actionWords.copied : (label ?? actionWords.copy);

  return (
    <Button
      type="button"
      variant={variant}
      size={size ?? (iconOnly ? 'icon' : 'sm')}
      aria-label={iconOnly ? text : undefined}
      onClick={() => void handleCopy()}
      data-copied={isCopied ? '' : undefined}
      className={cn(
        'transition-colors duration-base data-copied:border-success/40 data-copied:bg-success-soft data-copied:text-success-soft-foreground',
        className,
      )}
      {...props}
    >
      {isCopied ? (
        <span
          key={copied}
          className="motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fade-in flex"
        >
          <DrawnCheckIcon />
        </span>
      ) : (
        <CopyIcon aria-hidden="true" />
      )}
      {iconOnly ? null : <span>{text}</span>}
      <span className="sr-only" aria-live="polite">
        {isCopied ? actionWords.copied : ''}
      </span>
    </Button>
  );
}
