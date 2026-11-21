// Grid lines for Recharts charts, placed by arithmetic instead of measuring tick labels on screen
// (decision T110). Recharts' default grid re-measures every value label with getBoundingClientRect, which
// forced a full page layout per label and froze Home for up to a second while the page was still changing.
// Pair it with the value axis' `tickCount` set to the same number, so the lines sit on the ticks.

/** `count` evenly spaced horizontal lines, top to bottom, for CartesianGrid's horizontalCoordinatesGenerator. */
export function evenRows(count: number) {
  return ({ offset }: { offset: { top: number; height: number } }): number[] =>
    Array.from(
      { length: count },
      (_, i) => offset.top + (offset.height * i) / Math.max(1, count - 1),
    );
}

/**
 * No vertical lines. Recharts works out vertical grid lines even when `vertical` is false, measuring every
 * category label to do it, so charts without them pass this as verticalCoordinatesGenerator.
 */
export function noColumns(): number[] {
  return [];
}
