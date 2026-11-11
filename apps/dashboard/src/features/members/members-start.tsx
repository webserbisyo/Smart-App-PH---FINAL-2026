import * as React from 'react';
import { CircleDashedIcon, DownloadIcon, PartyPopperIcon, TrophyIcon } from 'lucide-react';
import { membersWords, milestoneJustReached } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { QRCode, QRCodeDownload, QRCodeSvg } from '@smartapp/ui/components/qr-code';
import { rewardReady } from '@smartapp/ui/compositions/celebrate';
import { CopyButton } from '@smartapp/ui/compositions/copy-button';
import { DrawnCheckIcon } from '@smartapp/ui/compositions/drawn-check';
import { cn } from 'cn';
import { Notice } from '@/app/notice';

const W = membersWords;

function Step({
  done,
  title,
  body,
  children,
}: {
  done: boolean;
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          done ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {done ? <DrawnCheckIcon /> : <CircleDashedIcon className="size-4" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
        <div>
          <p className={cn('text-sm font-semibold', done && 'text-success-text')}>{title}</p>
          {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
        </div>
        {children}
      </div>
    </li>
  );
}

/**
 * A new shop's first day on Members (T63): three steps, and the counter QR to download and print. The
 * last step ticks itself when the first member joins (the page then shows the list).
 */
export function MembersStart({
  cardOn,
  welcome,
  url,
  slug,
  online,
  turningOn,
  onTurnOn,
}: {
  cardOn: boolean;
  welcome: boolean;
  url: string;
  slug: string;
  online: boolean;
  turningOn: boolean;
  onTurnOn: () => void;
}) {
  return (
    <section
      aria-labelledby="start-title"
      className="mx-auto flex w-full max-w-xl flex-col gap-5 rounded-xl border border-border bg-card p-4 shadow-xs md:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-member-soft text-member-text">
          <PartyPopperIcon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="start-title" className="text-lg font-bold">
            {W.start.title}
          </h2>
          <p className="text-sm text-muted-foreground">{W.start.body}</p>
        </div>
      </div>
      <ol className="flex flex-col gap-5">
        <Step done={cardOn} title={cardOn ? W.start.stepCardDone : W.start.stepCard}>
          {cardOn ? null : (
            <Button
              className="h-11 self-start md:h-10"
              disabled={!online || turningOn}
              onClick={onTurnOn}
            >
              {W.states.turnOn}
            </Button>
          )}
        </Step>
        <Step done={false} title={W.start.stepQr} body={W.start.stepQrBody}>
          {/* The QR stays black on white so any phone camera reads it. */}
          <QRCode value={url} size={512} className="flex flex-col items-start gap-3">
            <figure className="flex flex-col items-center gap-2 rounded-2xl bg-paper p-3 text-paper-foreground ring-1 ring-foreground/8">
              <QRCodeSvg
                role="img"
                aria-label={W.start.qrLabel}
                className="size-40! overflow-hidden rounded-sm *:size-full"
              />
              <figcaption className="text-center text-xs font-semibold">
                {W.start.qrLabel}
              </figcaption>
            </figure>
            <div className="flex flex-wrap gap-2">
              <QRCodeDownload
                filename={`${slug}-counter-qr`}
                format="png"
                render={<Button variant="outline" className="h-11 gap-1.5 md:h-10" />}
              >
                <DownloadIcon aria-hidden="true" />
                {W.start.download}
              </QRCodeDownload>
              <CopyButton value={url} label={W.start.copy} className="h-11 md:h-10" />
            </div>
          </QRCode>
        </Step>
        <Step done={false} title={W.start.stepFirst} body={W.start.stepFirstBody(welcome)} />
      </ol>
    </section>
  );
}

const seenKey = (slug: string): string => `smartapp:members-milestone:${slug}`;

function readSeen(slug: string): number {
  try {
    return Number(window.localStorage.getItem(seenKey(slug)) ?? 0) || 0;
  } catch {
    return 0;
  }
}

/**
 * A one-time celebration at 10, 25, 50, 100 … members (T62), remembered on this device, and only while
 * it is news: the members who joined in the last 30 days crossed it.
 */
export function MilestoneNotice({
  slug,
  members,
  joined,
}: {
  slug: string;
  members: number;
  joined: number;
}) {
  const reached = milestoneJustReached(members, joined);
  const [seen, setSeen] = React.useState(() => readSeen(slug));
  const show = reached !== null && reached > seen;

  React.useEffect(() => {
    if (show) void rewardReady();
  }, [show]);

  if (!show) return null;
  const close = () => {
    try {
      window.localStorage.setItem(seenKey(slug), String(reached));
    } catch {
      // Private mode: it shows again next time, which is fine.
    }
    setSeen(reached);
  };
  return (
    <Notice
      tone="brand"
      icon={<TrophyIcon className="size-4 text-warning-text" />}
      action={
        <Button variant="outline" className="h-11 w-full sm:w-auto md:h-8" onClick={close}>
          {W.milestone.close}
        </Button>
      }
    >
      <p className="font-semibold">{W.milestone.title(reached)}</p>
      <p className="hidden text-sm sm:block">{W.milestone.body(reached)}</p>
    </Notice>
  );
}
