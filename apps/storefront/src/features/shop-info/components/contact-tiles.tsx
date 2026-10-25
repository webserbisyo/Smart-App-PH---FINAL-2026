import type { ReactNode } from 'react';
import { GlobeIcon, MessageCircleMoreIcon, NavigationIcon, PhoneIcon } from 'lucide-react';
import { words, type ShopContact } from '@smartapp/core';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';

const TILE_CLASS =
  'flex min-w-16 flex-col items-center gap-1.5 rounded-xl py-1 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Tile({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <>
      <IconTile variant="soft" size="lg" radius="full" className="text-shop-10-text">
        {icon}
      </IconTile>
      {label}
    </>
  );
}

/** Where the map pin or address opens in Google Maps (no Maps API, decision Location A). */
export function directionsHref(contact: ShopContact): string | null {
  if (!contact.showAddress) return null;
  if (contact.pin) {
    return `https://www.google.com/maps/search/?api=1&query=${contact.pin.lat},${contact.pin.lng}`;
  }
  if (contact.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`;
  }
  return null;
}

/** Round contact tiles (c-icon-tile soft): Call, Message, Directions, Facebook, then any extra tile. */
export function ContactTiles({
  contact,
  facebook = false,
  children,
}: {
  contact: ShopContact;
  // The sheet shows Facebook; the Home card has the Hours tile there instead.
  facebook?: boolean | undefined;
  children?: ReactNode;
}) {
  const directions = directionsHref(contact);
  return (
    <div className="flex flex-wrap justify-around gap-2">
      {contact.phone ? (
        <a href={`tel:${contact.phone}`} className={TILE_CLASS}>
          <Tile icon={<PhoneIcon />} label={words.storefrontShell.info.call} />
        </a>
      ) : null}
      {contact.messengerUsername ? (
        <a
          href={`https://m.me/${contact.messengerUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className={TILE_CLASS}
        >
          <Tile icon={<MessageCircleMoreIcon />} label={words.storefrontShell.info.message} />
        </a>
      ) : null}
      {directions ? (
        <a href={directions} target="_blank" rel="noopener noreferrer" className={TILE_CLASS}>
          <Tile icon={<NavigationIcon />} label={words.storefrontShell.info.directions} />
        </a>
      ) : null}
      {facebook && contact.facebookUrl ? (
        <a
          href={contact.facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={TILE_CLASS}
        >
          <Tile icon={<GlobeIcon />} label={words.storefrontShell.info.facebook} />
        </a>
      ) : null}
      {children}
    </div>
  );
}

export { Tile as ContactTile, TILE_CLASS as CONTACT_TILE_CLASS };
