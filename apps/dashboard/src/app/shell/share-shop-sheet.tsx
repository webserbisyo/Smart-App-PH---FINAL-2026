import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@smartapp/ui/components/sheet';

type CopyState = 'idle' | 'copied' | 'failed';

export function ShareShopSheet({
  url,
  open,
  onOpenChange,
}: {
  url: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setCopyState('idle');
      }}
    >
      <SheetContent side="bottom" className="mx-auto w-full max-w-lg rounded-t-xl pb-safe">
        <SheetHeader>
          <SheetTitle>{words.nav.shareMyShop}</SheetTitle>
          <SheetDescription>{words.share.description}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-4">
          <Input
            readOnly
            value={url}
            aria-label={words.nav.shareMyShop}
            className="h-11 text-base"
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button className="h-11" onClick={() => void copy()}>
            {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
            {copyState === 'copied' ? words.share.copied : words.share.copy}
          </Button>
          {copyState === 'failed' ? (
            <p role="alert" className="text-sm text-destructive">
              {words.share.copyFailed}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
