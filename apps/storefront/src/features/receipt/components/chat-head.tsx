'use client';

import { imageSources, words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';
import { useShop } from '../../shell/components/shop-context';

export interface ChatHeadProps {
  readonly unread: boolean;
  readonly onOpen: () => void;
  // Loads the chat before the tap when a finger or mouse comes near.
  readonly onWarm: () => void;
}

/**
 * The chat head (T81): the shop's face floating above the dock on the receipt, with a red dot when the
 * shop has answered since this phone last looked. A tap opens the order chat.
 */
export function ChatHead({ unread, onOpen, onWarm }: ChatHeadProps) {
  const { shop } = useShop();
  const info = shop.storefront.info;
  const logo = info.logo ? imageSources(info.logo) : null;
  const C = words.receipt.chat;
  return (
    <Button
      type="button"
      id="receipt-chat-head"
      variant="outline"
      aria-label={unread ? C.headNew(info.name) : C.head(info.name)}
      onClick={onOpen}
      onPointerEnter={onWarm}
      onFocus={onWarm}
      className="fixed right-4 above-dock z-dock size-14 rounded-full border-2 border-card bg-card p-0 shadow-lg transition-all duration-base ease-spring lg:right-6 lg:bottom-6 starting:scale-50 starting:opacity-0 print:hidden"
    >
      <ShopLogo name={info.name} src={logo} shape="round" className="size-12" />
      {unread ? (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-destructive ring-2 ring-card motion-safe:animate-pulse"
        />
      ) : null}
    </Button>
  );
}
