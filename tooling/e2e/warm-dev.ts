import { PORTS, ROUTES } from './routes.js';

/**
 * Opens each `next dev` page once, one at a time, before the tests start (decision T110). The dev server
 * compiles a page on its first visit; when the phone and desktop runs asked for the same new page at once,
 * it sometimes served half-written build files ("Unexpected end of JSON input", a false CI failure).
 */
export default async function warmDevServer(): Promise<void> {
  const paths = [
    ...new Set(ROUTES.filter((r) => r.server === 'dev').map((r) => r.path.split('?')[0] ?? '/')),
  ];
  for (const path of paths) {
    try {
      await fetch(`http://localhost:${PORTS.dev}${path}`, { signal: AbortSignal.timeout(120_000) });
    } catch {
      // A page that fails here fails again in its own test, with a clear message there.
    }
  }
}
