import { membersWords } from '@smartapp/core';
import { cn } from 'cn';

/**
 * A member's card in one line: a filled dot per stamp up to the goal (the mint loyalty colour). Spoken as
 * "7 of 10 stamps"; a balance over the goal shows every dot filled.
 */
export function StampDots({
  balance,
  goal,
  className,
}: {
  balance: number;
  goal: number;
  className?: string | undefined;
}) {
  const filled = Math.min(balance, goal);
  return (
    <span
      role="img"
      aria-label={membersWords.stampsLabel(balance, goal)}
      className={cn('inline-flex flex-wrap items-center gap-0.5', className)}
    >
      {Array.from({ length: goal }, (_, i) => (
        <span
          key={i}
          className={cn(
            'size-2 rounded-full',
            i < filled ? 'bg-member' : 'border border-dashed border-muted-foreground/50',
          )}
        />
      ))}
    </span>
  );
}
