import Link from 'next/link';
import { ShieldCheckIcon } from 'lucide-react';
import { imageSources, words } from '@smartapp/core';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';

export interface ShopFooterProps {
  slug: string;
  shopName: string;
  logo: string | null;
}

// Logo and name (the wordmark's place once owners upload one), the privacy notice, then Smart App PH.
export function ShopFooter({ slug, shopName, logo }: ShopFooterProps) {
  return (
    <footer className="mt-4 flex flex-col items-center gap-2 border-t pt-6 pb-4 text-center">
      <ShopLogo name={shopName} src={imageSources(logo)} size="md" shape="round" />
      <p className="text-sm font-semibold">{shopName}</p>
      <Link
        href={`/${slug}/privacy`}
        className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ShieldCheckIcon aria-hidden="true" className="size-4" />
        {words.privacy.title}
      </Link>
      <p className="text-xs text-muted-foreground">{words.storefrontShell.home.footerPoweredBy}</p>
    </footer>
  );
}
