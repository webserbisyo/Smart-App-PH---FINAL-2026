import { lineIdentity, words, orderFlowWords } from '@smartapp/core';
import type { BasketApi } from '@smartapp/data';
import { notify } from '@smartapp/ui/compositions/notify';
import type { BasketRow } from './components/use-basket-view';

/**
 * Removes the lines that can't be ordered in one tap, with one Undo (T127). Used by the basket banner and
 * the checkout's sold-out step. Undo adds them back, merged with anything added since.
 */
export function removeRowsWithUndo(basket: BasketApi, rows: readonly BasketRow[]): void {
  const [first] = rows;
  if (!first) return;
  const drop = new Set(rows.map((r) => r.identity));
  const saved = rows.map((r) => r.line);
  basket.replace(basket.lines.filter((l) => !drop.has(lineIdentity(l))));
  notify({
    title:
      rows.length === 1
        ? words.basket.removed(first.name)
        : orderFlowWords.removedMany(rows.length),
    action: { label: words.basket.undo, onClick: () => saved.forEach((line) => basket.add(line)) },
  });
}
