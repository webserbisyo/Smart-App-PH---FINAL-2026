import * as React from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@smartapp/ui/components/input-group';
import { catalogWords } from '@smartapp/core';
import { cn } from 'cn';
import { parsePeso, pesoText } from '../variants.js';

export interface PesoInputProps {
  id?: string | undefined;
  value: number;
  onChange: (centavos: number) => void;
  className?: string | undefined;
  'aria-label'?: string | undefined;
  disabled?: boolean | undefined;
  // Shown while empty, e.g. the automatic price behind a special price field.
  placeholder?: string | undefined;
}

// A price field in pesos that hands back integer centavos; half-typed text ("12.") stays on screen.
export function PesoInput({
  id,
  value,
  onChange,
  className,
  disabled,
  placeholder,
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
