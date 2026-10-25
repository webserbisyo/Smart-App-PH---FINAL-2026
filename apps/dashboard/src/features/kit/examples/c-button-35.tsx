'use client';

import { useState } from 'react';

import { Button } from '@smartapp/ui/components/button';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react';

export function Pattern() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Button variant="ghost" onClick={() => setIsExpanded(!isExpanded)}>
      {isExpanded ? 'Show less' : 'Show more'}
      {isExpanded ? <ChevronUpIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}
    </Button>
  );
}
