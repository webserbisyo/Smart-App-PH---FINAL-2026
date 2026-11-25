'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { BellIcon, ChevronRightIcon, MegaphoneIcon } from 'lucide-react';
import { formatManila, imageSources, shopNewsWords, type ShopNewsItem } from '@smartapp/core';
import {
  useNewsChoice,
  useOnline,
  usePushKey,
  useSetNewsChoice,
  useShopNews,
} from '@smartapp/data';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@smartapp/ui/components/drawer';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { PushUpdatesCard, ShopNewsCard } from '@smartapp/ui/compositions/news-settings';
import { notify } from '@smartapp/ui/compositions/notify';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { enablePush, pushState, type PushState } from '../install/push';

const W = shopNewsWords;
const ROW = 'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left sm:px-5';

function noSubscribe() {
  return () => {};
}

function usePushState(): PushState {
  return useSyncExternalStore<PushState>(noSubscribe, pushState, () => 'unsupported');
}

/**
 * Account rows for push (decision T106): Notifications (order updates and shop news, with help when the
 * phone blocks them) and News from the shop (the last 30 days). Loads after the page (T31).
 */
export function AccountNews({ slug, shopName }: { slug: string; shopName: string }) {
  const [open, setOpen] = useState<'settings' | 'inbox' | null>(null);
  const state = usePushState();
  const choice = useNewsChoice(slug);
  const inbox = useShopNews(slug);
  const news = choice.data?.news ?? false;
  const line = state === 'granted' ? W.notificationsLine.on(news) : W.notificationsLine[state];

  return (
    <>
      <button
        type="button"
        className={`${ROW} hover:bg-muted/50`}
        onClick={() => setOpen('settings')}
      >
        <BellIcon aria-hidden="true" className="size-5 text-shop-10-text" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{W.notifications}</span>
          <span className="text-sm text-muted-foreground">{line}</span>
        </span>
        <ChevronRightIcon aria-hidden="true" className="size-4 text-muted-foreground" />
      </button>
      <button type="button" className={`${ROW} hover:bg-muted/50`} onClick={() => setOpen('inbox')}>
        <MegaphoneIcon aria-hidden="true" className="size-5 text-member-text" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{W.inbox(shopName)}</span>
          <span className="text-sm text-muted-foreground tabular">
            {inbox.data ? W.inboxLine(inbox.data.length) : ' '}
          </span>
        </span>
        <ChevronRightIcon aria-hidden="true" className="size-4 text-muted-foreground" />
      </button>
      <NewsDrawer
        open={open === 'settings'}
        onClose={() => setOpen(null)}
        title={W.notifications}
        description={W.notificationsHelp(shopName)}
      >
        <SettingsBody slug={slug} state={state} news={news} loading={choice.isPending} />
      </NewsDrawer>
      <NewsDrawer
        open={open === 'inbox'}
        onClose={() => setOpen(null)}
        title={W.inbox(shopName)}
        description={W.inboxNote}
      >
        <InboxBody items={inbox.data} loading={inbox.isPending} onPick={() => setOpen(null)} />
      </NewsDrawer>
    </>
  );
}

function NewsDrawer({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const phone = useFormFactor() === 'phone';
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => !next && onClose()}
      swipeDirection={phone ? 'down' : 'right'}
      showSwipeHandle={phone}
    >
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg font-bold">{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-2 pb-6">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SettingsBody({
  slug,
  state: first,
  news,
  loading,
}: {
  slug: string;
  state: PushState;
  news: boolean;
  loading: boolean;
}) {
  const [state, setState] = useState(first);
  const [asking, setAsking] = useState(false);
  const save = useSetNewsChoice(slug);
  const online = useOnline();
  const pushKey = usePushKey(state === 'ask');

  async function turnOn() {
    setAsking(true);
    const result = await enablePush(pushKey.data?.key ?? null).catch(() => null);
    setAsking(false);
    if (result) setState(result.ok ? 'granted' : 'denied');
  }

  function setNews(next: boolean) {
    save.mutate(next, {
      onSuccess: () => notify({ title: next ? W.boxOn : W.boxOff, tone: 'success' }),
      onError: () => notify({ title: W.offline, tone: 'error' }),
    });
  }

  return (
    <>
      <PushUpdatesCard
        state={state}
        asking={asking}
        disabled={!online}
        onTurnOn={() => void turnOn()}
      />
      <ShopNewsCard
        checked={news}
        disabled={loading || save.isPending || !online}
        onCheckedChange={setNews}
      />
      {!online ? <p className="text-sm text-muted-foreground">{W.offline}</p> : null}
    </>
  );
}

function InboxBody({
  items,
  loading,
  onPick,
}: {
  items: ShopNewsItem[] | undefined;
  loading: boolean;
  onPick: () => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }
  if (!items || items.length === 0) {
    return (
      <p className="rounded-2xl bg-card px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-foreground/8">
        {W.inboxEmpty}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.path}
            onClick={onPick}
            className="flex items-start gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/8 hover:bg-muted/50"
          >
            {item.imageUrl ? (
              <div className="size-16 shrink-0 overflow-hidden rounded-xl">
                <ShopImage
                  src={imageSources(item.imageUrl)}
                  alt=""
                  ratio="1:1"
                  sizes="64px"
                  fallbackText={item.title}
                  className="size-16"
                />
              </div>
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-semibold break-words">{item.title}</span>
              <span className="text-sm break-words text-muted-foreground">{item.body}</span>
              <span className="text-xs text-muted-foreground">
                {formatManila(item.sentAt, 'date')}
              </span>
            </span>
            <ChevronRightIcon
              aria-hidden="true"
              className="mt-1 size-4 shrink-0 text-muted-foreground"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
