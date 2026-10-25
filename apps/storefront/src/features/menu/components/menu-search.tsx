'use client';

import { words } from '@smartapp/core';
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
  // "search" so Home's search pill (/menu#search) lands on it.
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isPending?: boolean;
  className?: string | undefined;
}

/**
 * Menu search (c-input-group-37: search icon and clear button; c-input-group-15: spinner while
 * filtering). 44 px tall, 16 px text, a round pill on the glass bar.
 */
export function MenuSearch({
  id,
  placeholder,
  value,
  onChange,
  isPending,
  className,
}: MenuSearchProps) {
  return (
    <Field className={className}>
      <InputGroup className="h-11 rounded-full bg-card shadow-xs">
        <InputGroupAddon align="inline-start" className="pl-4">
          <SearchIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        </InputGroupAddon>

        <InputGroupInput
          id={id}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={placeholder}
          aria-label={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="text-base [&::-webkit-search-cancel-button]:hidden"
        />

        {isPending ? (
          <InputGroupAddon align="inline-end" className="pr-4">
            <Spinner className="size-4 text-muted-foreground" />
          </InputGroupAddon>
        ) : value.length > 0 ? (
          <InputGroupAddon align="inline-end" className="pr-1.5">
            <InputGroupButton
              aria-label={words.storefrontShell.menu.clearSearch}
              size="icon-sm"
              variant="ghost"
              className="size-8 rounded-full"
              onClick={() => onChange('')}
            >
              <XIcon className="size-4" aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </Field>
  );
}
