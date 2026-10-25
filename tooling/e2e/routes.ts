// Every storefront route the smoke test opens. Later tasks add their pages here (T04 decision T30).
// `prod` runs against `next start` after the build; `dev` against `next dev`, for what a production
// build never has: the test shops (decision N28) and the ?mock= scenarios (decision T26).
export type SmokeServer = 'prod' | 'dev';

export interface SmokeRoute {
  name: string;
  path: string;
  server: SmokeServer;
  // A Not found page: the heading shows, and the browser's own "404" console line is expected.
  notFound?: boolean;
}

export const PORTS: Record<SmokeServer, number> = { prod: 3000, dev: 3100 };

export const ROUTES: readonly SmokeRoute[] = [
  { name: 'platform page', path: '/', server: 'prod' },
  { name: 'kanto-smash home', path: '/kanto-smash', server: 'prod' },
  { name: 'tala-apparel home', path: '/tala-apparel', server: 'prod' },
  { name: 'kape-juan home', path: '/kape-juan', server: 'prod' },
  { name: 'lola-remy home', path: '/lola-remy', server: 'prod' },
  { name: 'aqualinis home', path: '/aqualinis', server: 'prod' },
  { name: 'unknown shop', path: '/no-such-shop', server: 'prod', notFound: true },
  { name: 'unknown shop page', path: '/kanto-smash/no-such-page', server: 'prod', notFound: true },
  { name: 'test-blank home', path: '/test-blank', server: 'dev' },
  { name: 'test-stress home', path: '/test-stress', server: 'dev' },
];

export const urlFor = (server: SmokeServer, path: string) =>
  `http://localhost:${PORTS[server]}${path}`;
