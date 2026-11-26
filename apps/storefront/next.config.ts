import type { NextConfig } from 'next';
import { withSerwist } from '@serwist/turbopack';

// The Editor's preview (decision T72) may only be framed by the owner dashboard. Read at build time; the live
// dashboard unless set (`pnpm dev` sets the local one).
const dashboardOrigin = new URL(
  process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://app.webserbisyo.com',
).origin;

// A hosted preview on sample data (decision T100): keeps the Preview panel and test scenarios in the build
// and asks search engines not to index it. Live builds leave NEXT_PUBLIC_APP_ENV unset or `production`.
const preview = process.env.NEXT_PUBLIC_APP_ENV === 'preview';

// Whether any storefront area reads NestJS (launch phase 5). Written into the build, so a sample-data build
// drops the API adapter's loader from the shop pages' JS.
const takesApi =
  process.env.NEXT_PUBLIC_DATA_SOURCE === 'api' || Boolean(process.env.NEXT_PUBLIC_API_AREAS);

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Shared packages test this to keep the sample-data tools in preview builds only.
  env: { SMARTAPP_PREVIEW: preview ? '1' : '0', SMARTAPP_TAKES_API: takesApi ? '1' : '0' },
  partialPrefetching: true,
  // `pnpm dev` opened from a phone on the same Wi-Fi (http://192.168.x.x:3000). Next blocks its dev
  // scripts from unknown addresses, which leaves the page on skeletons. Dev only.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
  // No Next dev badge: every corner covers the dock or a top bar button. Compile and runtime errors
  // still show. Dev only.
  devIndicators: false,
  // The service worker is checked for updates on every visit (never served from the HTTP cache).
  async headers() {
    return [
      // Security headers on every page (T118 task 8.4). No frame-ancestors here: the Editor's preview page
      // sets its own (the dashboard frames it). Location is the customer's Use my location button.
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()',
          },
        ],
      },
      ...(preview
        ? [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
        : []),
      // Demo photos are public; the owner dashboard (another address) reads them to crop a photo.
      {
        source: '/demo/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
      {
        source: '/:shop/preview',
        headers: [
          { key: 'Content-Security-Policy', value: `frame-ancestors 'self' ${dashboardOrigin}` },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/serwist/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
};

// Serwist (T13): keeps esbuild out of the server bundle; the worker is built by the /serwist route.
export default withSerwist(nextConfig);
