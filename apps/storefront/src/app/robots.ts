import type { MetadataRoute } from 'next';

// Without this file /robots.txt fell through to the shop route and answered with a Not found page
// (decision R44). Private pages (orders, checkout, account, join) stay crawlable on purpose: they carry
// noindex, and a crawler that can't open them never sees it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/serwist/', '/~offline'] },
  };
}
