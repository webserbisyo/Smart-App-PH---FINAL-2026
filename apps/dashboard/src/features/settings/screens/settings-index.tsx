import { createElement } from 'react';
import { Link, Navigate } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@smartapp/ui/components/item';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { SETTINGS_SECTIONS } from '../sections.js';

// Phone: a list of sections. Desktop and tablet: open Shop next to the sub-menu.
export function SettingsIndexScreen() {
  const formFactor = useFormFactor();
  if (formFactor !== 'phone') return <Navigate to="/settings/shop" replace />;

  return (
    <>
      <PageHeader title={words.screens.settings.title} />
      <nav aria-label={words.screens.settings.sections} className="p-4">
        <ItemGroup className="gap-2">
          {SETTINGS_SECTIONS.map((section) => (
            <Item
              key={section.id}
              variant="outline"
              render={createElement(Link, { to: section.to })}
              className="min-h-14"
            >
              <ItemMedia variant="icon">{createElement(section.icon)}</ItemMedia>
              <ItemContent>
                <ItemTitle>{section.label}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <ChevronRightIcon className="text-muted-foreground" />
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      </nav>
    </>
  );
}
