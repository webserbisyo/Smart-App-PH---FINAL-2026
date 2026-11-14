import * as React from 'react';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleSlashIcon,
  FlaskConicalIcon,
  PlugZapIcon,
  RadioTowerIcon,
  RotateCcwIcon,
  SendIcon,
  WifiOffIcon,
} from 'lucide-react';
import {
  adminWords,
  errorWords,
  formatManila,
  formatPeso,
  type TrackEvent,
  type TrackStatus,
  type TrackingSummary,
} from '@smartapp/core';
import {
  errorCodeOf,
  useRetryTrackEvents,
  useSendTestEvent,
  useSetTracking,
  useTracking,
} from '@smartapp/data';
import { Badge } from '@smartapp/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartapp/ui/components/card';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@smartapp/ui/components/table';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { cn } from 'cn';
import { Notice } from '@/app/notice';
import { useNow } from '@/app/orders/use-now';
import { PageEmpty, PageError } from '@/app/page-state';
import { useOnlineStatus } from '@/app/use-online-status';
import { agoText } from '../look.js';

const A = adminWords;
const T = A.tracking;

const failed = (err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });

const STATUS_LOOK: Record<TrackStatus, { icon: React.ReactNode; className: string }> = {
  queued: { icon: <CircleDashedIcon />, className: 'bg-muted text-muted-foreground' },
  sent: { icon: <CircleCheckIcon />, className: 'bg-success-soft text-success-text' },
  failed: { icon: <CircleAlertIcon />, className: 'bg-destructive/10 text-destructive-text' },
  skipped: { icon: <CircleSlashIcon />, className: 'bg-muted text-muted-foreground' },
};

/**
 * Tracking (decision T90): whether Meta hears us, the sending and test switches, which ad brings paying
 * shops, and every event with its status. Failed events can be sent again. The pixel ID and the token live
 * on the server, never on this page.
 */
export function AdminTrackingScreen() {
  const tracking = useTracking();
  const online = useOnlineStatus();

  let body: React.ReactNode;
  if (tracking.isPending) {
    body = (
      <div className="flex flex-col gap-3" aria-busy="true" aria-hidden="true">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  } else if (tracking.isError && !tracking.data) {
    body = (
      <PageError
        title={A.loadError}
        message={errorWords(errorCodeOf(tracking.error))}
        retryLabel={A.tryAgain}
        onRetry={() => void tracking.refetch()}
      />
    );
  } else {
    const data = tracking.data;
    body = (
      <div className="grid gap-3 md:gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-3 md:gap-4 lg:col-span-2">
          <StatusCard data={data} />
          <ByAdCard data={data} />
        </div>
        <EventsCard data={data} className="lg:col-span-3" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col pb-24 md:pb-8">
      <PageHeader title={T.title} />
      <div className="flex flex-col gap-3 px-4 pt-3 md:gap-4 md:px-6 md:pt-4">
        <p className="text-sm text-muted-foreground">{T.line}</p>
        {!online ? (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
            {A.loadError}
          </Notice>
        ) : null}
        {body}
      </div>
    </div>
  );
}

function StatusCard({ data }: { data: TrackingSummary }) {
  const now = useNow(60_000).getTime();
  const set = useSetTracking();
  const test = useSendTestEvent();
  const testAction = useAsyncAction();

  const flip = (patch: Partial<{ sending: boolean; testMode: boolean }>) => {
    set.mutate({ sending: data.sending, testMode: data.testMode, ...patch }, { onError: failed });
  };

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <RadioTowerIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          {T.meta}
          {data.connected ? (
            <Badge className="gap-1 bg-success-soft text-success-text [&_svg]:size-3.5">
              <CircleCheckIcon />
              {T.connected}
            </Badge>
          ) : (
            <Badge className="gap-1 bg-warning-soft text-warning-text [&_svg]:size-3.5">
              <PlugZapIcon />
              {T.notConnected}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {data.lastEventAt ? T.lastEvent(agoText(data.lastEventAt, now)) : T.noEvents}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!data.connected ? (
          <Notice tone="warning" icon={<PlugZapIcon className="size-4" />}>
            {T.notConnectedLine}
          </Notice>
        ) : null}
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="tracking-sending">
              {data.sending ? T.sending : T.paused}
            </FieldLabel>
          </FieldContent>
          <Switch
            id="tracking-sending"
            checked={data.sending}
            disabled={set.isPending}
            onCheckedChange={(sending) => flip({ sending })}
          />
        </Field>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="tracking-test">{T.testMode}</FieldLabel>
            <FieldDescription>{T.testModeLine}</FieldDescription>
          </FieldContent>
          <Switch
            id="tracking-test"
            checked={data.testMode}
            disabled={set.isPending}
            onCheckedChange={(testMode) => flip({ testMode })}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <AsyncButton
            status={testAction.status}
            busyLabel={T.testing}
            doneLabel={T.testSent}
            variant="outline"
            className="h-11 gap-1.5 md:h-9"
            onClick={() => {
              void testAction
                .run(() => test.mutateAsync())
                .then(() =>
                  notify({ title: T.testSent, description: T.testSentLine, tone: 'success' }),
                )
                .catch(failed);
            }}
          >
            <FlaskConicalIcon aria-hidden="true" />
            {T.sendTest}
          </AsyncButton>
          {data.failed > 0 ? <RetryButton failedCount={data.failed} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function RetryButton({ failedCount }: { failedCount: number }) {
  const retry = useRetryTrackEvents();
  const action = useAsyncAction();
  return (
    <AsyncButton
      status={action.status}
      busyLabel={T.retrying}
      doneLabel={T.retried}
      className="h-11 gap-1.5 md:h-9"
      onClick={() => {
        void action
          .run(() => retry.mutateAsync())
          .then(() => notify({ title: T.retried, tone: 'success' }))
          .catch(failed);
      }}
    >
      <RotateCcwIcon aria-hidden="true" />
      {T.retry} ({T.failed(failedCount)})
    </AsyncButton>
  );
}

function ByAdCard({ data }: { data: TrackingSummary }) {
  const C = T.columns;
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>{T.byAd}</CardTitle>
        <CardDescription>{T.byAdHint}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.byAd.length === 0 ? (
          <p className="text-sm text-muted-foreground">{T.noEvents}</p>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{C.ad}</TableHead>
                  <TableHead className="text-right">{C.leads}</TableHead>
                  <TableHead className="text-right">{C.signedUp}</TableHead>
                  <TableHead className="text-right">{C.live}</TableHead>
                  <TableHead className="text-right">{C.paying}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byAd.map((row) => (
                  <TableRow key={row.campaign ?? 'none'}>
                    <TableCell className="max-w-40 truncate font-medium">
                      {row.campaign ?? T.noAd}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.leads}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.signedUp}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.live}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {row.paying}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventsCard({ data, className }: { data: TrackingSummary; className?: string }) {
  return (
    <Card className={cn('gap-3', className)}>
      <CardHeader>
        <CardTitle>{T.events}</CardTitle>
        <CardDescription>{T.eventsHint}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.events.length === 0 ? (
          <PageEmpty
            icon={<SendIcon className="size-8 text-muted-foreground" />}
            title={T.noEvents}
            className="py-8 md:py-10"
          />
        ) : (
          <ul className="flex flex-col divide-y">
            {data.events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EventRow({ event }: { event: TrackEvent }) {
  const look = STATUS_LOOK[event.status];
  return (
    <li className="flex min-w-0 items-start gap-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold">{T.names[event.name]}</span>
          <span className="font-mono text-xs text-muted-foreground">{event.name}</span>
          {event.test ? (
            <Badge className="gap-1 bg-info-soft text-info-text [&_svg]:size-3.5">
              <FlaskConicalIcon />
              {T.test}
            </Badge>
          ) : null}
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {event.subject}
          {event.value !== null ? ` · ${T.value(formatPeso(event.value))}` : ''}
          {` · ${T.via[event.via]}`}
        </span>
        {event.problem ? (
          <span className="text-xs text-destructive-text">{T.problem[event.problem]}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge className={cn('gap-1 [&_svg]:size-3.5', look.className)}>
          {look.icon}
          {T.status[event.status]}
        </Badge>
        <span className="text-xs text-muted-foreground">{formatManila(event.at, 'datetime')}</span>
      </div>
    </li>
  );
}
