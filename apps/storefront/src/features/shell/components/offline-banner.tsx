'use client';

import { WifiOffIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { useOnline } from '@smartapp/data';
import { Banner, BannerContent, BannerIcon, BannerTitle } from '@smartapp/ui/components/banner';

// "You're offline. Showing your saved menu." under the top bar (role status, from the DiceUI banner).
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <Banner
      variant="default"
      dismissible={false}
      className="rounded-none border-0 border-b bg-warning-soft px-4 py-2 text-warning-soft-foreground"
    >
      <BannerIcon>
        <WifiOffIcon />
      </BannerIcon>
      <BannerContent>
        <BannerTitle className="text-sm font-medium">{words.storefrontShell.offline}</BannerTitle>
      </BannerContent>
    </Banner>
  );
}
