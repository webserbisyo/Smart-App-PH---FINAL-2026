import { createElement } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { words } from '@smartapp/core';
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@smartapp/ui/components/item';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { SETTINGS_SECTIONS } from '../sections.js';

// Desktop and tablet: the section sub-menu on the left, the open section on the
// right. Phone: just the open page (the list lives on /settings).
export function SettingsLayout() {
  const formFactor = useFormFactor();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (formFactor === 'phone') return <Outlet />;

  return (
    <div className="flex flex-1">
      <nav
        aria-label={words.screens.settings.sections}
        className="w-60 shrink-0 border-r border-border p-4 md:p-6"
      >
        <ItemGroup className="gap-1">
          {SETTINGS_SECTIONS.map((section) => {
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
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
