import * as React from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@smartapp/ui/components/input-group';
import { catalogWords } from '@smartapp/core';
import { cn } from 'cn';

export interface PesoInputProps {
  id?: string | undefined;
  value: number;
  onChange: (centavos: number) => void;
  className?: string | undefined;
  'aria-label'?: string | undefined;
  disabled?: boolean | undefined;
  // Shown while empty, e.g. the automatic price behind a special price field.
  placeholder?: string | undefined;
  // The phone keyboard's Enter key label, e.g. "next" inside the item editor.
  enterKeyHint?: 'next' | 'done' | undefined;
}

/** "₱149" style text for an input: whole pesos stay whole, centavos keep two places. */
export function pesoText(centavos: number): string {
  if (centavos === 0) return '';
  return centavos % 100 === 0 ? String(centavos / 100) : (centavos / 100).toFixed(2);
}

/** Parses what the owner typed into centavos; null while the text is not a price yet. */
export function parsePeso(text: string): number | null {
  const trimmed = text.trim().replace(/,/g, '');
  if (trimmed === '') return 0;
  if (!/^\d{1,6}(\.\d{0,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

// A price field in pesos that hands back integer centavos; half-typed text ("12.") stays on screen.
export function PesoInput({
  id,
  value,
  onChange,
  className,
  disabled,
  placeholder,
  enterKeyHint,
  'aria-label': ariaLabel,
}: PesoInputProps) {
  const [text, setText] = React.useState(() => pesoText(value));
  const [lastValue, setLastValue] = React.useState(value);

  // A new value from outside (a preset, "same price for all") replaces what is shown.
  if (value !== lastValue) {
    setLastValue(value);
    if (parsePeso(text) !== value) setText(pesoText(value));
  }

  return (
    <InputGroup className={cn('h-11 bg-card md:h-9', className)}>
      <InputGroupAddon>₱</InputGroupAddon>
      <InputGroupInput
        id={id}
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint={enterKeyHint}
        aria-label={ariaLabel}
        disabled={disabled}
        placeholder={placeholder ?? catalogWords.pricePlaceholder}
        className="tabular"
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          const parsed = parsePeso(next);
          if (parsed === null) return;
          setText(next);
          setLastValue(parsed);
          onChange(parsed);
        }}
        onBlur={() => setText(pesoText(value))}
      />
    </InputGroup>
  );
}
