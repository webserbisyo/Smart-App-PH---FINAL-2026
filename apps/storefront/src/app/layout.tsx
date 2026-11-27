import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SerwistProvider } from '@serwist/turbopack/react';
import { words } from '@smartapp/core';
import { serwistDev } from '../env';
import { LAUNCH_LIFT_SCRIPT } from '../features/install/install-rules';
import './globals.css';

// The storefront's public address: Open Graph images resolve against it.
const SITE_URL = 'https://shop.webserbisyo.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: words.storefrontShell.platform.title,
  description: words.storefrontShell.platform.intro,
};

// docs/ux.md section 2: cover the notch, keep zoom, resize with the keyboard. Light mode only.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Before the first paint: lines the opening screen up with iPhone's launch picture (T122). */}
        <script dangerouslySetInnerHTML={{ __html: LAUNCH_LIFT_SCRIPT }} />
      </head>
      <body>
        {/* One service worker for every shop (T13). Off in `next dev` unless SERWIST_DEV=1. Pages are
            cached by the shop frame (Home, Menu, Orders, Rewards only) and nothing reloads by itself. */}
        <SerwistProvider
          swUrl="/serwist/sw.js"
          disable={process.env.NODE_ENV === 'development' && !serwistDev}
          cacheOnNavigation={false}
          reloadOnOnline={false}
        >
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
