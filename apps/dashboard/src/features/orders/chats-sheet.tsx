import * as React from 'react';
import { ClockIcon, MessageCircleIcon, XIcon } from 'lucide-react';
import { formatClock, minutesUntil, ordersWords, words, type ChatSummary } from '@smartapp/core';
import { useChats } from '@smartapp/data';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import { Button } from '@smartapp/ui/components/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { MessengerIcon } from '@smartapp/ui/compositions/messenger-icon';
import { ResponsiveSheet } from '@smartapp/ui/compositions/responsive-sheet';
import { initials } from '@smartapp/ui/compositions/shop-image';
import { cn } from 'cn';
import { CUSTOMER_LOOK, customerKind } from '@/app/orders/customer-kind';
import { orderNoLabel } from '@/app/orders/order-ticket-label';
import { useNow } from '@/app/orders/use-now';
import { PAGE_INBOX_URL } from './messenger-inbox.js';

const W = ordersWords.chat.list;
const C = ordersWords.chat;

function lastWords(chat: ChatSummary): string {
  const last = chat.last;
  if (last.proof) return W.lastPhoto;
  if (last.from === 'shop' && last.text) return W.lastYou(last.text);
  if (last.text) return last.text;
  return last.status ? words.shop.orderStatus[last.status] : '';
}

function ChatRow({
  chat,
  now,
  onOpen,
}: {
  chat: ChatSummary;
  now: Date;
  onOpen: (orderId: string) => void;
}) {
  const kind = customerKind({ ...chat, hasReward: false });
  const look = CUSTOMER_LOOK[kind];
  const waited = chat.waitingSince ? -minutesUntil(chat.waitingSince, now) : null;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(chat.orderId)}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-fast hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none"
      >
        <Avatar
          size="default"
          className={cn(
            'shrink-0',
            chat.isMember && 'ring-2 ring-member ring-offset-2 ring-offset-popover',
          )}
        >
          <AvatarFallback className={cn('font-semibold', look.avatar)}>
            {initials(chat.customerName)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{chat.customerName}</span>
            <span
              className={cn(
                'inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                chat.isMember ? CUSTOMER_LOOK.member.chip : CUSTOMER_LOOK.guest.chip,
              )}
            >
              {chat.isMember
                ? chat.memberStamps
                  ? C.memberChip(chat.memberStamps.have, chat.memberStamps.goal)
                  : C.member
                : C.guest}
            </span>
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <span className="shrink-0 font-medium text-foreground tabular-nums">
              {orderNoLabel(chat.orderNo)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{lastWords(chat)}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {waited !== null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-soft-foreground tabular-nums">
              <ClockIcon aria-hidden="true" className="size-3" />
              {W.waiting(waited)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatClock(chat.last.at)}
            </span>
          )}
          {chat.unseen > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive-text">
              <span className="size-2 rounded-full bg-destructive" aria-hidden="true" />
              {W.unseen(chat.unseen)}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

/**
 * The Chats list (T87): every order chat in one place, waiting ones first with how long they have
 * waited. A tap opens that order on its Chat tab. Messenger stays one tap away for everything else.
 */
export function ChatsSheet({
  slug,
  open,
  onOpenChange,
  onOpenChat,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChat: (orderId: string) => void;
}) {
  const chats = useChats(slug);
  const now = useNow(30_000);
  const list = chats.data ?? [];

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={W.title}
      description={W.subtitle}
      header={
        <div className="flex items-start gap-3 border-b px-4 pt-3 pb-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{W.title}</p>
            <p className="text-sm text-muted-foreground">{W.subtitle}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label={W.close}
            className="size-11 shrink-0 md:size-9"
          >
            <XIcon />
          </Button>
        </div>
      }
      footer={
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">{W.messengerHint}</p>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={PAGE_INBOX_URL} target="_blank" rel="noopener noreferrer" />}
            className="h-11 shrink-0 gap-1.5 font-semibold md:h-9"
          >
            <MessengerIcon />
            {W.messengerInbox}
          </Button>
        </div>
      }
    >
      {chats.isPending ? (
        <div className="space-y-3 p-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : chats.isError ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">{W.error}</p>
          <Button variant="outline" className="h-11 md:h-9" onClick={() => void chats.refetch()}>
            {W.tryAgain}
          </Button>
        </div>
      ) : list.length === 0 ? (
        <Empty className="m-4 border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageCircleIcon />
            </EmptyMedia>
            <EmptyTitle>{W.empty}</EmptyTitle>
            <EmptyDescription>{W.emptyHint}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y py-1">
          {list.map((chat) => (
            <ChatRow key={chat.key} chat={chat} now={now} onOpen={onOpenChat} />
          ))}
        </ul>
      )}
    </ResponsiveSheet>
  );
}

/** The floating button on Orders (T87): opens the Chats list, with how many wait for an answer. */
export function ChatsButton({ slug, onClick }: { slug: string; onClick: () => void }) {
  const chats = useChats(slug);
  const waiting = (chats.data ?? []).filter((c) => c.waitingSince !== null).length;
  return (
    <Button
      onClick={onClick}
      aria-label={waiting > 0 ? W.fabWaiting(waiting) : W.fab}
      className="fixed right-4 above-dock z-30 size-14 rounded-full shadow-lg md:right-6 md:bottom-6"
    >
      <MessageCircleIcon className="size-6" />
      {waiting > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground tabular-nums ring-2 ring-background"
        >
          {waiting}
        </span>
      ) : null}
    </Button>
  );
}
