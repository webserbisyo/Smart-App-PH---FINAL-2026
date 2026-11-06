import type { NextConfig } from 'next';
import { withSerwist } from '@serwist/turbopack';

// The Editor's preview (decision T72) may only be framed by the owner dashboard. Read at build time.
const dashboardOrigin = new URL(process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:5173')
  .origin;

const nextConfig: NextConfig = {
  cacheComponents: true,
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
