import { words, type ShopContact } from '@smartapp/core';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@smartapp/ui/components/item';
import { ChevronRightIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from 'lucide-react';

export interface ContactSectionProps {
  contact: ShopContact;
}

export function ContactSection({ contact }: ContactSectionProps) {
  const { phone, messengerUsername, facebookUrl, pin, address, showAddress } = contact;

  const rows: Array<{
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    href?: string | undefined;
    isExternal?: boolean | undefined;
  }> = [];

  if (phone) {
    rows.push({
      id: 'phone',
      icon: <PhoneIcon className="size-4" />,
      title: words.storefrontShell.home.call,
      description: phone,
      href: `tel:${phone}`,
    });
  }

  if (messengerUsername) {
    rows.push({
      id: 'messenger',
      icon: <MessageCircleIcon className="size-4" />,
      title: words.storefrontShell.home.messenger,
      description: `@${messengerUsername}`,
      href: `https://m.me/${messengerUsername}`,
      isExternal: true,
    });
  }

  if (facebookUrl) {
    rows.push({
      id: 'facebook',
      icon: (
        <svg className="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      title: words.storefrontShell.home.facebook,
      description: facebookUrl.replace(/^https?:\/\/(www\.)?facebook\.com\//, ''),
      href: facebookUrl,
      isExternal: true,
    });
  }

  if (showAddress && pin) {
    rows.push({
      id: 'directions',
      icon: <MapPinIcon className="size-4" />,
      title: words.storefrontShell.home.getDirections,
      description: address ?? `${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`,
      href: `https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`,
      isExternal: true,
    });
  } else if (showAddress && address) {
    rows.push({
      id: 'address',
      icon: <MapPinIcon className="size-4" />,
      title: words.storefrontShell.home.address,
      description: address,
    });
  }

  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold tracking-tight">
        {words.storefrontShell.home.contact}
      </h2>

      <div className="overflow-hidden rounded-lg border border-border bg-card p-1">
        <ItemGroup className="gap-0">
          {rows.map((row, index) => {
            const isClickable = Boolean(row.href);
            const content = (
              <>
                <ItemMedia variant="icon">{row.icon}</ItemMedia>
                <ItemContent>
                  <ItemTitle>{row.title}</ItemTitle>
                  <ItemDescription className="truncate">{row.description}</ItemDescription>
                </ItemContent>
                {isClickable ? (
                  <ItemActions>
                    <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                  </ItemActions>
                ) : null}
              </>
            );

            return (
              <div key={row.id}>
                {index > 0 ? <ItemSeparator className="my-0.5" /> : null}
                {row.href ? (
                  <Item
                    render={
                      <a
                        href={row.href}
                        target={row.isExternal ? '_blank' : undefined}
                        rel={row.isExternal ? 'noopener noreferrer' : undefined}
                      />
                    }
                    size="xs"
                    className="hover:bg-muted/50"
                  >
                    {content}
                  </Item>
                ) : (
                  <Item size="xs">{content}</Item>
                )}
              </div>
            );
          })}
        </ItemGroup>
      </div>
    </section>
  );
}
