import { createElement } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRightIcon, CircleAlertIcon } from 'lucide-react';
import { settingsWords } from '@smartapp/core';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@smartapp/ui/components/item';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { cn } from 'cn';
import { SETTINGS_GROUPS, SETTINGS_SECTIONS } from '../sections.js';
import type { StatusTone } from '../status.js';
import { useSectionStatuses } from '../use-status.js';

const TONE_TEXT: Record<StatusTone, string> = {
  ok: 'text-muted-foreground',
  warning: 'text-warning-text',
  danger: 'text-destructive-text',
};

// Every section in its group, with one line on what is set now (decision T64). Phones open this
// list; laptops show it beside the sub-menu until a section is picked.
export function SettingsIndexScreen() {
  const statusOf = useSectionStatuses();

  return (
    <div className="flex min-h-full flex-col pb-24">
      <PageHeader title={settingsWords.title} />
      <nav
        aria-label={settingsWords.sections}
        className="flex w-full max-w-3xl flex-col gap-6 px-4 pt-3 md:px-6 md:pt-6"
      >
        {SETTINGS_GROUPS.map((group) => (
          <section
            key={group.id}
            aria-labelledby={`settings-group-${group.id}`}
            className="flex flex-col gap-2"
          >
            <h2
              id={`settings-group-${group.id}`}
              className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
            >
              {group.label}
            </h2>
            <ItemGroup className="overflow-hidden rounded-xl border border-border bg-card">
              {SETTINGS_SECTIONS.filter((s) => s.group === group.id).map((section, index) => {
                const status = statusOf(section.id);
                return (
                  <Item
                    key={section.id}
                    render={createElement(Link, { to: section.to })}
                    className={cn(
                      'min-h-16 rounded-none border-0 px-4 hover:bg-muted/60',
                      index > 0 && 'border-t border-border',
                    )}
                  >
                    <ItemMedia
                      variant="icon"
                      className="size-10 rounded-lg bg-primary/10 text-primary [&_svg]:size-5"
                    >
                      {createElement(section.icon)}
                    </ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle>{section.label}</ItemTitle>
                      {status ? (
                        <ItemDescription
                          className={cn('flex items-center gap-1 truncate', TONE_TEXT[status.tone])}
                        >
                          {status.tone !== 'ok' ? (
                            <CircleAlertIcon className="size-3.5 shrink-0" aria-hidden />
                          ) : null}
                          <span className="truncate">{status.line}</span>
                        </ItemDescription>
                      ) : (
                        <Skeleton className="h-3.5 w-40" />
                      )}
                    </ItemContent>
                    <ItemActions>
                      <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                    </ItemActions>
                  </Item>
                );
              })}
            </ItemGroup>
          </section>
        ))}
        <p className="px-1 text-xs text-muted-foreground">{settingsWords.elsewhere}</p>
      </nav>
    </div>
  );
}
