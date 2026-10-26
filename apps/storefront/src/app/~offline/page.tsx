import type { Metadata } from 'next';
import { words } from '@smartapp/core';
import { OfflineScreen } from '@/features/install/components/offline-screen';

export const metadata: Metadata = {
  title: words.offlinePage.metaTitle,
  robots: { index: false, follow: false },
};

// Precached by the service worker (T13): any page that can't load without signal shows this instead.
export default function OfflinePage() {
  return <OfflineScreen />;
}
