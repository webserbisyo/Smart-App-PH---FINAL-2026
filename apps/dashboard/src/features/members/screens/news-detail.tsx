import * as React from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  CircleAlertIcon,
  CopyIcon,
  PencilIcon,
  Trash2Icon,
  WifiOffIcon,
  XIcon,
} from 'lucide-react';
import {
  actionWords,
  errorWords,
  formatManila,
  formatPeso,
  membersWords,
  newsWords,
  type OwnerNews,
} from '@smartapp/core';
import { errorCodeOf, useCancelNews, useDeleteNews, useNews, useOwnerItems } from '@smartapp/data';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Button } from '@smartapp/ui/components/button';
import { Progress } from '@smartapp/ui/components/progress';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { Notice } from '@/app/notice';
import { PageError } from '@/app/page-state';
import { useOnlineStatus } from '@/app/use-online-status';
import { NewsStatusBadge, newsWhen, pct } from '../news-bits.js';
import { LockScreen, NewsCard, type PreviewPhone } from '../news-preview.js';

const W = newsWords.detail;
const NW = newsWords;

/** One news (/members/news/:id): what was sent and its results, or Edit, Cancel and Delete before it goes. */
export function NewsDetailScreen() {
  const { newsId } = useParams({ strict: false });
  const query = useNews(newsId ?? null);
  const news = query.data;

  let body: React.ReactNode;
  if (query.isPending) {
    body = (
      <div className="grid gap-4 md:grid-cols-5" aria-hidden="true">
        <Skeleton className="h-64 rounded-4xl md:col-span-2" />
        <Skeleton className="h-64 rounded-xl md:col-span-3" />
      </div>
    );
  } else if (query.isError || !news) {
    body = (
      <PageError
        title={NW.empty.errorTitle}
        message={
          errorCodeOf(query.error) === 'not_found'
            ? NW.compose.notFound
            : errorWords(errorCodeOf(query.error))
        }
        retryLabel={membersWords.states.tryAgain}
        onRetry={() => void query.refetch()}
      />
    );
  } else body = <DetailBody news={news} />;

  return (
    <div className="flex min-h-full flex-col pb-24 md:pb-8">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-3 md:px-6 md:pt-4">
        {news ? (
          <h1 className="mb-3 text-lg font-bold text-balance md:text-xl">{news.title}</h1>
        ) : null}
        {body}
      </main>
    </div>
  );
}

function DetailBody({ news }: { news: OwnerNews }) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const items = useOwnerItems().data ?? [];
  const cancel = useCancelNews();
  const remove = useDeleteNews();
  const cancelAction = useAsyncAction();
  const deleteAction = useAsyncAction();
  const [asking, setAsking] = React.useState<'cancel' | 'delete' | null>(null);
  const [phone, setPhone] = React.useState<PreviewPhone>('android');
  const r = news.results;
  const opens =
    news.link.kind === 'item'
      ? (items.find((i) => i.id === news.link.itemId)?.name ?? news.itemName ?? W.itemGone)
      : NW.compose.link[news.link.kind];
  const editable =
    news.status === 'draft' ||
    news.status === 'scheduled' ||
    news.status === 'waiting' ||
    news.status === 'canceled';

  const onCancel = async () => {
    try {
      await cancelAction.run(() => cancel.mutateAsync(news.id));
      setAsking(null);
      notify({ title: W.canceled, tone: 'success' });
    } catch (err) {
      setAsking(null);
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };
  const onDelete = async () => {
    try {
      await deleteAction.run(() => remove.mutateAsync(news.id));
      setAsking(null);
      notify({ title: W.deleted, tone: 'success' });
      void navigate({ to: '/members/news', replace: true });
    } catch (err) {
      setAsking(null);
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  return (
    <div className="grid items-start gap-5 md:grid-cols-5">
      <div className="flex flex-col gap-2 md:col-span-2">
        <div className="flex gap-1.5">
          {(['android', 'ios'] as const).map((p) => (
            <Button
              key={p}
              variant="outline"
              aria-pressed={phone === p}
              className="h-10 rounded-full aria-pressed:border-primary aria-pressed:bg-accent md:h-8"
              onClick={() => setPhone(p)}
            >
              {NW.compose[p]}
            </Button>
          ))}
        </div>
        <LockScreen>
          <NewsCard
            title={news.title}
            body={news.body}
            photo={news.imageUrl}
            phone={phone}
            pulled={phone === 'android'}
          />
        </LockScreen>
      </div>

      <div className="flex min-w-0 flex-col gap-4 md:col-span-3">
        {!online ? (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
            {membersWords.states.offline}
          </Notice>
        ) : null}
        {news.status === 'waiting' && news.waitReason ? (
          <Notice tone="error" icon={<CircleAlertIcon className="size-4" />}>
            {NW.waitReason[news.waitReason]}
          </Notice>
        ) : null}

        <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <NewsStatusBadge status={news.status} />
            <span className="text-sm text-muted-foreground">{newsWhen(news)}</span>
          </div>
          <dl className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">{W.who}</dt>
            <dd className="col-span-2 font-medium">{NW.audience[news.audience]}</dd>
            <dt className="text-muted-foreground">{W.phones}</dt>
            <dd className="col-span-2 font-medium tabular-nums">{NW.phones(news.phones)}</dd>
            <dt className="text-muted-foreground">{W.opens}</dt>
            <dd className="col-span-2 font-medium">{opens}</dd>
            {news.sendAt && news.status !== 'sent' ? (
              <>
                <dt className="text-muted-foreground">{W.when}</dt>
                <dd className="col-span-2 font-medium">{formatManila(news.sendAt)}</dd>
              </>
            ) : null}
          </dl>
          {news.status === 'sending' ? (
            <div className="flex flex-col gap-1">
              <Progress value={pct(news.progress ?? 0, news.phones)} aria-label={W.sendingLine} />
              <span className="text-xs text-muted-foreground tabular-nums">
                {W.sendingLine} {W.of(news.progress ?? 0, news.phones)}
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
            {news.status === 'draft' || news.status === 'canceled' ? (
              <Button
                variant="outline"
                className="h-11 gap-1.5 text-destructive-text md:h-9"
                disabled={!online}
                onClick={() => setAsking('delete')}
              >
                <Trash2Icon aria-hidden="true" />
                {W.delete}
              </Button>
            ) : null}
            {news.status === 'scheduled' || news.status === 'waiting' ? (
              <Button
                variant="outline"
                className="h-11 gap-1.5 md:h-9"
                disabled={!online}
                onClick={() => setAsking('cancel')}
              >
                <XIcon aria-hidden="true" />
                {W.cancel}
              </Button>
            ) : null}
            {news.status === 'sent' || news.status === 'scheduled' ? (
              <Button
                variant="outline"
                className="h-11 gap-1.5 md:h-9"
                nativeButton={false}
                render={<Link to="/members/news/new" search={{ copy: news.id }} />}
                onClick={() => notify({ title: W.copied, tone: 'info' })}
              >
                <CopyIcon aria-hidden="true" />
                {W.copy}
              </Button>
            ) : null}
            {editable ? (
              <Button
                className="h-11 gap-1.5 md:h-9"
                nativeButton={false}
                render={<Link to="/members/news/new" search={{ id: news.id }} />}
              >
                <PencilIcon aria-hidden="true" />
                {news.status === 'waiting' ? W.fix : W.edit}
              </Button>
            ) : null}
          </div>
        </section>

        {r ? (
          <section className="flex flex-col gap-3" aria-labelledby="news-results">
            <h2 id="news-results" className="text-sm font-semibold text-muted-foreground">
              {W.results}
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Result
                label={W.opened}
                value={W.of(r.opened, r.sent)}
                line={W.openedLine(pct(r.opened, r.sent))}
              />
              <Result
                label={W.ordered}
                value={`${r.ordered} · ${formatPeso(r.sales)}`}
                line={W.orderedLine}
              />
              <Result
                label={W.stopped}
                value={String(r.stopped)}
                line={W.stoppedLine(r.stopped)}
                className="col-span-2 lg:col-span-1"
              />
            </div>
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold">{W.funnel}</h3>
              {(
                [
                  ['sent', r.sent],
                  ['opened', r.opened],
                  ['ordered', r.ordered],
                ] as const
              ).map(([step, value]) => (
                <div key={step} className="flex items-center gap-3 text-sm">
                  <span className="w-20 shrink-0">{W.funnelSteps[step]}</span>
                  <Progress
                    value={Math.max(3, pct(value, r.sent))}
                    aria-label={W.funnelSteps[step]}
                    className="min-w-0 flex-1"
                  />
                  <b className="w-24 shrink-0 text-right tabular-nums">
                    {value.toLocaleString('en-PH')} · {pct(value, r.sent)}%
                  </b>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{W.sentNote(r.android, r.ios)}</p>
            </div>
          </section>
        ) : null}
      </div>

      <AlertDialog open={asking !== null} onOpenChange={(open) => !open && setAsking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {asking === 'delete' ? W.deleteTitle : W.cancelTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {asking === 'delete' ? W.deleteBody : W.cancelBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">{W.cancelNo}</AlertDialogCancel>
            <AsyncButton
              variant="destructive"
              className="h-11 font-semibold md:h-9"
              status={asking === 'delete' ? deleteAction.status : cancelAction.status}
              busyLabel={asking === 'delete' ? actionWords.deleting : actionWords.saving}
              doneLabel={asking === 'delete' ? actionWords.deleted : actionWords.saved}
              onClick={() => void (asking === 'delete' ? onDelete() : onCancel())}
            >
              {asking === 'delete' ? W.deleteYes : W.cancelYes}
            </AsyncButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Result({
  label,
  value,
  line,
  className,
}: {
  label: string;
  value: string;
  line: string;
  className?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col gap-0.5 rounded-xl border bg-card p-4 ${className ?? ''}`}
    >
      <h3 className="text-xs font-semibold text-muted-foreground">{label}</h3>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{line}</p>
    </section>
  );
}
