import { cn } from 'cn';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@smartapp/ui/components/sheet';
import { Button } from '@smartapp/ui/components/button';
import { QrCodeIcon, ExternalLinkIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { env } from '../env.js';

interface ShareShopSheetProps {
  shopName: string;
  shopSlug: string;
  className?: string | undefined;
}

export function ShareShopSheet({ shopName, shopSlug, className }: ShareShopSheetProps) {
  const storefrontUrl = `${env.VITE_STOREFRONT_URL}/${shopSlug}`;

  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="sm" className={cn('gap-2', className)} />}
      >
        <QrCodeIcon />
        <span>{words.nav.shareMyShop}</span>
      </SheetTrigger>
      <SheetContent side="bottom" className="pb-safe">
        <SheetHeader>
          <SheetTitle>{words.nav.shareMyShop}</SheetTitle>
          <SheetDescription>
            Share your storefront link so customers can discover and order from{' '}
            <strong>{shopName}</strong>.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted px-3 py-2">
            <span className="truncate text-sm text-muted-foreground">{storefrontUrl}</span>
          </div>

          <Button
            nativeButton={false}
            render={<a href={storefrontUrl} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLinkIcon />
            {words.nav.viewMyShop}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
