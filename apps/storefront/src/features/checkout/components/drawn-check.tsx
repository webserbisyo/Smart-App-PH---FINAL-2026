import { cn } from '@smartapp/ui/lib/utils';

/**
 * A check mark that draws itself (the `draw-check` utility; whole at once under reduced motion). Mount it fresh to
 * draw it again. Shared by the copy buttons, the receipt's paid chip and its placed check.
 */
export function DrawnCheckIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden="true"
      className={cn('size-4', className)}
    >
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        pathLength={1}
        className="draw-check"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
