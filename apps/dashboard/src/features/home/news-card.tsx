import { Link } from '@tanstack/react-router';
import { ChevronRightIcon, CircleAlertIcon, MegaphoneIcon } from 'lucide-react';
import { formatPeso, newsWords } from '@smartapp/core';
import { useNewsOverview } from '@smartapp/data';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@smartapp/ui/components/item';
import { HomeCard } from '@/app/home/home-card';

const W = newsWords.entry;
const LAST_HOURS = 48;

/**
 * Push News on Home (T106): a news waiting for the owner (its link broke, the plan lapsed or the shop is
 * paused) comes first; otherwise the last news's result for 48 hours. Left out when there is neither.
 */
export function NewsHomeCard({ now, className }: { now: Date; className?: string | undefined }) {
  const overview = useNewsOverview().data;
  if (!overview) return null;
  const waiting = overview.news.find((n) => n.status === 'waiting');
  const last = overview.news.find(
    (n) =>
      n.status === 'sent' &&
      n.sentAt &&
      now.getTime() - new Date(n.sentAt).getTime() < LAST_HOURS * 60 * 60_000,
  );
  const news = waiting ?? last;
  if (!news) return null;
  const r = news.results;
  return (
    <HomeCard
      id="home-news"
      title={waiting ? newsWords.status.waiting : W.homeLast}
      className={className}
    >
      <Item
        variant="outline"
        className="min-h-14"
        render={<Link to="/members/news/$newsId" params={{ newsId: news.id }} />}
      >
        <ItemMedia>
          <IconTile
            variant="soft"
            size="sm"
            className={
              waiting ? 'bg-destructive-soft text-destructive-text' : 'bg-info-soft text-info-text'
            }
          >
            {waiting ? (
              <CircleAlertIcon aria-hidden="true" />
            ) : (
              <MegaphoneIcon aria-hidden="true" />
            )}
          </IconTile>
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle className="font-semibold">
            {waiting ? W.homeWaiting(news.title) : news.title}
          </ItemTitle>
          <ItemDescription className="truncate">
            {waiting && news.waitReason
              ? newsWords.waitReason[news.waitReason]
              : r
                ? W.homeLastLine(r.opened, r.ordered, formatPeso(r.sales))
                : null}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <span className="text-sm font-semibold text-primary">
            {waiting ? W.homeWaitingAction : W.homeLastAction}
          </span>
          <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        </ItemActions>
      </Item>
    </HomeCard>
  );
}
