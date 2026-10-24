// Clip-path reveal from a point (View Transitions). Put the `reveal-clip` utility on the element that changes.
// Browsers without document.startViewTransition, and reduced motion, get the change at once.

export interface RevealOrigin {
  x: number;
  y: number;
}

export function startReveal(origin: RevealOrigin, update: () => void): void {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || reduced) {
    update();
    return;
  }
  root.style.setProperty('--reveal-x', `${origin.x}px`);
  root.style.setProperty('--reveal-y', `${origin.y}px`);
  document.startViewTransition(update);
}
