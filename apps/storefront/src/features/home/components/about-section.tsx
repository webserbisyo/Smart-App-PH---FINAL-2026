'use client';

import { useState } from 'react';
import { words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

export interface AboutSectionProps {
  about: string;
}

export function AboutSection({ about }: AboutSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!about.trim()) return null;

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <h2 className="text-base font-semibold text-foreground">
        {words.storefrontShell.home.about}
      </h2>
      <p
        className={`text-sm whitespace-pre-line text-muted-foreground ${
          isExpanded ? '' : 'line-clamp-4'
        }`}
      >
        {about}
      </p>
      <div className="pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>
            {isExpanded ? words.storefrontShell.home.showLess : words.storefrontShell.home.showMore}
          </span>
          {isExpanded ? (
            <ChevronUpIcon className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="size-3.5" aria-hidden="true" />
          )}
        </Button>
      </div>
    </section>
  );
}
