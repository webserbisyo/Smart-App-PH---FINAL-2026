import { Link } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  BanIcon,
  BellIcon,
  CheckCheckIcon,
  ClockIcon,
  PencilIcon,
  SendIcon,
} from 'lucide-react';
import {
  formatManila,
  formatPeso,
  newsWords,
  type NewsStatus,
  type OwnerNews,
} from '@smartapp/core';
import { Status } from '@smartapp/ui/components/status';
import { cn } from 'cn';
import { newsPhotoSrc } from './news-preview.js';

const W = newsWords;

// Status = icon + word + colour (rule 6).
const LOOK: Record<NewsStatus, { icon: typeof BellIcon; className: string }> = {
  draft: { icon: PencilIcon, className: 'border-border bg-muted text-muted-foreground' },
  scheduled: { icon: ClockIcon, className: 'border-info/30 bg-info-soft text-info-text' },
  sending: { icon: SendIcon, className: 'border-warning/40 bg-warning-soft text-warning-text' },
  sent: { icon: CheckCheckIcon, className: 'border-success/30 bg-success-soft text-success-text' },
  waiting: {
    icon: AlertCircleIcon,
    className: 'border-destructive/30 bg-destructive-soft text-destructive-text',
  },
  canceled: { icon: BanIcon, className: 'border-border bg-muted text-muted-foreground' },
};

export function NewsStatusBadge({ status }: { status: NewsStatus }) {
  const look = LOOK[status];
  const Icon = look.icon;
  return (
    <Status className={cn('gap-1 px-2 py-0.5', look.className)}>
      <Icon aria-hidden="true" className="size-3" />
      {W.status[status]}
    </Status>
  );
}

/** "Sent Sat 15 Nov, 11 AM", "Sends …", "Edited …", "Going out now". */
export function newsWhen(news: OwnerNews): string {
  if (news.status === 'sending') return W.when.sending;
  if (news.status === 'sent' && news.sentAt) return W.when.sent(formatManila(news.sentAt));
  if ((news.status === 'scheduled' || news.status === 'waiting') && news.sendAt)
    return W.when.scheduled(formatManila(news.sendAt));
  return W.when.draft(formatManila(news.updatedAt));
}

export const pct = (n: number, of: number) => (of > 0 ? Math.round((100 * n) / of) : 0);

export function NewsRow({ news }: { news: OwnerNews }) {
  const src = newsPhotoSrc(news.imageUrl, 96);
  const r = news.results;
  return (
    <li>
      <Link
        to="/members/news/$newsId"
        params={{ newsId: news.id }}
        className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted/50 focus-visible:bg-muted/50"
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
          {src ? (
            <img src={src} alt="" className="size-full object-cover" />
          ) : (
            <BellIcon aria-hidden="true" className="size-4.5" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-semibold">{news.title}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <NewsStatusBadge status={news.status} />
            <span>{newsWhen(news)}</span>
            <span aria-hidden="true">·</span>
            <span>{W.audience[news.audience]}</span>
            {news.status === 'sending' && news.progress !== null ? (
              <span className="tabular-nums">{W.list.sending(news.progress, news.phones)}</span>
            ) : null}
          </span>
        </span>
        {r ? (
          <span className="hidden shrink-0 gap-5 text-right text-xs text-muted-foreground tabular-nums sm:flex">
            <span className="flex flex-col">
              <b className="text-sm text-foreground">{pct(r.opened, r.sent)}%</b>
              {W.list.opened}
            </span>
            <span className="flex flex-col">
              <b className="text-sm text-foreground">{r.ordered}</b>
              {W.list.orders}
            </span>
            <span className="flex flex-col">
              <b className="text-sm text-foreground">{formatPeso(r.sales)}</b>
              {W.list.sales}
            </span>
          </span>
        ) : null}
      </Link>
    </li>
  );
}
