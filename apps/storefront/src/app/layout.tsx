import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { words } from '@smartapp/core';
import '../env';
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
      <body>{children}</body>
    </html>
  );
}
