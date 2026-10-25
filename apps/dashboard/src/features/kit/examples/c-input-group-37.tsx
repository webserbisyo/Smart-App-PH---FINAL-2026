// ReUI c-input-group-37 without its status popover (ref/storefront-components.md: "search + clear; drop its popover").
import { useState } from 'react';

import { Field } from '@smartapp/ui/components/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@smartapp/ui/components/input-group';
import { SearchIcon, XIcon } from 'lucide-react';

export function Pattern() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Field className="max-w-sm">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <SearchIcon aria-hidden="true" />
        </InputGroupAddon>

        <InputGroupInput
          placeholder="Search the menu"
          aria-label="Search the menu"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />

        {searchQuery.length > 0 ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Clear search"
              size="icon-xs"
              variant="ghost"
              onClick={() => setSearchQuery('')}
            >
              <XIcon aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </Field>
  );
}
