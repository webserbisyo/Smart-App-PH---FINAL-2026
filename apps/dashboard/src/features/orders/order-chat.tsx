import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  CalendarClockIcon,
  CheckIcon,
  ImageOffIcon,
  LinkIcon,
  LockIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  XIcon,
} from 'lucide-react';
import {
  PROOFS_PER_ORDER,
  errorWords,
  formatClock,
  formatPeso,
  hasReference,
  isFinal,
  isTransfer,
  needsProofCheck,
  ordersWords,
  statusStage,
  words,
  type BoardOrder,
  type OrderMessage,
  type OwnerOrder,
  type Proof,
  type ShopKind,
} from '@smartapp/core';
import { errorCodeOf, useMarkChatSeen, useProofUrl, useReviewPayment } from '@smartapp/data';
import { Attachment, AttachmentMedia, AttachmentTrigger } from '@smartapp/ui/components/attachment';
import { Bubble, BubbleContent } from '@smartapp/ui/components/bubble';
import { Button } from '@smartapp/ui/components/button';
import { Marker, MarkerContent, MarkerIcon } from '@smartapp/ui/components/marker';
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
} from '@smartapp/ui/components/message';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Textarea } from '@smartapp/ui/components/textarea';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { CopyButton } from '@smartapp/ui/compositions/copy-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { cn } from 'cn';
import { CUSTOMER_LOOK, CustomerKindChip, customerKind } from '@/app/orders/customer-kind';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import { stageLabel } from '@/app/orders/stage';
import { StageIcon } from '@/app/orders/stage-icon';
import { useOnlineStatus } from '@/app/use-online-status';
import { CustomerAvatar } from './calendar-order.js';
import { MessengerOrderButton } from './messenger-inbox.js';

const W = ordersWords.chat;
const D = ordersWords.detail;
const REJECT_REASON_KEYS = ['amount', 'unclear', 'account', 'missing'] as const;

const PHOTO_STATE = {
  pending: { icon: ShieldCheckIcon, className: 'text-warning-text' },
  approved: { icon: CheckIcon, className: 'text-success-text' },
  rejected: { icon: XIcon, className: 'text-destructive-text' },
} as const;

/** The panel's scrolling body (the installed Scroller inside ResponsiveSheet) around an element. */
export function scrollBox(el: HTMLElement | null): HTMLElement | null {
  const box = el?.closest('[data-slot=scroller]');
  return box instanceof HTMLElement ? box : null;
}

/** The order chat has something for the owner to do: a payment photo waits for the check. */
export function chatWaits(order: BoardOrder): boolean {
  return needsProofCheck(order);
}

// ---------------------------------------------------------------- who is chatting

/**
 * Who the owner is talking to (T87), pinned on top of the chat: a member wears the mint ring with their
 * stamps and a link to their page; a guest stays grey with their phone, and a first order says so.
 */
export function ChatPerson({
  order,
  detail,
}: {
  order: BoardOrder;
  detail: OwnerOrder | undefined;
}) {
  const kind = customerKind(order);
  const phone = detail?.customerPhone ?? null;
  return (
    <div className="flex items-center gap-3">
      <CustomerAvatar
        order={order}
        size="default"
        className={cn(order.isMember && 'ring-2 ring-member ring-offset-2 ring-offset-popover')}
      />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-semibold">{order.customerName}</span>
          {order.isMember ? (
            <CustomerKindChip kind={kind} />
          ) : (
            <span
              className={cn(
                'inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs font-semibold',
                CUSTOMER_LOOK.guest.chip,
              )}
            >
              {W.guest}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground tabular-nums">
          {[
            phone,
            order.memberStamps
              ? W.memberStamps(order.memberStamps.have, order.memberStamps.goal)
              : null,
            !order.isMember && order.isFirstOrder ? W.firstOrder : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {order.isMember && phone ? (
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link to="/members" search={{ q: phone }} />}
          className="h-11 shrink-0 px-2.5 text-sm font-semibold text-primary md:h-9"
        >
          {W.memberPage}
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- the thread

function ProofPhoto({
  slug,
  proof,
  orderNo,
  onZoom,
}: {
  slug: string;
  proof: Proof;
  orderNo: number;
  onZoom: (src: string) => void;
}) {
  const url = useProofUrl(slug, proof.path);
  const [broken, setBroken] = React.useState(false);
  const src = url.data && !broken ? url.data : null;
  return (
    <Attachment
      orientation="vertical"
      state={url.isError || broken ? 'error' : 'done'}
      className="w-full max-w-44"
    >
      <AttachmentMedia variant="image" className="aspect-auto h-56">
        {src ? (
          <img
            src={src}
            alt={W.photoAlt(orderNoLabel(orderNo))}
            className="size-full object-cover object-top"
            onError={() => setBroken(true)}
          />
        ) : url.isPending ? (
          <Spinner aria-label={W.photoLoading} />
        ) : (
          <ImageOffIcon aria-hidden="true" className="text-muted-foreground" />
        )}
      </AttachmentMedia>
      {src ? <AttachmentTrigger aria-label={W.zoom} onClick={() => onZoom(src)} /> : null}
    </Attachment>
  );
}

function CustomerPhoto({
  slug,
  order,
  proof,
  at,
  onZoom,
}: {
  slug: string;
  order: BoardOrder;
  proof: Proof;
  at: string;
  onZoom: (src: string) => void;
}) {
  const state = PHOTO_STATE[proof.status];
  const StateIcon = state.icon;
  return (
    <Message>
      <MessageAvatar>
        <CustomerAvatar order={order} />
      </MessageAvatar>
      <MessageContent>
        <ProofPhoto slug={slug} proof={proof} orderNo={order.orderNo} onZoom={onZoom} />
        <Bubble variant="muted">
          {hasReference(proof.referenceNo) ? (
            <BubbleContent className="flex items-center gap-1">
              <span className="font-mono font-semibold">{W.reference(proof.referenceNo)}</span>
              <CopyButton value={proof.referenceNo} iconOnly className="-my-1 size-8" />
            </BubbleContent>
          ) : (
            <BubbleContent className="text-muted-foreground">{W.noReference}</BubbleContent>
          )}
        </Bubble>
        <MessageFooter className="gap-1.5 tabular-nums">
          <StateIcon aria-hidden="true" className={cn('size-3.5', state.className)} />
          <span>{W.photoState[proof.status]}</span>
          <span aria-hidden="true">·</span>
          <span>{formatClock(at)}</span>
        </MessageFooter>
      </MessageContent>
    </Message>
  );
}

function ShopLine({
  text,
  at,
  tone = 'plain',
}: {
  text: string;
  at: string | null;
  tone?: 'plain' | 'approved' | 'rejected';
}) {
  return (
    <Message align="end">
      <MessageContent>
        <Bubble
          variant={tone === 'approved' ? 'default' : tone === 'rejected' ? 'destructive' : 'tinted'}
        >
          <BubbleContent className="flex items-start gap-1.5">
            {tone === 'approved' ? (
              <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            ) : tone === 'rejected' ? (
              <XIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            ) : null}
            {text}
          </BubbleContent>
        </Bubble>
        <MessageFooter className="tabular-nums">
          {at ? `${W.you} · ${formatClock(at)}` : W.you}
        </MessageFooter>
      </MessageContent>
    </Message>
  );
}

function Line({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Marker variant="separator">
      <MarkerIcon>{icon}</MarkerIcon>
      <MarkerContent className="tabular-nums">{children}</MarkerContent>
    </Marker>
  );
}

/**
 * The Chat tab (T87): the customer's own thread, mirrored. Their photos on the left with their initials,
 * the shop's answers on the right as "You", and each step as a line in the middle. Newest at the bottom,
 * where the checks are.
 */
export function ChatThread({
  order,
  detail,
  slug,
  kind,
  active,
}: {
  order: BoardOrder;
  detail: OwnerOrder | undefined;
  slug: string;
  kind: ShopKind;
  active: boolean;
}) {
  const [zoom, setZoom] = React.useState<string | null>(null);
  const end = React.useRef<HTMLDivElement>(null);
  const markSeen = useMarkChatSeen(slug).mutate;
  const seenFor = React.useRef<string | null>(null);
  const unseen = detail?.messages.some((m) => m.from === 'customer' && m.seenAt === null) ?? false;
  const count = detail?.messages.length ?? 0;

  React.useEffect(() => {
    if (!active || !unseen || seenFor.current === order.id) return;
    seenFor.current = order.id;
    markSeen({ orderId: order.id });
  }, [active, unseen, order.id, markSeen]);

  // Open on the newest line, and follow new ones.
  React.useEffect(() => {
    if (!active || count === 0) return;
    const frame = requestAnimationFrame(() => {
      const box = scrollBox(end.current);
      if (box) box.scrollTop = box.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [active, count]);

  if (!detail) {
    return (
      <div className="space-y-4 p-4" aria-busy="true">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="ml-10 h-56 w-44 rounded-xl" />
        <Skeleton className="ml-auto h-10 w-48 rounded-xl" />
      </div>
    );
  }

  const proofs = new Map(detail.proofs.map((p) => [p.id, p]));
  const messages = [...detail.messages].sort((a, b) => a.at.localeCompare(b.at));

  const line = (m: OrderMessage) => {
    const time = formatClock(m.at);
    if (m.proof) {
      return (
        <CustomerPhoto
          key={m.id}
          slug={slug}
          order={order}
          proof={proofs.get(m.proof.id) ?? m.proof}
          at={m.at}
          onZoom={setZoom}
        />
      );
    }
    if (m.kind === 'status' && m.status && !m.text) {
      if (m.status === 'placed') return null;
      const stage = statusStage(m.status);
      return (
        <Line key={m.id} icon={stage ? <StageIcon stage={stage} kind={kind} /> : <XIcon />}>
          {`${stage ? stageLabel(stage, kind) : words.shop.orderStatus[m.status]} · ${time}`}
        </Line>
      );
    }
    if (m.kind === 'schedule') {
      return (
        <Line key={m.id} icon={<CalendarClockIcon />}>
          {m.text ?? time}
        </Line>
      );
    }
    if (m.kind === 'tracking') {
      return (
        <Line key={m.id} icon={<LinkIcon />}>
          {`${m.text ?? words.shop.thread.tracking} · ${time}`}
        </Line>
      );
    }
    if (!m.text) return null;
    if (m.from !== 'shop') {
      return (
        <Line key={m.id} icon={<XIcon />}>
          {`${m.text} · ${time}`}
        </Line>
      );
    }
    const tone =
      m.text === words.shop.thread.paymentApproved
        ? 'approved'
        : m.text.startsWith(words.shop.thread.paymentRejected(''))
          ? 'rejected'
          : 'plain';
    return <ShopLine key={m.id} text={m.text} at={m.at} tone={tone} />;
  };

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 border-b bg-popover px-4 py-3">
        <ChatPerson order={order} detail={detail} />
        <p className="mt-2 truncate rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground tabular-nums">
          <span className="font-semibold text-foreground">
            {W.list.orderNo(orderNoLabel(order.orderNo))}
          </span>
          {` · ${formatPeso(order.total)} · ${words.shop.paymentMethod[order.paymentMethod]} · ${order.itemsSummary}`}
        </p>
      </div>
      <MessageGroup className="gap-4 px-4 py-4">
        <Line icon={<ReceiptTextIcon />}>{W.placed(formatClock(order.placedAt))}</Line>
        {isTransfer(order.paymentMethod) ? (
          <ShopLine
            text={W.payAsk(formatPeso(order.total), words.shop.paymentMethod[order.paymentMethod])}
            at={null}
          />
        ) : null}
        {messages.map(line)}
      </MessageGroup>
      <div ref={end} />

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
            alt={W.photoAlt(orderNoLabel(order.orderNo))}
            className="mx-auto max-h-vh-70 w-auto rounded-xl border object-contain"
          />
        ) : null}
      </ResponsiveDialog>
    </div>
  );
}

// ---------------------------------------------------------------- the bottom bar

/**
 * The Chat tab's bottom bar (T87): Approve and Not approved stay in reach while a photo waits, with the
 * reminder to check the money in the owner's own app. Not approved opens the reasons in place (no
 * dialog). Otherwise the bar says what this chat can do for now, and where to talk about the rest.
 */
export function ChatFooter({
  order,
  detail,
  slug,
}: {
  order: BoardOrder;
  detail: OwnerOrder | undefined;
  slug: string;
}) {
  const online = useOnlineStatus();
  const review = useReviewPayment(slug);
  const approve = useAsyncAction();
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const amount = formatPeso(order.total);
  const method = words.shop.paymentMethod[order.paymentMethod];
  const used = detail?.proofs.length ?? 0;
  const fail = (err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });

  if (chatWaits(order) && !rejecting) {
    return (
      <div className="flex flex-col gap-2">
        <p className="flex items-start gap-1.5 rounded-lg bg-warning-soft px-2.5 py-2 text-xs text-warning-soft-foreground">
          <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {W.checkHint(amount, method)}
        </p>
        <div className="flex gap-2">
          <AsyncButton
            status={approve.status}
            busyLabel={W.approving}
            doneLabel={W.approved}
            disabled={!online}
            onClick={() =>
              approve
                .run(async () => {
                  await review.mutateAsync({ orderId: order.id, approve: true });
                  notify({ title: W.approved, tone: 'success' });
                })
                .catch(fail)
            }
            className="h-12 flex-1 text-base font-semibold md:h-11"
          >
            <CheckIcon aria-hidden="true" />
            {W.approve(amount)}
          </AsyncButton>
          <Button
            variant="outline"
            disabled={!online}
            onClick={() => setRejecting(true)}
            className="h-12 text-destructive-text md:h-11"
          >
            {W.notApproved}
          </Button>
        </div>
      </div>
    );
  }

  if (chatWaits(order) && rejecting) {
    const send = () => {
      review
        .mutateAsync({ orderId: order.id, approve: false, rejectReason: reason.trim() })
        .then(() => {
          setRejecting(false);
          setReason('');
          notify({ title: W.sent, tone: 'info' });
        })
        .catch(fail);
    };
    return (
      <div className="flex flex-col gap-2.5">
        <div>
          <p className="text-sm font-semibold">{W.reasonsTitle}</p>
          <p className="text-xs text-muted-foreground">{W.reasonsHint}</p>
        </div>
        {/* One tap writes a full sentence the owner can still change (T81). */}
        <div className="flex flex-wrap gap-1.5">
          {REJECT_REASON_KEYS.map((key) => {
            const r = D.rejectReasons[key];
            const picked = reason === r.text;
            return (
              <Button
                key={key}
                type="button"
                variant={picked ? 'secondary' : 'outline'}
                aria-pressed={picked}
                onClick={() => setReason(r.text)}
                className="h-11 rounded-full px-3 aria-pressed:border-destructive/40 aria-pressed:bg-destructive-soft aria-pressed:text-destructive-soft-foreground md:h-9"
              >
                {picked ? <CheckIcon aria-hidden="true" /> : null}
                {r.label}
              </Button>
            );
          })}
        </div>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={300}
          className="text-base md:text-sm"
          aria-label={W.reasonLabel}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRejecting(false)} className="h-12 md:h-11">
            {W.back}
          </Button>
          <Button
            variant="destructive"
            disabled={!online || reason.trim() === '' || review.isPending}
            onClick={send}
            className="h-12 flex-1 text-base font-semibold md:h-11"
          >
            {review.isPending ? W.sending : W.send}
          </Button>
        </div>
      </div>
    );
  }

  const closed = isFinal(order.status);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed p-2.5 pl-3 text-sm text-muted-foreground">
      <LockIcon aria-hidden="true" className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 text-xs md:text-sm">
        {used > 0 ? (
          <span className="font-semibold text-foreground tabular-nums">
            {`${W.used(used, PROOFS_PER_ORDER)}. `}
          </span>
        ) : null}
        {closed ? W.lockedClosed : W.locked}
      </p>
      {closed ? null : <MessengerOrderButton order={order} className="shrink-0 bg-card" />}
    </div>
  );
}
