import { NextResponse, type NextRequest } from 'next/server';
import { shopOfHost, shopPath } from '@/features/shell/shop-address';

// The shops' own addresses (launch phase 5, R9): <slug>.<NEXT_PUBLIC_SHOP_DOMAIN>/menu serves /<slug>/menu.
// Without the domain set (a laptop, a demo link) every request passes through.
const shopDomain = process.env.NEXT_PUBLIC_SHOP_DOMAIN || undefined;

export function proxy(request: NextRequest) {
  const slug = shopOfHost(request.headers.get('host'), shopDomain);
  if (!slug) return NextResponse.next();
  const path = shopPath(slug, request.nextUrl.pathname);
  if (!path) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.rewrite(url);
}

export const config = {
  // Never the build's own files or the worker.
  matcher: ['/((?!_next/static|_next/image|serwist|favicon.ico).*)'],
};
