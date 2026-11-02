import * as React from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { actionWords } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';

const COPIED_MS = 1500;

export interface CopyButtonProps extends Omit<
  React.ComponentProps<typeof Button>,
  'children' | 'onClick'
> {
  value: string;
  label?: string | undefined;
  // Called when the browser refuses to copy, so the caller can show the text to press and hold.
  onCopyFailed?: (() => void) | undefined;
}

/**
 * Copy with feedback in place (the c-button-41 pattern, decision T43): Copy icon, then a check and
 * "Copied" for 1.5 s, then back. No toast.
 */
export function CopyButton({ value, label, onCopyFailed, ...props }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      onCopyFailed?.();
    }
  };

  return (
    <Button {...props} onClick={() => void copy()}>
      <span aria-live="polite" className="contents">
        {copied ? (
          <CheckIcon
            aria-hidden="true"
            className="motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-200"
          />
        ) : (
          <CopyIcon aria-hidden="true" />
        )}
        {copied ? actionWords.copied : (label ?? actionWords.copy)}
      </span>
    </Button>
  );
}
