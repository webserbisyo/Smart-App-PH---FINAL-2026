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
  { name: 'kanto-smash menu', path: '/kanto-smash/menu', server: 'prod' },
  { name: 'tala-apparel menu', path: '/tala-apparel/menu', server: 'prod' },
  { name: 'kape-juan menu', path: '/kape-juan/menu', server: 'prod' },
  { name: 'lola-remy menu', path: '/lola-remy/menu', server: 'prod' },
  { name: 'aqualinis menu', path: '/aqualinis/menu', server: 'prod' },
  { name: 'kanto-smash checkout', path: '/kanto-smash/checkout', server: 'prod' },
  {
    name: 'kanto-smash receipt placed',
    path: '/kanto-smash/o/demo-placed-transfer',
    server: 'dev',
  },
  {
    name: 'kanto-smash receipt proof-pending',
    path: '/kanto-smash/o/demo-proof-pending',
    server: 'dev',
  },
  {
    name: 'kanto-smash receipt proof-rejected',
    path: '/kanto-smash/o/demo-proof-rejected',
    server: 'dev',
  },
  { name: 'kanto-smash receipt preparing', path: '/kanto-smash/o/demo-preparing', server: 'dev' },
  { name: 'kanto-smash receipt ready', path: '/kanto-smash/o/demo-ready-pickup', server: 'dev' },
  {
    name: 'kanto-smash receipt out-for-delivery',
    path: '/kanto-smash/o/demo-out-for-delivery',
    server: 'dev',
  },
  { name: 'kanto-smash receipt completed', path: '/kanto-smash/o/demo-completed', server: 'dev' },
  {
    name: 'kanto-smash receipt completed-rated',
    path: '/kanto-smash/o/demo-completed-rated',
    server: 'dev',
  },
  {
    name: 'kanto-smash receipt cancelled-refunded',
    path: '/kanto-smash/o/demo-cancelled-refunded',
    server: 'dev',
  },
  { name: 'kanto-smash receipt expired', path: '/kanto-smash/o/demo-expired', server: 'dev' },
  { name: 'kanto-smash receipt scheduled', path: '/kanto-smash/o/demo-scheduled', server: 'dev' },
  {
    name: 'tala-apparel receipt placed',
    path: '/tala-apparel/o/demo-placed-transfer',
    server: 'dev',
  },
  {
    name: 'tala-apparel receipt proof-pending',
    path: '/tala-apparel/o/demo-proof-pending',
    server: 'dev',
  },
  {
    name: 'tala-apparel receipt proof-rejected',
    path: '/tala-apparel/o/demo-proof-rejected',
    server: 'dev',
  },
  { name: 'tala-apparel receipt preparing', path: '/tala-apparel/o/demo-preparing', server: 'dev' },
  { name: 'tala-apparel receipt ready', path: '/tala-apparel/o/demo-ready-pickup', server: 'dev' },
  {
    name: 'tala-apparel receipt out-for-delivery',
    path: '/tala-apparel/o/demo-out-for-delivery',
    server: 'dev',
  },
  { name: 'tala-apparel receipt completed', path: '/tala-apparel/o/demo-completed', server: 'dev' },
  {
    name: 'tala-apparel receipt completed-rated',
    path: '/tala-apparel/o/demo-completed-rated',
    server: 'dev',
  },
  {
    name: 'tala-apparel receipt cancelled-refunded',
    path: '/tala-apparel/o/demo-cancelled-refunded',
    server: 'dev',
  },
  { name: 'tala-apparel receipt expired', path: '/tala-apparel/o/demo-expired', server: 'dev' },
  { name: 'tala-apparel receipt scheduled', path: '/tala-apparel/o/demo-scheduled', server: 'dev' },
  { name: 'kanto-smash my orders', path: '/kanto-smash/orders', server: 'prod' },
  { name: 'tala-apparel my orders', path: '/tala-apparel/orders', server: 'prod' },
  { name: 'kanto-smash my orders (member)', path: '/kanto-smash/orders?as=member', server: 'dev' },
  { name: 'kanto-smash join', path: '/kanto-smash/join', server: 'prod' },
  { name: 'tala-apparel join', path: '/tala-apparel/join', server: 'prod' },
  { name: 'kanto-smash rewards', path: '/kanto-smash/rewards', server: 'prod' },
  { name: 'kanto-smash rewards (member)', path: '/kanto-smash/rewards?as=member', server: 'dev' },
  {
    name: 'tala-apparel rewards (prize ready)',
    path: '/tala-apparel/rewards?as=member-ready',
    server: 'dev',
  },
  { name: 'kanto-smash account', path: '/kanto-smash/account', server: 'prod' },
  { name: 'kanto-smash account (member)', path: '/kanto-smash/account?as=member', server: 'dev' },
  { name: 'offline page', path: '/~offline', server: 'prod' },
  { name: 'kanto-smash privacy', path: '/kanto-smash/privacy', server: 'prod' },
  { name: 'tala-apparel privacy', path: '/tala-apparel/privacy', server: 'prod' },
  { name: 'unknown shop', path: '/no-such-shop', server: 'prod', notFound: true },
  { name: 'unknown shop page', path: '/kanto-smash/no-such-page', server: 'prod', notFound: true },
  { name: 'unknown order token', path: '/kanto-smash/o/no-such-token', server: 'dev' },
  { name: 'test-blank home', path: '/test-blank', server: 'dev' },
  { name: 'test-blank menu', path: '/test-blank/menu', server: 'dev' },
  { name: 'test-stress home', path: '/test-stress', server: 'dev' },
  { name: 'test-stress menu', path: '/test-stress/menu', server: 'dev' },
];

export const urlFor = (server: SmokeServer, path: string) =>
  `http://localhost:${PORTS[server]}${path}`;
