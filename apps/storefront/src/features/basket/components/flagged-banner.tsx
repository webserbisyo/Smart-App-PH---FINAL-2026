'use client';

import { AlertTriangleIcon } from 'lucide-react';
import { orderFlowWords } from '@smartapp/core';
import type { BasketApi } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Alert, AlertDescription } from '@smartapp/ui/components/reui/alert';
import { removeRowsWithUndo } from '../remove-lines';
import type { BasketRow } from './use-basket-view';

/** "1 item can't be ordered right now" with one Remove for all of them (T127), in the basket and checkout. */
export function FlaggedBanner({ basket, rows }: { basket: BasketApi; rows: readonly BasketRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Alert variant="warning" className="flex items-center gap-2 rounded-lg p-2.5">
      <AlertTriangleIcon aria-hidden="true" className="size-4 shrink-0 text-warning" />
      <AlertDescription className="flex-1 text-xs font-medium">
        {orderFlowWords.cantOrder(rows.length)}
      </AlertDescription>
      <Button
        size="xs"
        variant="outline"
        className="h-8 shrink-0 text-xs text-foreground hover:text-foreground"
        onClick={() => removeRowsWithUndo(basket, rows)}
      >
        {orderFlowWords.removeAll(rows.length)}
      </Button>
    </Alert>
  );
}
