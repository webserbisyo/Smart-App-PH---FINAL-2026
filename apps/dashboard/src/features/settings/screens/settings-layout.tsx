import { createElement } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { settingsWords } from '@smartapp/core';
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@smartapp/ui/components/item';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { SETTINGS_GROUPS, SETTINGS_SECTIONS } from '../sections.js';

// Laptop and tablet: the sections in their three groups on the left, the open section on the right.
// Phone: just the open page (the grouped list lives on /settings).
export function SettingsLayout() {
  const formFactor = useFormFactor();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (formFactor === 'phone') return <Outlet />;

  return (
    <div className="flex flex-1">
      <nav
        aria-label={settingsWords.sections}
        className="w-60 shrink-0 border-r border-border p-4 md:p-6"
      >
        <div className="sticky top-4 flex flex-col gap-5">
          {SETTINGS_GROUPS.map((group) => (
            <div key={group.id} className="flex flex-col gap-1">
              <p className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.label}
              </p>
              <ItemGroup className="gap-0.5">
                {SETTINGS_SECTIONS.filter((s) => s.group === group.id).map((section) => {
                  const active = pathname === section.to;
                  return (
                    <Item
                      key={section.id}
                      size="sm"
                      variant={active ? 'muted' : 'default'}
                      render={createElement(Link, {
                        to: section.to,
                        'aria-current': active ? 'page' : undefined,
                      })}
                      className="min-h-11"
                    >
                      <ItemMedia variant="icon">{createElement(section.icon)}</ItemMedia>
                      <ItemContent>
                        <ItemTitle>{section.label}</ItemTitle>
                      </ItemContent>
                    </Item>
                  );
                })}
              </ItemGroup>
            </div>
          ))}
        </div>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
