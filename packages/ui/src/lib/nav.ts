import type { ComponentType, ReactNode } from 'react';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: ComponentType<{ className?: string }> | undefined;
  badge?: number | undefined;
  isActive?: boolean | undefined;
  disabled?: boolean | undefined;
  onClick?: (() => void) | undefined;
  renderLink?:
    | ((props: {
        href: string;
        className: string;
        children: ReactNode;
        'aria-current'?: 'page' | undefined;
        onClick?: (() => void) | undefined;
      }) => ReactNode)
    | undefined;
}
