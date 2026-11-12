// Clip-path reveal from a point (View Transitions). Put the `reveal-clip` utility on the element that changes.
// Browsers without document.startViewTransition, and reduced motion, get the change at once.

export interface RevealOrigin {
  x: number;
  y: number;
}

/** Runs `update` behind the reveal; resolves when the reveal has finished (at once without one). */
export function startReveal(origin: RevealOrigin, update: () => void): Promise<void> {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || reduced) {
    update();
    return Promise.resolve();
  }
  root.style.setProperty('--reveal-x', `${origin.x}px`);
  root.style.setProperty('--reveal-y', `${origin.y}px`);
  return document
    .startViewTransition(update)
    .finished.then(() => undefined)
    .catch(() => undefined);
}

/**
 * The whole page changes behind the reveal (a theme switch): the page itself carries `reveal-clip` until
 * the reveal ends, so it never clashes with another element that uses it.
 */
export function revealPage(origin: RevealOrigin, update: () => void): Promise<void> {
  const root = document.documentElement;
  root.classList.add('reveal-clip');
  return startReveal(origin, update).finally(() => root.classList.remove('reveal-clip'));
}
