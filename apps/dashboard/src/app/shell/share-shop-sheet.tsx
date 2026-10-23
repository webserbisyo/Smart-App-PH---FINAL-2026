import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';

type CopyState = 'idle' | 'copied' | 'failed';

// Share my shop: Dialog on tablet and desktop, Drawer on phone.
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
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setCopyState('idle');
      }}
      title={words.nav.shareMyShop}
      description={words.share.description}
    >
      <div className="flex flex-col gap-3">
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
    </ResponsiveDialog>
  );
}
