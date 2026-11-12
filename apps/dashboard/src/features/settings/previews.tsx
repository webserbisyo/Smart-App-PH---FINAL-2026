import type * as React from 'react';
import {
  BanknoteIcon,
  ClockIcon,
  MapPinIcon,
  MessageCircleMoreIcon,
  NavigationIcon,
  PhoneIcon,
  QrCodeIcon,
  SmartphoneIcon,
} from 'lucide-react';
import {
  formatPeso,
  manilaDate,
  settingsWords,
  weekHours,
  paymentLabel,
  words,
  type Closure,
  type OpeningRange,
  type PaymentAccount,
  type ShopFacts,
} from '@smartapp/core';
import { useNow, useStorefront } from '@smartapp/data';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import { InfoList } from '@smartapp/ui/compositions/info-list';
import { ShopLookTheme } from '@/app/shop-look';

// "Customers see" previews beside a settings form on laptops (decision T64). They draw from the
// unsaved draft in the shop's own colours, so the owner sees a change before saving it.

function Themed({ slug, children }: { slug: string; children: React.ReactNode }) {
  const storefront = useStorefront(slug);
  return <ShopLookTheme look={storefront.data?.storefront.look}>{children}</ShopLookTheme>;
}

function PreviewTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex min-w-16 flex-col items-center gap-1.5 text-xs font-medium text-foreground">
      <IconTile variant="soft" size="lg" radius="full" className="text-shop-10-text">
        {icon}
      </IconTile>
      {label}
    </span>
  );
}

export function ShopPreview({ facts, slug }: { facts: ShopFacts; slug: string }) {
  const c = facts.contact;
  const info = words.storefrontShell.info;
  return (
    <Themed slug={slug}>
      <Card className="gap-4 py-5">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold text-balance text-foreground">
              {facts.name || settingsWords.shop.name}
            </p>
            {c.address ? (
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="line-clamp-2">
                  {c.showAddress ? c.address : settingsWords.shop.addressHidden}
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-around gap-2">
            {c.phone ? <PreviewTile icon={<PhoneIcon />} label={info.call} /> : null}
            {c.messengerUsername ? (
              <PreviewTile icon={<MessageCircleMoreIcon />} label={info.message} />
            ) : null}
            {c.showAddress && (c.pin || c.address) ? (
              <PreviewTile icon={<NavigationIcon />} label={info.directions} />
            ) : null}
          </div>
          {c.pickupNote ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              {c.pickupNote}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Themed>
  );
}

export function HoursPreview({
  slug,
  hours,
  closures,
}: {
  slug: string;
  hours: readonly OpeningRange[];
  closures: readonly Closure[];
}) {
  const now = useNow();
  const today = now ? manilaDate(now) : null;
  const days = weekHours({ hours, closures }, today);
  return (
    <Themed slug={slug}>
      <InfoList
        rows={days.map((d) => ({
          id: String(d.day),
          icon: d.isToday ? <ClockIcon /> : undefined,
          label: d.name,
          highlight: d.isToday,
          value: d.closedFor ?? (d.lines.length ? d.lines.join(', ') : settingsWords.hours.closed),
        }))}
      />
    </Themed>
  );
}

const METHOD_ICON: Record<PaymentAccount['method'], React.ReactNode> = {
  cash: <BanknoteIcon />,
  cod: <BanknoteIcon />,
  gcash: <SmartphoneIcon />,
  maya: <SmartphoneIcon />,
  bank: <BanknoteIcon />,
  qr_ph: <QrCodeIcon />,
};

export function PaymentsPreview({
  slug,
  payments,
  sampleTotal,
}: {
  slug: string;
  payments: readonly PaymentAccount[];
  sampleTotal: number;
}) {
  const W = settingsWords.payments;
  const first = payments.find((p) => p.accountName && p.accountNumber);
  return (
    <Themed slug={slug}>
      <Card className="gap-3 py-5">
        <CardContent className="flex flex-col gap-3">
          <p className="text-base font-semibold text-foreground">{W.pvTitle}</p>
          <ul className="flex flex-col gap-2">
            {payments.map((p, i) => (
              <li
                key={p.id}
                data-picked={i === 0 ? '' : undefined}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm data-picked:border-shop-10 data-picked:bg-shop-10-soft"
              >
                <span className="text-muted-foreground [&_svg]:size-4">
                  {METHOD_ICON[p.method]}
                </span>
                <span className="font-medium text-foreground">{paymentLabel(p)}</span>
              </li>
            ))}
          </ul>
          {first ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              {W.pvSendExactly(
                formatPeso(sampleTotal),
                first.accountName ?? '',
                first.accountNumber ?? '',
              )}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Themed>
  );
}
