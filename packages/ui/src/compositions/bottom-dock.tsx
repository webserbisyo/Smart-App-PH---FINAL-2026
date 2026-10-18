import * as React from 'react';
import { cn } from 'cn';
import { Badge } from '@smartapp/ui/components/badge';
import { useKeyboardOpen } from '../hooks/use-keyboard-open';
import type { NavItem } from '../lib/nav';

export interface BottomDockProps {
  items: readonly NavItem[];
  className?: string;
  hideOnKeyboard?: boolean;
}

export function BottomDock({ items, className, hideOnKeyboard = true }: BottomDockProps) {
  const isKeyboardOpen = useKeyboardOpen();

  if (hideOnKeyboard && isKeyboardOpen) {
    return null;
  }

  return (
    <nav
      aria-label="Bottom Navigation"
      data-slot="bottom-dock"
      className={cn(
        'fixed inset-x-3 dock-pill z-30 mx-auto flex items-center justify-around rounded-full border border-border bg-card/95 px-2 shadow-lg backdrop-blur-md',
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = Boolean(item.isActive);
        const ariaCurrent = isActive ? 'page' : undefined;

        const linkClassName = cn(
          'relative flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-center transition-colors pressable',
          isActive
            ? 'text-primary font-semibold'
            : 'text-muted-foreground hover:text-foreground active:text-foreground',
          item.disabled && 'pointer-events-none opacity-40',
        );

        const content = (
          <>
            <div className="relative flex items-center justify-center">
              {Icon && <Icon className="size-5 shrink-0" />}
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="text-2xs absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-bold text-primary-foreground tabular">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-2xs truncate leading-tight tracking-tight">{item.label}</span>
          </>
        );

        if (item.renderLink) {
          return (
            <React.Fragment key={item.id}>
              {item.renderLink({
                href: item.href,
                className: linkClassName,
                'aria-current': ariaCurrent,
                onClick: item.onClick,
                children: content,
              })}
            </React.Fragment>
          );
        }

        if (item.onClick) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              className={linkClassName}
              aria-current={ariaCurrent}
            >
              {content}
            </button>
          );
        }

        return (
          <a
            key={item.id}
            href={item.href}
            className={linkClassName}
            aria-current={ariaCurrent}
            aria-disabled={item.disabled}
          >
            {content}
          </a>
        );
      })}
    </nav>
  );
}
