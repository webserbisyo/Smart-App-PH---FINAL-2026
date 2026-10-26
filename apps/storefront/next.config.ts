import type { NextConfig } from 'next';
import { withSerwist } from '@serwist/turbopack';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // `pnpm dev` opened from a phone on the same Wi-Fi (http://192.168.x.x:3000). Next blocks its dev
  // scripts from unknown addresses, which leaves the page on skeletons. Dev only.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
  // The service worker is checked for updates on every visit (never served from the HTTP cache).
  async headers() {
    return [
      {
        source: '/serwist/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
};

// Serwist (T13): keeps esbuild out of the server bundle; the worker is built by the /serwist route.
export default withSerwist(nextConfig);
