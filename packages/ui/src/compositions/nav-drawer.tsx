import * as React from 'react';
import { cn } from 'cn';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@smartapp/ui/components/drawer';
import type { NavItem } from '../lib/nav';

export interface NavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: readonly NavItem[];
  footerItems?: readonly NavItem[] | undefined;
  title?: string | undefined;
  description?: string | undefined;
}

export function NavDrawer({
  open,
  onOpenChange,
  items,
  footerItems,
  title = 'More',
  description,
}: NavDrawerProps) {
  const handleItemSelect = (item: NavItem) => {
    onOpenChange(false);
    if (item.onClick) {
      item.onClick();
    }
  };

  const renderNavTile = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = Boolean(item.isActive);
    const ariaCurrent = isActive ? 'page' : undefined;

    const tileClassName = cn(
      'relative flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors pressable',
      isActive
        ? 'border-primary/40 bg-accent text-primary font-semibold'
        : 'text-foreground hover:bg-accent/60',
      item.disabled && 'pointer-events-none opacity-40',
    );

    const content = (
      <>
        <div className="relative flex items-center justify-center">
          {Icon && <Icon className="size-6 shrink-0" />}
          {typeof item.badge === 'number' && item.badge > 0 && (
            <span className="text-2xs absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-bold text-primary-foreground tabular">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </div>
        <span className="text-xs leading-tight font-medium">{item.label}</span>
      </>
    );

    if (item.renderLink) {
      return (
        <React.Fragment key={item.id}>
          {item.renderLink({
            href: item.href,
            className: tileClassName,
            'aria-current': ariaCurrent,
            onClick: () => handleItemSelect(item),
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
          onClick={() => handleItemSelect(item)}
          disabled={item.disabled}
          className={tileClassName}
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
        onClick={() => handleItemSelect(item)}
        className={tileClassName}
        aria-current={ariaCurrent}
        aria-disabled={item.disabled}
      >
        {content}
      </a>
    );
  };

  const renderFooterRow = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = Boolean(item.isActive);
    const ariaCurrent = isActive ? 'page' : undefined;

    const rowClassName = cn(
      'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors pressable text-muted-foreground hover:bg-accent hover:text-foreground',
      isActive && 'bg-accent text-foreground font-semibold',
      item.disabled && 'pointer-events-none opacity-40',
    );

    const content = (
      <>
        {Icon && <Icon className="size-5 shrink-0" />}
        <span className="flex-1 text-left">{item.label}</span>
        {typeof item.badge === 'number' && item.badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground tabular">
            {item.badge}
          </span>
        )}
      </>
    );

    if (item.renderLink) {
      return (
        <React.Fragment key={item.id}>
          {item.renderLink({
            href: item.href,
            className: rowClassName,
            'aria-current': ariaCurrent,
            onClick: () => handleItemSelect(item),
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
          onClick={() => handleItemSelect(item)}
          disabled={item.disabled}
          className={rowClassName}
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
        onClick={() => handleItemSelect(item)}
        className={rowClassName}
        aria-current={ariaCurrent}
        aria-disabled={item.disabled}
      >
        {content}
      </a>
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="pb-safe">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>

        <div className="grid grid-cols-3 gap-3 p-4">{items.map((item) => renderNavTile(item))}</div>

        {footerItems && footerItems.length > 0 && (
          <DrawerFooter className="border-t border-border pt-3">
            <div className="flex flex-col gap-1">
              {footerItems.map((item) => renderFooterRow(item))}
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
