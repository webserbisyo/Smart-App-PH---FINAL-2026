'use client';

import { useState } from 'react';
import { ShoppingBagIcon } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { countLabel } from '../lib/nav';

export interface CartButtonProps {
  count: number;
  // Spoken label, e.g. "Basket, 3 items, ₱345".
  label: string;
  onClick: () => void;
  // bar: outline circle in the top bar. dock: the round shop-colour button beside the dock.
  variant?: 'bar' | 'dock' | undefined;
  className?: string | undefined;
}

/**
 * Round cart button with the count dot of c-avatar-34 (composition C6). Pops once each time the
 * count goes up; the dot hides at 0.
 */
export function CartButton({ count, label, onClick, variant = 'bar', className }: CartButtonProps) {
  // Count bumps since mount; changing the key restarts the pop animation.
  const [seen, setSeen] = useState(count);
  const [bumps, setBumps] = useState(0);
  if (count !== seen) {
    setSeen(count);
    if (count > seen) setBumps(bumps + 1);
  }

  const dock = variant === 'dock';
  return (
    <Button
      type="button"
      variant={dock ? 'default' : 'outline'}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'relative shrink-0 pressable rounded-full',
        dock ? 'size-14 shadow-lg' : 'size-11 bg-card',
        className,
      )}
    >
      <span key={bumps} className={cn('flex', bumps > 0 && 'cart-bump')} aria-hidden="true">
        <ShoppingBagIcon className={dock ? 'size-6' : 'size-5'} />
      </span>
      {count > 0 ? (
        <Badge
          size="sm"
          radius="full"
          variant={dock ? 'invert' : 'default'}
          className="absolute -top-1 -right-1 tabular ring-2 ring-background"
          aria-hidden="true"
        >
          {countLabel(count)}
        </Badge>
      ) : null}
    </Button>
  );
}
