import { Link } from '@tanstack/react-router';
import { ArrowUpRightIcon } from 'lucide-react';
import { editorWords, type EditorSection } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { stampCardOff } from '../parts.js';
import type { PanelProps } from './types.js';

const W = editorWords.owned;

type OwnedSection = Extract<
  EditorSection,
  'rewards' | 'categories' | 'bestSellers' | 'favourites' | 'info' | 'membersCount'
>;

const OWNED: readonly EditorSection[] = [
  'rewards',
  'categories',
  'bestSellers',
  'favourites',
  'info',
  'membersCount',
];

export function isOwnedSection(section: EditorSection): section is OwnedSection {
  return OWNED.includes(section);
}

type OwnedLink = { label: string; to: '/members' | '/catalog' | '/settings/shop' } | null;

/**
 * Parts that come from another page (rule E9): the Editor only shows or hides them, and links to the page
 * that changes them.
 */
export function OwnedPanel({ section, shop, catalogName }: PanelProps & { section: OwnedSection }) {
  let text: string;
  let link: OwnedLink = null;
  switch (section) {
    case 'rewards':
      text = stampCardOff(shop) ? W.rewardsOff : W.rewards;
      link = { label: W.rewardsLink, to: '/members' };
      break;
    case 'categories':
      text = W.categories(catalogName);
      link = { label: W.catalogLink(catalogName), to: '/catalog' };
      break;
    case 'bestSellers':
      text = W.bestSellers(catalogName);
      link = { label: W.catalogLink(catalogName), to: '/catalog' };
      break;
    case 'favourites':
      text = W.favourites;
      break;
    case 'info':
      text = W.info;
      link = { label: W.infoLink, to: '/settings/shop' };
      break;
    case 'membersCount':
      text = W.membersCount;
      link = { label: editorWords.owned.rewardsLink, to: '/members' };
      break;
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">{text}</p>
      {link ? (
        <Button
          variant="outline"
          className="h-11 md:h-9"
          nativeButton={false}
          render={<Link to={link.to} />}
        >
          {link.label}
          <ArrowUpRightIcon />
        </Button>
      ) : null}
    </div>
  );
}
