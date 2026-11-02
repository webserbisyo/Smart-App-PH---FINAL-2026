'use client';

import { Trash2Icon } from 'lucide-react';
import { words } from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Button } from '@smartapp/ui/components/button';

export interface BasketHeaderProps {
  count: number;
  onClear: () => void;
}

// Basket header with the item count and one Clear button. Clearing happens at once with Undo in the
// toast (decision T45), so there is no menu and no confirm dialog.
export function BasketHeader({ count, onClear }: BasketHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-foreground">{words.basket.title}</h2>
        {count > 0 ? (
          <Badge variant="secondary" size="lg" radius="full">
            {count}
          </Badge>
        ) : null}
      </div>

      {count > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-11 gap-1.5 rounded-full px-3 text-muted-foreground hover:text-destructive-text"
          aria-label={words.basket.clearBasket}
          onClick={onClear}
        >
          <Trash2Icon aria-hidden="true" />
          {words.basket.clear}
        </Button>
      ) : null}
    </div>
  );
}
