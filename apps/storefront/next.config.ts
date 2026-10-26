import type { NextConfig } from 'next';
import { withSerwist } from '@serwist/turbopack';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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
