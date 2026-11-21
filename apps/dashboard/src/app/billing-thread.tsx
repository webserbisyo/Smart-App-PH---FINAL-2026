import * as React from 'react';
import {
  ArrowDownIcon,
  CalendarPlusIcon,
  CheckCheckIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CropIcon,
  HourglassIcon,
  ImageOffIcon,
  ImagePlusIcon,
  LifeBuoyIcon,
  RocketIcon,
  RotateCwIcon,
  SendIcon,
  XIcon,
} from 'lucide-react';
import {
  BILLING_PHOTOS_PER_SEND,
  UPLOAD_ACCEPT,
  billingWords,
  errorWords,
  formatClock,
  formatManila,
  formatPeso,
  settingsWords,
  words,
  type BillingMessage,
  type PlanPayment,
} from '@smartapp/core';
import { errorCodeOf } from '@smartapp/data';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTrigger,
} from '@smartapp/ui/components/attachment';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import { Bubble, BubbleContent } from '@smartapp/ui/components/bubble';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Marker, MarkerContent, MarkerIcon } from '@smartapp/ui/components/marker';
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
} from '@smartapp/ui/components/message';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Textarea } from '@smartapp/ui/components/textarea';
import { CopyButton } from '@smartapp/ui/compositions/copy-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { cn } from 'cn';
import { CropStep, type CropShape } from './crop-step.js';
import { useImageUpload } from './image-upload-row.js';
import { useOnlineStatus } from './use-online-status.js';

const W = billingWords;
const NOTE_MAX = 300;
// Lines from one side within 5 minutes read as one group: one avatar and one time under the last.
const GROUP_GAP_MS = 5 * 60_000;
// Payment photos are kept at 1600 px on the longest side (T65), like the Pay form's screenshot.
const PROOF_SIDE = 1600;
const LOGO = '/brand/smartappph-mark-gradient.webp';

/** A Manila day (YYYY-MM-DD) as "Fri 13 Nov". */
export function dayText(date: string): string {
  return formatManila(new Date(`${date}T12:00:00+08:00`), 'date');
}

// The phone's own copy of a photo it just sent, shown until the server's address comes back (T107).
const localPhotos = new Map<string, string>();
export function rememberBillingPhoto(path: string, preview: string): void {
  localPhotos.set(path, preview);
}
function photoOf(m: BillingMessage): string | null {
  return (m.photoPath ? localPhotos.get(m.photoPath) : undefined) ?? m.photoUrl;
}

/** "Today", "Yesterday" or "Fri 13 Nov", by the Manila day. */
function dayLabel(at: string, now: Date): string {
  const day = formatManila(at, 'date');
  if (day === formatManila(now, 'date')) return W.today;
  if (day === formatManila(new Date(now.getTime() - 86_400_000), 'date')) return W.yesterday;
  return day;
}

// ---------------------------------------------------------------- the thread

/** A line still on its way, or one that failed, shown at the end of the thread (T107). */
export interface OutboxLine {
  id: string;
  kind: 'note' | 'photo';
  at: string;
  text?: string | undefined;
  preview?: string | undefined;
  reference?: string | null | undefined;
  state: 'sending' | 'failed';
  retry: () => void;
}

type Row =
  | { type: 'day'; key: string; label: string }
  | { type: 'system'; key: string; message: BillingMessage }
  | {
      type: 'line';
      key: string;
      mine: boolean;
      // The last line of its group: it gets the avatar and the time.
      last: boolean;
      message: BillingMessage | null;
      outbox: OutboxLine | null;
      at: string;
      from: BillingMessage['from'];
    };

function rowsOf(
  thread: readonly BillingMessage[],
  outbox: readonly OutboxLine[],
  viewer: 'owner' | 'admin',
  now: Date,
): Row[] {
  const rows: Row[] = [];
  const all = [
    ...thread.map((m) => ({ at: m.at, from: m.from, message: m, outbox: null })),
    ...outbox.map((o) => ({ at: o.at, from: 'owner' as const, message: null, outbox: o })),
  ];
  let lastDay = '';
  for (const [i, item] of all.entries()) {
    const day = formatManila(item.at, 'date');
    if (day !== lastDay) {
      rows.push({ type: 'day', key: `day-${day}`, label: dayLabel(item.at, now) });
      lastDay = day;
    }
    if (item.message?.from === 'system') {
      rows.push({ type: 'system', key: item.message.id, message: item.message });
      continue;
    }
    const next = all[i + 1];
    const last =
      !next ||
      next.from !== item.from ||
      next.from === 'system' ||
      formatManila(next.at, 'date') !== day ||
      new Date(next.at).getTime() - new Date(item.at).getTime() > GROUP_GAP_MS;
    rows.push({
      type: 'line',
      key: item.message?.id ?? item.outbox?.id ?? String(i),
      mine: (item.from === 'owner') === (viewer === 'owner'),
      last,
      message: item.message,
      outbox: item.outbox,
      at: item.at,
      from: item.from,
    });
  }
  return rows;
}

/**
 * The Billing chat (decisions T88, T107): one thread per shop between the owner and Smart App PH, on the
 * owner's Plan page and in Super Admin, built from the installed Message, Bubble, Attachment and Marker.
 * Each side sees its own lines on the right. Like Messenger: a day line when the day changes, lines from
 * one side within 5 minutes grouped with one avatar and one time, Sending, Sent and Seen under the newest
 * own line, and photos that open bigger.
 */
export function BillingThread({
  thread,
  payments,
  viewer,
  ownerName,
  outbox = [],
}: {
  thread: readonly BillingMessage[];
  payments: readonly PlanPayment[];
  viewer: 'owner' | 'admin';
  ownerName: string;
  outbox?: readonly OutboxLine[] | undefined;
}) {
  const [zoom, setZoom] = React.useState<number | null>(null);
  const byId = new Map(payments.map((p) => [p.id, p]));
  const now = new Date();
  const rows = rowsOf(thread, outbox, viewer, now);
  // Every photo in the chat, oldest first, so the bigger view can step through them.
  const photos = thread.flatMap((m) => {
    const src =
      m.kind === 'photo'
        ? photoOf(m)
        : m.kind === 'payment' && m.paymentId
          ? (byId.get(m.paymentId)?.proofUrl ?? null)
          : null;
    return src ? [src] : [];
  });
  const openPhoto = (src: string) => {
    const index = photos.indexOf(src);
    setZoom(index >= 0 ? index : null);
  };
  // Sent or Seen sits under the newest own line only, like Messenger.
  const newestMine = [...thread].reverse().find((m) => m.from === viewer);
  const them = viewer === 'owner' ? W.smartApp : ownerName;

  if (thread.length === 0 && outbox.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">{W.emptyLine}</p>;

  return (
    <MessageGroup className="gap-1.5">
      {rows.map((row) => {
        if (row.type === 'day')
          return (
            <Marker key={row.key} variant="separator" className="py-2">
              <MarkerContent className="tabular-nums">{row.label}</MarkerContent>
            </Marker>
          );
        if (row.type === 'system') {
          const m = row.message;
          return (
            <Marker key={row.key} variant="separator" className="py-2">
              <MarkerIcon>{m.kind === 'support' ? <LifeBuoyIcon /> : <RocketIcon />}</MarkerIcon>
              <MarkerContent className="tabular-nums">
                {m.kind === 'support' ? W.support : W.live} · {formatClock(m.at)}
              </MarkerContent>
            </Marker>
          );
        }
        const m = row.message;
        const o = row.outbox;
        const payment = m?.paymentId ? byId.get(m.paymentId) : undefined;
        const status = o
          ? o.state
          : m && m.id === newestMine?.id
            ? m.seenAt
              ? 'seen'
              : 'sent'
            : null;
        return (
          <Message
            key={row.key}
            align={row.mine ? 'end' : 'start'}
            className={cn(row.last && 'mb-2')}
          >
            {row.mine ? null : (
              <MessageAvatar className={cn('size-8', !row.last && 'invisible')}>
                {row.last ? <SenderAvatar from={row.from} ownerName={ownerName} /> : null}
              </MessageAvatar>
            )}
            <MessageContent className="max-w-4/5 gap-1">
              {m ? <Line message={m} payment={payment} onZoom={openPhoto} /> : null}
              {o ? <OutboxBubble line={o} /> : null}
              {row.last || status === 'failed' ? (
                <MessageFooter className="gap-1.5 tabular-nums">
                  {m?.kind === 'payment' && payment?.status === 'pending' ? (
                    <HourglassIcon aria-hidden="true" className="size-3.5 text-warning-text" />
                  ) : null}
                  {row.last ? (
                    <span>
                      {row.mine ? formatClock(row.at) : `${them} · ${formatClock(row.at)}`}
                    </span>
                  ) : null}
                  {status ? <SendState state={status} retry={o?.retry} /> : null}
                </MessageFooter>
              ) : null}
            </MessageContent>
          </Message>
        );
      })}
      <PhotoViewer photos={photos} index={zoom} onIndex={setZoom} />
    </MessageGroup>
  );
}

function SenderAvatar({ from, ownerName }: { from: BillingMessage['from']; ownerName: string }) {
  if (from === 'owner')
    return (
      <Avatar className="size-8">
        <AvatarFallback className="text-xs font-semibold">
          {ownerName.trim().slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  return <img src={LOGO} alt="" className="size-8 rounded-full bg-card object-contain p-1" />;
}

function SendState({
  state,
  retry,
}: {
  state: 'sending' | 'failed' | 'sent' | 'seen';
  retry?: (() => void) | undefined;
}) {
  switch (state) {
    case 'sending':
      return (
        <span className="flex items-center gap-1" aria-live="polite">
          <Spinner className="size-3" />
          {W.sending}
        </span>
      );
    case 'failed':
      return (
        <button
          type="button"
          onClick={retry}
          className="flex min-h-8 items-center gap-1 font-semibold text-destructive-text underline-offset-4 hover:underline"
        >
          <CircleAlertIcon aria-hidden="true" className="size-3.5" />
          {W.notSent}
        </button>
      );
    case 'sent':
      return (
        <span className="flex items-center gap-1">
          <CheckIcon aria-hidden="true" className="size-3.5" />
          {W.delivered}
        </span>
      );
    case 'seen':
      return (
        <span className="flex items-center gap-1 text-info-text">
          <CheckCheckIcon aria-hidden="true" className="size-3.5" />
          {W.seen}
        </span>
      );
  }
}

function OutboxBubble({ line }: { line: OutboxLine }) {
  return (
    <div className={cn('flex flex-col items-end gap-1', line.state === 'sending' && 'opacity-70')}>
      {line.preview ? <PhotoTile src={line.preview} /> : null}
      {line.reference ? (
        <Bubble variant="muted">
          <BubbleContent className="font-mono text-xs">{W.refLine(line.reference)}</BubbleContent>
        </Bubble>
      ) : null}
      {line.text ? (
        <Bubble variant="default">
          <BubbleContent className="whitespace-pre-line">{line.text}</BubbleContent>
        </Bubble>
      ) : null}
    </div>
  );
}

function PhotoTile({ src, onOpen }: { src: string; onOpen?: (() => void) | undefined }) {
  return (
    <Attachment orientation="vertical" state="done" className="w-40 sm:w-44">
      <AttachmentMedia variant="image" className="aspect-auto h-52 sm:h-56">
        <img src={src} alt={W.photoAlt} className="size-full object-cover object-top" />
      </AttachmentMedia>
      {onOpen ? <AttachmentTrigger aria-label={W.zoom} onClick={onOpen} /> : null}
    </Attachment>
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
    case 'photo': {
      const src = photoOf(m);
      return (
        <>
          {src ? (
            <PhotoTile src={src} onOpen={() => onZoom(src)} />
          ) : (
            <Bubble variant="muted">
              <BubbleContent className="flex items-center gap-1.5 text-muted-foreground">
                <ImageOffIcon aria-hidden="true" className="size-4" />
                {W.photoRemoved}
              </BubbleContent>
            </Bubble>
          )}
          {m.reference ? <ReferenceBubble reference={m.reference} /> : null}
        </>
      );
    }
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

function ReferenceBubble({ reference }: { reference: string }) {
  return (
    <Bubble variant="muted">
      <BubbleContent className="flex items-center gap-1 text-xs">
        <span className="font-mono break-all">{W.reference(reference)}</span>
        <CopyButton value={reference} iconOnly className="-my-1 size-8 shrink-0" />
      </BubbleContent>
    </Bubble>
  );
}

function PaymentLine({
  payment: p,
  onZoom,
}: {
  payment: PlanPayment;
  onZoom: (src: string) => void;
}) {
  const proof = p.proofUrl;
  return (
    <>
      {proof ? <PhotoTile src={proof} onOpen={() => onZoom(proof)} /> : null}
      <Bubble variant="muted">
        <BubbleContent className="flex flex-col gap-1">
          <span className="font-semibold tabular-nums">
            {W.paymentSent(formatPeso(p.amount), p.months)}
          </span>
          <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {words.shop.paymentMethod[p.method]}
            {p.reference ? (
              <>
                {' ·'}
                <span className="font-mono break-all">{W.reference(p.reference)}</span>
                <CopyButton value={p.reference} iconOnly className="-my-1 size-8" />
              </>
            ) : null}
          </span>
        </BubbleContent>
      </Bubble>
    </>
  );
}

/** The chat's photos, bigger, with Previous and Next (T107). */
function PhotoViewer({
  photos,
  index,
  onIndex,
}: {
  photos: readonly string[];
  index: number | null;
  onIndex: (index: number | null) => void;
}) {
  const src = index === null ? undefined : photos[index];
  const count = photos.length;
  return (
    <ResponsiveDialog
      open={src !== undefined}
      onOpenChange={(next) => {
        if (!next) onIndex(null);
      }}
      title={W.photo}
      description={count > 1 && index !== null ? `${index + 1} / ${count}` : undefined}
    >
      {src && index !== null ? (
        <div className="flex flex-col gap-3">
          <img
            src={src}
            alt={W.photoAlt}
            className="mx-auto max-h-vh-70 w-auto rounded-xl border object-contain"
          />
          {count > 1 ? (
            <div className="flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label={W.previousPhoto}
                disabled={index === 0}
                onClick={() => onIndex(index - 1)}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label={W.nextPhoto}
                disabled={index === count - 1}
                onClick={() => onIndex(index + 1)}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </ResponsiveDialog>
  );
}

// ---------------------------------------------------------------- the composer

interface TrayPhoto {
  id: string;
  // The photo as picked, for the tile and for Crop.
  original: string;
  preview: string;
  state: 'uploading' | 'ready' | 'failed';
  path: string | null;
  file: File;
}

export interface SendPhotoInput {
  photoPath: string;
  reference: string | null;
  preview: string;
}

/**
 * Write in the Billing chat (T107): a text box that grows, Enter sends on a computer, and for the owner
 * photos only (payment proof or a reference screenshot), up to 3 at a time, each with Crop, plus an
 * optional reference number. Photos go up while the owner types, so Send is quick.
 */
export function BillingComposer({
  onSend,
  onSendPhoto,
  disabled,
  lockedLine,
}: {
  onSend: (text: string) => Promise<unknown>;
  // Owners only: Super Admin answers in words.
  onSendPhoto?: ((input: SendPhotoInput) => Promise<unknown>) | undefined;
  disabled?: boolean | undefined;
  // Why writing is off (help mode), shown in place of the box.
  lockedLine?: string | undefined;
}) {
  const online = useOnlineStatus();
  const [text, setText] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [tray, setTray] = React.useState<TrayPhoto[]>([]);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState<{ id: string; shape: CropShape } | null>(null);
  const [sending, setSending] = React.useState(false);
  const { upload } = useImageUpload('plan_proof', PROOF_SIDE);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const id = React.useId();
  const used = text.trim().length;
  const tooLong = used > NOTE_MAX;
  const uploading = tray.some((p) => p.state === 'uploading');
  const ready = tray.filter((p) => p.state === 'ready');
  const off = !online || disabled === true;
  const canSend = !off && !sending && !tooLong && !uploading && (used > 0 || ready.length > 0);

  const patch = (photoId: string, next: Partial<TrayPhoto>) =>
    setTray((list) => list.map((p) => (p.id === photoId ? { ...p, ...next } : p)));

  const put = async (photoId: string, file: File) => {
    patch(photoId, { state: 'uploading' });
    const done = await upload(file);
    if (done) patch(photoId, { state: 'ready', path: done.ref, preview: done.preview });
    else patch(photoId, { state: 'failed' });
  };

  const onPick = (files: FileList | null) => {
    if (!files) return;
    setProblem(null);
    const room = BILLING_PHOTOS_PER_SEND - tray.length;
    const list = Array.from(files);
    if (list.length > room) setProblem(W.tooManyPhotos);
    for (const file of list.slice(0, Math.max(0, room))) {
      const photoId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const original = URL.createObjectURL(file);
      setTray((t) => [
        ...t,
        { id: photoId, original, preview: original, state: 'uploading', path: null, file },
      ]);
      void put(photoId, file);
    }
  };

  const openCrop = async (photo: TrayPhoto) => {
    // Keep the photo's own shape: zoom and drag to the part with the amount and reference.
    const img = new Image();
    img.src = photo.original;
    await img.decode().catch(() => undefined);
    const aspect = img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : 9 / 16;
    setCrop({ id: photo.id, shape: { aspect, side: PROOF_SIDE } });
  };

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    const note = text.trim();
    const ref = reference.trim() || null;
    const photos = ready;
    setText('');
    setReference('');
    setTray([]);
    try {
      for (const [i, p] of photos.entries()) {
        if (!p.path || !onSendPhoto) continue;
        // The reference goes with the first photo.
        await onSendPhoto({
          photoPath: p.path,
          reference: i === 0 ? ref : null,
          preview: p.preview,
        });
      }
      if (note) await onSend(note);
    } catch (err) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  if (lockedLine) return <p className="text-xs text-muted-foreground">{lockedLine}</p>;

  const cropping = crop ? tray.find((p) => p.id === crop.id) : undefined;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {tray.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-2">
          <AttachmentGroup>
            {tray.map((p) => (
              <Attachment
                key={p.id}
                orientation="vertical"
                size="sm"
                state={
                  p.state === 'uploading' ? 'uploading' : p.state === 'failed' ? 'error' : 'done'
                }
                className="w-20"
              >
                <AttachmentMedia variant="image" className="aspect-square">
                  {p.state === 'uploading' ? <Spinner /> : null}
                  {p.state === 'failed' ? (
                    <CircleAlertIcon aria-hidden="true" />
                  ) : (
                    <img
                      src={p.preview}
                      alt=""
                      className={cn(p.state === 'uploading' && 'hidden')}
                    />
                  )}
                </AttachmentMedia>
                <AttachmentActions className="top-1 right-1">
                  {p.state === 'failed' ? (
                    <AttachmentAction
                      aria-label={W.tryAgain}
                      variant="secondary"
                      className="size-7 rounded-full"
                      onClick={() => void put(p.id, p.file)}
                    >
                      <RotateCwIcon />
                    </AttachmentAction>
                  ) : p.state === 'ready' ? (
                    <AttachmentAction
                      aria-label={settingsWords.upload.cropAgain}
                      variant="secondary"
                      className="size-7 rounded-full"
                      onClick={() => void openCrop(p)}
                    >
                      <CropIcon />
                    </AttachmentAction>
                  ) : null}
                  <AttachmentAction
                    aria-label={W.removePhoto}
                    variant="secondary"
                    className="size-7 rounded-full"
                    onClick={() => setTray((t) => t.filter((x) => x.id !== p.id))}
                  >
                    <XIcon />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            ))}
          </AttachmentGroup>
          <Field>
            <FieldLabel htmlFor={`${id}-ref`} className="text-xs">
              {W.refLabel}
            </FieldLabel>
            <Input
              id={`${id}-ref`}
              value={reference}
              maxLength={40}
              autoComplete="off"
              inputMode="text"
              placeholder={W.refPlaceholder}
              className="h-11 bg-card text-base md:h-9 md:text-sm"
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>
        </div>
      ) : null}
      {problem ? (
        <p role="alert" className="text-xs font-medium text-destructive-text">
          {problem}
        </p>
      ) : null}
      {!online ? <p className="text-xs text-muted-foreground">{W.offline}</p> : null}

      <div className="flex items-end gap-2">
        {onSendPhoto ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={UPLOAD_ACCEPT}
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-label={W.addPhoto}
              onChange={(e) => {
                onPick(e.target.files);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 text-muted-foreground"
              aria-label={`${W.addPhoto}. ${W.photoOnly}`}
              title={W.photoOnly}
              disabled={off || tray.length >= BILLING_PHOTOS_PER_SEND}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlusIcon className="size-5" />
            </Button>
          </>
        ) : null}
        <Field data-invalid={tooLong ? true : undefined} className="min-w-0 flex-1">
          <FieldLabel htmlFor={id} className="sr-only">
            {W.write}
          </FieldLabel>
          <Textarea
            id={id}
            value={text}
            rows={1}
            placeholder={W.write}
            aria-invalid={tooLong ? true : undefined}
            aria-describedby={`${id}-hint`}
            disabled={disabled === true}
            className="max-h-32 min-h-11 resize-none rounded-2xl py-2.5 text-base md:text-sm"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // A computer sends on Enter; a phone's Enter makes a new line.
              const coarse = window.matchMedia('(pointer: coarse)').matches;
              if (e.key === 'Enter' && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <span id={`${id}-hint`} className="sr-only">
            {W.enterHint}
          </span>
        </Field>
        <Button
          type="submit"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          aria-label={W.send}
          disabled={!canSend}
        >
          {sending ? <Spinner /> : <SendIcon />}
        </Button>
      </div>
      {used > NOTE_MAX - 60 ? (
        tooLong ? (
          <FieldError className="text-end">{W.tooLong}</FieldError>
        ) : (
          <p className="text-end text-xs text-muted-foreground tabular-nums">
            {W.letters(used, NOTE_MAX)}
          </p>
        )
      ) : null}
      {crop ? (
        <CropStep
          src={cropping?.original ?? null}
          shape={crop.shape}
          busy={false}
          onCancel={() => setCrop(null)}
          onCropped={(file) => {
            const target = crop.id;
            setCrop(null);
            patch(target, { file, preview: URL.createObjectURL(file) });
            void put(target, file);
          }}
        />
      ) : null}
    </form>
  );
}

// ---------------------------------------------------------------- the chat box

/**
 * The chat in its own scrolling box (T107): opens at the newest line, stays there as lines arrive unless
 * the owner scrolled up (then a Newest button), and keeps the composer fixed underneath. On the Plan page
 * it sits in the card on a tablet or computer and fills the screen on a phone.
 */
export function BillingChat({
  thread,
  payments,
  viewer,
  ownerName,
  outbox,
  composer,
  className,
  onSeen,
}: {
  thread: readonly BillingMessage[];
  payments: readonly PlanPayment[];
  viewer: 'owner' | 'admin';
  ownerName: string;
  outbox?: readonly OutboxLine[] | undefined;
  composer: React.ReactNode;
  className?: string | undefined;
  onSeen?: (() => void) | undefined;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = React.useState(true);
  const [unread, setUnread] = React.useState(0);
  const count = thread.length + (outbox?.length ?? 0);
  const lastCount = React.useRef(count);

  const toEnd = (smooth: boolean) => {
    const box = boxRef.current;
    if (!box) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.scrollTo({ top: box.scrollHeight, behavior: smooth && !reduce ? 'smooth' : 'auto' });
  };

  // Open at the newest line.
  React.useLayoutEffect(() => toEnd(false), []);

  // New lines: follow them when at the end, otherwise count them on the Newest button.
  React.useEffect(() => {
    const added = count - lastCount.current;
    lastCount.current = count;
    if (added <= 0) return;
    if (atEnd) toEnd(true);
    else setUnread((n) => n + added);
  }, [count, atEnd]);

  // Our lines count as seen once the chat is on screen.
  const unseen = thread.some((m) => m.from !== viewer && m.from !== 'system' && m.seenAt === null);
  React.useEffect(() => {
    if (unseen && onSeen) onSeen();
  }, [unseen, onSeen]);

  return (
    <div className={cn('relative flex min-h-0 flex-col', className)}>
      <div
        ref={boxRef}
        role="log"
        aria-live="polite"
        aria-label={W.title}
        tabIndex={0}
        onScroll={(e) => {
          const box = e.currentTarget;
          const end = box.scrollHeight - box.scrollTop - box.clientHeight < 48;
          setAtEnd(end);
          if (end) setUnread(0);
        }}
        className="scrollbar-fine min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-2 focus-visible:outline-none"
      >
        <BillingThread
          thread={thread}
          payments={payments}
          viewer={viewer}
          ownerName={ownerName}
          outbox={outbox}
        />
      </div>
      {atEnd ? null : (
        <Button
          type="button"
          variant="outline"
          className="absolute bottom-24 left-1/2 h-9 -translate-x-1/2 gap-1.5 rounded-full bg-popover shadow-md"
          onClick={() => {
            setUnread(0);
            toEnd(true);
          }}
        >
          <ArrowDownIcon aria-hidden="true" />
          {unread > 0 ? W.newCount(unread) : W.newest}
        </Button>
      )}
      <div className="shrink-0 border-t pt-3">{composer}</div>
    </div>
  );
}

/** The chat's newest line in a few words, for the phone's card (T107). */
export function billingPreview(
  m: BillingMessage | undefined,
  payments: readonly PlanPayment[],
): string {
  if (!m) return W.emptyLine;
  switch (m.kind) {
    case 'photo':
      return W.preview.photo;
    case 'payment': {
      const p = payments.find((x) => x.id === m.paymentId);
      return p ? W.preview.payment(formatPeso(p.amount)) : W.preview.photo;
    }
    case 'approved': {
      const p = payments.find((x) => x.id === m.paymentId);
      return W.approved(p ? dayText(p.coversUntil) : '');
    }
    case 'rejected':
      return W.rejected(m.reason ? W.reasons[m.reason] : '');
    case 'extra_days':
      return W.extraDays(m.days ?? 1);
    case 'reminder':
      return W.reminder;
    case 'support':
      return W.support;
    case 'live':
      return W.live;
    case 'note':
      return m.text ?? '';
  }
}
