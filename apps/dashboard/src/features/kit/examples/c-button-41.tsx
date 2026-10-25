import { useCopyToClipboard } from './hooks/use-copy-to-clipboard';
import { Button } from '@smartapp/ui/components/button';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 1500 });

  return (
    <Button
      variant="outline"
      aria-label={isCopied ? 'Copied' : 'Copy'}
      onClick={() => copyToClipboard(shop.shopUrl)}
    >
      {isCopied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      <span>{isCopied ? 'Copied' : 'Copy'}</span>
    </Button>
  );
}
