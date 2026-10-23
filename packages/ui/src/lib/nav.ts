import type { ReactElement, ReactNode } from 'react';
import { useRender } from '@base-ui/react/use-render';

// One navigation entry, shared by the sidebar, dock, nav drawer and page tabs.
// `link` is an element from the app (TanStack Link, Next Link, or a button for
// actions); packages/ui never imports a router.
export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  link: ReactElement;
  active: boolean;
  count?: number | undefined;
}

export function countLabel(count: number): string {
  return count > 99 ? '99+' : String(count);
}

// Renders the item's link with our props merged in; the link keeps its own
// href/to and handlers.
export function useNavLink(
  item: NavItem,
  props: { className: string; children: ReactNode; onClick?: (() => void) | undefined },
): ReactElement {
  return useRender({
    render: item.link,
    props: {
      className: props.className,
      onClick: props.onClick,
      'aria-current': item.active ? 'page' : undefined,
      children: props.children,
    },
    // Adds data-active, so styles use the `data-active:` variant.
    state: { active: item.active },
  });
}
