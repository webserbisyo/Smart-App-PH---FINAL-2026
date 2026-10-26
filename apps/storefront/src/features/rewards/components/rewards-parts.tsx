'use client';

import { useState } from 'react';
import { SunIcon } from 'lucide-react';
import { artPath, formatManila, words, type MemberAccount } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { QRCode, QRCodeSvg } from '@smartapp/ui/components/qr-code';
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
} from '@smartapp/ui/components/reui/timeline';
import { EmptyState } from '@smartapp/ui/compositions/empty-state';
import { ledgerLine } from '../rewards-rules';

const W = words.rewards;
const PAGE = 20;

// Dot colours by kind: stamps in, pending, used, taken back.
const DOT: Record<MemberAccount['history'][number]['kind'], string> = {
  welcome: 'bg-member',
  pending: 'bg-warning',
  earned: 'bg-success',
  redeemed: 'bg-highlight',
  reversed: 'bg-destructive',
  given: 'bg-success',
  removed: 'bg-destructive',
};

/** Every stamp change, newest first (c-timeline-7 look), 20 at a time. */
export function StampHistory({ history }: { history: MemberAccount['history'] }) {
  const [shown, setShown] = useState(PAGE);
  if (history.length === 0) {
    return (
      <EmptyState
        variant="plain"
        art={artPath('gift')}
        title={W.historyEmpty}
        description={W.historyEmptyBody}
      />
    );
  }
  return (
    <section
      aria-label={W.historyTitle}
      className="flex flex-col gap-4 rounded-3xl bg-card p-4 shadow-xs ring-1 ring-foreground/8 sm:p-5"
    >
      <Timeline defaultValue={0} className="gap-4">
        {history.slice(0, shown).map((entry, index) => (
          <TimelineItem
            key={`${entry.at}-${index}`}
            step={index + 1}
            className="group-orientation-vertical/timeline:not-last:pb-0"
          >
            <TimelineHeader className="flex items-center gap-2.5">
              <TimelineSeparator />
              <TimelineIndicator className={`size-2.5 border-none ${DOT[entry.kind]}`} />
              <TimelineDate className="mb-0 text-xs font-semibold text-muted-foreground">
                {formatManila(entry.at, 'datetime')}
              </TimelineDate>
            </TimelineHeader>
            <TimelineContent className="flex items-baseline justify-between gap-3 text-sm font-medium text-foreground">
              <span>{ledgerLine(entry)}</span>
              <span
                className={`shrink-0 font-semibold tabular ${entry.delta < 0 ? 'text-destructive-text' : 'text-success-text'}`}
              >
                {W.delta(entry.delta)}
              </span>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
      {history.length > shown ? (
        <Button
          variant="outline"
          onClick={() => setShown((n) => n + PAGE)}
          className="h-11 self-center rounded-full px-6"
        >
          {W.showMore}
        </Button>
      ) : null}
    </section>
  );
}

/** The member code for walk-in stamps at the counter (c-card-1 look + DiceUI QR code). */
export function MemberQr({ account }: { account: MemberAccount }) {
  return (
    <section
      aria-labelledby="rewards-qr-title"
      className="flex flex-col items-center gap-4 rounded-3xl bg-card p-5 text-center shadow-xs ring-1 ring-foreground/8 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="rewards-qr-title" className="text-lg font-bold">
          {W.qrTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{W.qrHint}</p>
      </div>
      {/* Black on white on every shop, so any scanner reads it. */}
      <figure className="flex flex-col items-center gap-3 rounded-2xl bg-paper p-4 text-paper-foreground ring-1 ring-foreground/8">
        <QRCode value={account.memberCode} size={200}>
          <QRCodeSvg role="img" aria-label={W.qrLabel(account.memberCode)} />
        </QRCode>
        <figcaption className="font-mono text-2xl font-bold tracking-widest">
          {account.memberCode}
        </figcaption>
      </figure>
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold">{account.name}</span>
        <span className="text-sm text-muted-foreground">
          {W.since(formatManila(account.joinedAt, 'date'))}
        </span>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <SunIcon aria-hidden="true" className="size-4" />
        {W.brightness}
      </p>
    </section>
  );
}
