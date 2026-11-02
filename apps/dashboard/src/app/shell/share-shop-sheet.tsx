import { useState } from 'react';
import { words } from '@smartapp/core';
import { FieldError } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { CopyButton } from '../copy-button.js';

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
  const [copyFailed, setCopyFailed] = useState(false);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setCopyFailed(false);
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
        <CopyButton
          className="h-11"
          value={url}
          label={words.share.copy}
          onCopyFailed={() => setCopyFailed(true)}
        />
        {copyFailed ? <FieldError>{words.share.copyFailed}</FieldError> : null}
      </div>
    </ResponsiveDialog>
  );
}
