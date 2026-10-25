import { imageSources, words } from '@smartapp/core';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';

export interface ShopFooterProps {
  shopName: string;
  logo: string | null;
}

// Logo and name (the wordmark's place once owners upload one), then Smart App PH.
export function ShopFooter({ shopName, logo }: ShopFooterProps) {
  return (
    <footer className="mt-4 flex flex-col items-center gap-2 border-t pt-6 pb-4 text-center">
      <ShopLogo name={shopName} src={imageSources(logo)} size="md" shape="round" />
      <p className="text-sm font-semibold">{shopName}</p>
      <p className="text-xs text-muted-foreground">{words.storefrontShell.home.footerPoweredBy}</p>
    </footer>
  );
}
