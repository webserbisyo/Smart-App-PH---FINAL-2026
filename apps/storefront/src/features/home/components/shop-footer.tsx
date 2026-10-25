import { words } from '@smartapp/core';

export interface ShopFooterProps {
  shopName: string;
}

export function ShopFooter({ shopName }: ShopFooterProps) {
  return (
    <footer className="mt-8 flex flex-col items-center justify-center gap-1 border-t border-border pt-6 pb-12 text-center text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">{shopName}</p>
      <p>{words.storefrontShell.home.footerPoweredBy}</p>
    </footer>
  );
}
