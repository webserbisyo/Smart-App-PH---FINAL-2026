// A shop's own address (launch phase 5, R9 and X7): <slug>.webserbisyo.com serves the same [shop] pages as the
// backup shop.webserbisyo.com/<slug>. Pages are built once for both, so links keep the /<slug> form and the
// proxy accepts it on the shop's own address too: a link can never print the slug twice into a dead path.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Our own hosts under the shop domain are never shops (the database's reserved_slugs holds the full list).
const NOT_SHOPS = new Set([
  'www',
  'app',
  'api',
  'api-staging',
  'staging',
  'shop',
  'mail',
  'stays',
  'admin',
  'rsvp',
]);

// App-wide paths that live at the root on every host.
const ROOT_PATHS = new Set([
  '_next',
  'api',
  'serwist',
  'demo',
  'icons',
  'art',
  'avatars',
  'brand',
  '~offline',
  'samples',
]);

/** The shop a host belongs to (`kanto.webserbisyo.com` → `kanto`), or null for any other host. */
export function shopOfHost(host: string | null, shopDomain: string | undefined): string | null {
  if (!host || !shopDomain) return null;
  const name = host.toLowerCase().replace(/:\d+$/, '');
  const suffix = `.${shopDomain}`;
  if (!name.endsWith(suffix)) return null;
  const label = name.slice(0, -suffix.length);
  if (label.length < 3 || label.length > 40 || !SLUG.test(label) || NOT_SHOPS.has(label))
    return null;
  return label;
}

/**
 * The app path to serve for a path on a shop's own address, or null to serve it as it is: `/menu` →
 * `/kanto/menu`, while `/kanto/menu` and app-wide files stay.
 */
export function shopPath(slug: string, pathname: string): string | null {
  const first = pathname.split('/')[1] ?? '';
  if (first === slug || ROOT_PATHS.has(first) || /\.[a-z0-9]+$/i.test(first)) return null;
  return pathname === '/' ? `/${slug}` : `/${slug}${pathname}`;
}

/** A link inside a shop. The one place shop links are written, so the address scheme can change here. */
export function shopHref(slug: string, path = ''): string {
  return `/${slug}${path}`;
}
