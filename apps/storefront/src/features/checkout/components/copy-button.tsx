'use client';

import { useState } from 'react';
import { Button } from '@smartapp/ui/components/button';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { words } from '@smartapp/core';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  className?: string;
  // A round icon button; the label is read out only.
  iconOnly?: boolean;
}

/** Pattern c-button-41: Copies text to clipboard and toggles Check icon for 1.5s. */
export function CopyButton({ textToCopy, label, className, iconOnly = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write failed
    }
  }

  const text = copied ? words.checkout.copied : (label ?? words.checkout.copy);

  return (
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? 'icon' : 'sm'}
      aria-label={text}
      onClick={handleCopy}
      className={className}
    >
      {copied ? (
        <CheckIcon aria-hidden="true" className="text-success" />
      ) : (
        <CopyIcon aria-hidden="true" />
      )}
      {iconOnly ? null : <span>{text}</span>}
    </Button>
  );
}
