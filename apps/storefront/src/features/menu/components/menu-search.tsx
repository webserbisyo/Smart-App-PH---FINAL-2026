'use client';

import { useId } from 'react';
import { Field } from '@smartapp/ui/components/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@smartapp/ui/components/input-group';
import { Spinner } from '@smartapp/ui/components/spinner';
import { SearchIcon, XIcon } from 'lucide-react';

export interface MenuSearchProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isPending?: boolean;
}

/**
 * Menu search bar using c-input-group-37 (search icon + clear button)
 * and c-input-group-15 (loading spinner while filtering).
 */
export function MenuSearch({ placeholder, value, onChange, isPending }: MenuSearchProps) {
  const inputId = useId();

  return (
    <Field className="w-full">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <SearchIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        </InputGroupAddon>

        <InputGroupInput
          id={inputId}
          placeholder={placeholder}
          aria-label={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />

        {isPending ? (
          <InputGroupAddon align="inline-end">
            <Spinner className="size-4 text-muted-foreground" />
          </InputGroupAddon>
        ) : value.length > 0 ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Clear search"
              size="icon-xs"
              variant="ghost"
              onClick={() => onChange('')}
            >
              <XIcon className="size-3.5" aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </Field>
  );
}
