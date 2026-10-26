'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@smartapp/ui/components/button';
import { cn } from '@smartapp/ui/lib/utils';
import { CopyIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { DrawnCheckIcon } from './drawn-check';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  className?: string;
  // A round icon button; the label is read out only.
  iconOnly?: boolean;
}

const COPIED_MS = 1500;

/**
 * Pattern c-button-41: copies the text, then turns green for 1.5 s with a check that pops in and draws
 * itself (decision R43). Each tap starts it again; the word "Copied" is announced.
 */
export function CopyButton({ textToCopy, label, className, iconOnly = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      // Clipboard write failed: nothing to show.
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    // A new number each tap remounts the check, so it draws again.
    setCopied((n) => n + 1);
    timer.current = setTimeout(() => setCopied(0), COPIED_MS);
  }

  const isCopied = copied > 0;
  const text = isCopied ? words.checkout.copied : (label ?? words.checkout.copy);

  return (
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? 'icon' : 'sm'}
      aria-label={text}
      onClick={handleCopy}
      data-copied={isCopied ? '' : undefined}
      className={cn(
        'transition-colors duration-base data-copied:border-success/40 data-copied:bg-success-soft data-copied:text-success-soft-foreground',
        className,
      )}
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
        {isCopied ? words.checkout.copied : ''}
      </span>
    </Button>
  );
}
