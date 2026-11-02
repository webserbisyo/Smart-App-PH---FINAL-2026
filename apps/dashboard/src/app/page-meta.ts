import { useMatches } from '@tanstack/react-router';
import { words, type ShopKind } from '@smartapp/core';
import { useShop } from './shop.js';

// Paths a sub-page can go back to.
export type ParentPath = '/orders' | '/catalog' | '/members' | '/settings';

export interface PageMeta {
  title: (kind: ShopKind) => string;
  parent?: { to: ParentPath; title: (kind: ShopKind) => string } | undefined;
  // A full-screen edit page: the phone dock steps aside so the Save bar and keyboard have the room.
  hideDock?: boolean | undefined;
}

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    page?: PageMeta;
  }
}

// Title and parent of the deepest matched route, for the top bar and document.title.
export function usePageMeta(): {
  title: string;
  parent: { to: ParentPath; title: string } | undefined;
  hideDock: boolean;
} {
  const { kind } = useShop();
  const matches = useMatches();
  const page = [...matches].reverse().find((match) => match.staticData.page)?.staticData.page;
  return {
    title: page?.title(kind) ?? words.appName,
    parent: page?.parent ? { to: page.parent.to, title: page.parent.title(kind) } : undefined,
    hideDock: page?.hideDock === true,
  };
}
