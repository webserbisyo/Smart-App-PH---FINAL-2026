import { SearchIcon, XIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@smartapp/ui/components/input-group';
import { cn } from 'cn';

export interface SearchFieldProps {
  id?: string | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  clearLabel: string;
  // The visible label lives elsewhere: this names the field for screen readers.
  ariaLabel?: string | undefined;
  className?: string | undefined;
}

/**
 * Search with a clear button, built from the installed shadcn Input Group (decision T43), so every
 * dashboard search looks and behaves the same.
 */
export function SearchField({
  id,
  value,
  onChange,
  placeholder,
  clearLabel,
  ariaLabel,
  className,
}: SearchFieldProps) {
  return (
    <InputGroup className={cn('h-11 rounded-xl bg-card md:h-9', className)}>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        value={value}
        autoComplete="off"
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="text-base md:text-sm"
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            aria-label={clearLabel}
            className="size-11 text-muted-foreground hover:text-foreground md:size-8"
            onClick={() => onChange('')}
          >
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
