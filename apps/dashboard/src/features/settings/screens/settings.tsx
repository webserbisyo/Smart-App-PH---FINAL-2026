import * as React from 'react';
import { useRouter } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { words } from '@smartapp/core';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemGroup,
} from '@smartapp/ui/components/item';
import { ChevronRightIcon } from 'lucide-react';
import type { NavItem } from '@smartapp/ui/lib/nav';

const SETTINGS_SECTIONS = [
  {
    id: 'shop',
    path: '/settings/shop',
    title: words.screens.settings.shopTitle,
    description: words.screens.settings.shopDescription,
  },
  {
    id: 'hours',
    path: '/settings/hours',
    title: words.screens.settings.hoursTitle,
    description: words.screens.settings.hoursDescription,
  },
  {
    id: 'ordering',
    path: '/settings/ordering',
    title: words.screens.settings.orderingTitle,
    description: words.screens.settings.orderingDescription,
  },
  {
    id: 'delivery',
    path: '/settings/delivery',
    title: words.screens.settings.deliveryTitle,
    description: words.screens.settings.deliveryDescription,
  },
  {
    id: 'payments',
    path: '/settings/payments',
    title: words.screens.settings.paymentsTitle,
    description: words.screens.settings.paymentsDescription,
  },
  {
    id: 'account',
    path: '/settings/account',
    title: words.screens.settings.accountTitle,
    description: words.screens.settings.accountDescription,
  },
] as const;

export function SettingsScreen() {
  return (
    <>
      <PageHeader
        title={words.screens.settings.title}
        description={words.screens.settings.description}
      />
      <div className="mx-auto w-full max-w-xl p-4 sm:p-6">
        <ItemGroup>
          {SETTINGS_SECTIONS.map((section) => (
            <Item key={section.id} render={<Link to={section.path} />} variant="outline">
              <ItemContent>
                <ItemTitle>{section.title}</ItemTitle>
                <ItemDescription>{section.description}</ItemDescription>
              </ItemContent>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </Item>
          ))}
        </ItemGroup>
      </div>
    </>
  );
}
