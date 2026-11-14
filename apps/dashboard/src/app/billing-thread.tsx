import * as React from 'react';
import {
  CalendarPlusIcon,
  CheckIcon,
  HourglassIcon,
  LifeBuoyIcon,
  RocketIcon,
  SendIcon,
  XIcon,
} from 'lucide-react';
import {
  billingWords,
  errorWords,
  formatClock,
  formatManila,
  formatPeso,
  words,
  type BillingMessage,
  type PlanPayment,
} from '@smartapp/core';
import { errorCodeOf } from '@smartapp/data';
import { Attachment, AttachmentMedia, AttachmentTrigger } from '@smartapp/ui/components/attachment';
import { Bubble, BubbleContent } from '@smartapp/ui/components/bubble';
import { Field, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Marker, MarkerContent, MarkerIcon } from '@smartapp/ui/components/marker';
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageGroup,
} from '@smartapp/ui/components/message';
import { Textarea } from '@smartapp/ui/components/textarea';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { CopyButton } from '@smartapp/ui/compositions/copy-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { cn } from 'cn';
import { useOnlineStatus } from './use-online-status.js';

const W = billingWords;
const NOTE_MAX = 300;

/** A Manila day (YYYY-MM-DD) as "Fri 13 Nov". */
export function dayText(date: string): string {
  return formatManila(new Date(`${date}T12:00:00+08:00`), 'date');
}

const when = (at: string) => `${formatManila(at, 'date')} · ${formatClock(at)}`;

/**
 * The Billing chat (decision T88): one thread per shop between the owner and Smart App PH, on the owner's
 * Plan page and in Super Admin. Built from the same installed pieces as the order chat (T87): Message,
 * Bubble, Attachment and Marker. Each side sees its own lines on the right.
 */
export function BillingThread({
  thread,
  payments,
  viewer,
  ownerName,
}: {
  thread: readonly BillingMessage[];
  payments: readonly PlanPayment[];
  viewer: 'owner' | 'admin';
  ownerName: string;
}) {
  const [zoom, setZoom] = React.useState<string | null>(null);
  const byId = new Map(payments.map((p) => [p.id, p]));
  const who = (from: BillingMessage['from']) =>
    from === 'owner'
      ? viewer === 'owner'
        ? W.you
        : ownerName
      : viewer === 'admin'
        ? W.you
        : W.smartApp;

  if (thread.length === 0) return <p className="text-sm text-muted-foreground">{W.empty}</p>;

  return (
    <MessageGroup className="gap-4">
      {thread.map((m) => {
        if (m.from === 'system') {
          const icon = m.kind === 'support' ? <LifeBuoyIcon /> : <RocketIcon />;
          return (
            <Marker key={m.id} variant="separator">
              <MarkerIcon>{icon}</MarkerIcon>
              <MarkerContent className="tabular-nums">
                {m.kind === 'support' ? W.support : W.live} · {formatManila(m.at, 'date')}
              </MarkerContent>
            </Marker>
          );
        }
        const mine = (m.from === 'owner') === (viewer === 'owner');
        const payment = m.paymentId ? byId.get(m.paymentId) : undefined;
        return (
          <Message key={m.id} align={mine ? 'end' : 'start'}>
            <MessageContent>
              <Line message={m} payment={payment} onZoom={setZoom} />
              <MessageFooter className="gap-1.5 tabular-nums">
                {m.kind === 'payment' && payment?.status === 'pending' ? (
                  <HourglassIcon aria-hidden="true" className="size-3.5 text-warning-text" />
                ) : null}
                <span>{`${who(m.from)} · ${when(m.at)}`}</span>
              </MessageFooter>
            </MessageContent>
          </Message>
        );
      })}
      <ResponsiveDialog
        open={zoom !== null}
        onOpenChange={(next) => {
          if (!next) setZoom(null);
        }}
        title={W.photo}
      >
        {zoom ? (
          <img
            src={zoom}
            alt={W.photoAlt}
            className="mx-auto max-h-vh-70 w-auto rounded-xl border object-contain"
          />
        ) : null}
      </ResponsiveDialog>
    </MessageGroup>
  );
}

function Line({
  message: m,
  payment,
  onZoom,
}: {
  message: BillingMessage;
  payment: PlanPayment | undefined;
  onZoom: (src: string) => void;
}) {
  switch (m.kind) {
    case 'payment':
      return payment ? <PaymentLine payment={payment} onZoom={onZoom} /> : null;
    case 'approved':
      return (
        <Bubble variant="default">
          <BubbleContent className="flex items-start gap-1.5">
            <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {W.approved(payment ? dayText(payment.coversUntil) : '')}
              {m.text ? ` ${m.text}` : ''}
            </span>
          </BubbleContent>
        </Bubble>
      );
    case 'rejected':
      return (
        <Bubble variant="destructive">
          <BubbleContent className="flex items-start gap-1.5">
            <XIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {W.rejected(m.reason ? W.reasons[m.reason] : '')}
          </BubbleContent>
        </Bubble>
      );
    case 'extra_days':
      return (
        <Bubble variant="tinted">
          <BubbleContent className="flex items-start gap-1.5">
            <CalendarPlusIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {W.extraDays(m.days ?? 1)}
          </BubbleContent>
        </Bubble>
      );
    case 'reminder':
      return (
        <Bubble variant="tinted">
          <BubbleContent>{W.reminder}</BubbleContent>
        </Bubble>
      );
    case 'note':
    case 'support':
    case 'live':
      return (
        <Bubble variant="muted">
          <BubbleContent className="whitespace-pre-line">{m.text ?? ''}</BubbleContent>
        </Bubble>
      );
  }
}

function PaymentLine({
  payment: p,
  onZoom,
}: {
  payment: PlanPayment;
  onZoom: (src: string) => void;
}) {
  return (
    <>
      {p.proofUrl ? (
        <Attachment orientation="vertical" state="done" className="w-full max-w-44">
          <AttachmentMedia variant="image" className="aspect-auto h-56">
            <img src={p.proofUrl} alt={W.photoAlt} className="size-full object-cover object-top" />
          </AttachmentMedia>
          <AttachmentTrigger aria-label={W.zoom} onClick={() => p.proofUrl && onZoom(p.proofUrl)} />
        </Attachment>
      ) : null}
      <Bubble variant="muted">
        <BubbleContent className="flex flex-col gap-1">
          <span className="font-semibold tabular-nums">
            {W.paymentSent(formatPeso(p.amount), p.months)}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {words.shop.paymentMethod[p.method]} ·
            <span className="font-mono">{W.reference(p.reference)}</span>
            <CopyButton value={p.reference} iconOnly className="-my-1 size-8" />
          </span>
        </BubbleContent>
      </Bubble>
    </>
  );
}

/** Write a note into the Billing chat (300 letters at most). */
export function BillingComposer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => Promise<unknown>;
  disabled?: boolean | undefined;
}) {
  const online = useOnlineStatus();
  const action = useAsyncAction();
  const [text, setText] = React.useState('');
  const tooLong = text.trim().length > NOTE_MAX;
  const id = React.useId();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = text.trim();
        if (!clean || tooLong) return;
        void action
          .run(async () => {
            await onSend(clean);
            setText('');
          })
          .catch((err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }));
      }}
    >
      <Field data-invalid={tooLong ? true : undefined}>
        <FieldLabel htmlFor={id} className="sr-only">
          {W.write}
        </FieldLabel>
        <Textarea
          id={id}
          value={text}
          rows={2}
          placeholder={W.write}
          className="min-h-11 text-base md:text-sm"
          aria-invalid={tooLong ? true : undefined}
          onChange={(e) => setText(e.target.value)}
        />
        {tooLong ? <FieldError>{W.tooLong}</FieldError> : null}
      </Field>
      <AsyncButton
        type="submit"
        status={action.status}
        busyLabel={W.sending}
        doneLabel={W.sent}
        disabled={!online || disabled || text.trim().length === 0 || tooLong}
        className={cn('h-11 self-end md:h-9')}
      >
        <SendIcon aria-hidden="true" />
        {W.send}
      </AsyncButton>
    </form>
  );
}
