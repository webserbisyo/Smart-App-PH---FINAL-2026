// Confetti for the two happy moments. canvas-confetti loads only when one is called, and never fires under
// reduced motion (disableForReducedMotion).

export interface Point {
  // 0..1 of the viewport, like canvas-confetti's origin.
  x: number;
  y: number;
}

async function confetti() {
  const mod = await import('canvas-confetti');
  return mod.default;
}

const Z_CONFETTI = 70; // --z-confetti

/** A small burst where a stamp lands (about 20 particles). */
export async function stampBurst(origin: Point): Promise<void> {
  const fire = await confetti();
  await fire({
    particleCount: 20,
    spread: 45,
    startVelocity: 22,
    scalar: 0.7,
    ticks: 90,
    origin,
    zIndex: Z_CONFETTI,
    disableForReducedMotion: true,
  });
}

/** Side cannons, once, when a reward is ready. */
export async function rewardReady(): Promise<void> {
  const fire = await confetti();
  const shared = {
    particleCount: 60,
    spread: 60,
    startVelocity: 45,
    ticks: 160,
    zIndex: Z_CONFETTI,
    disableForReducedMotion: true,
  };
  await Promise.all([
    fire({ ...shared, angle: 60, origin: { x: 0, y: 0.7 } }),
    fire({ ...shared, angle: 120, origin: { x: 1, y: 0.7 } }),
  ]);
}
