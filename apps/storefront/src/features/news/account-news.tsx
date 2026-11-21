'use client';

import { useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { BellIcon, BellOffIcon, CheckIcon, ChevronRightIcon, MegaphoneIcon } from 'lucide-react';
import { formatManila, imageSources, shopNewsWords, type ShopNewsItem } from '@smartapp/core';
import { useNewsChoice, useOnline, useSetNewsChoice, useShopNews } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@smartapp/ui/components/drawer';
import { Label } from '@smartapp/ui/components/label';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
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

const BLOCK_HELP: Record<Exclude<PushState, 'ask' | 'granted'>, string> = {
  denied: W.deniedHelp,
  needs_install: W.installHelp,
  unsupported: W.unsupportedHelp,
};

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
  const newsId = useId();

  async function turnOn() {
    setAsking(true);
    const result = await enablePush();
    setAsking(false);
    setState(result.ok ? 'granted' : 'denied');
  }

  function setNews(next: boolean) {
    save.mutate(next, {
      onSuccess: () => notify({ title: next ? W.boxOn : W.boxOff, tone: 'success' }),
      onError: () => notify({ title: W.offline, tone: 'error' }),
    });
  }

  const blocked = state !== 'ask' && state !== 'granted';
  return (
    <>
      <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/8">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-shop-10-soft text-shop-10-soft-foreground">
            {blocked ? (
              <BellOffIcon aria-hidden="true" className="size-5" />
            ) : (
              <BellIcon aria-hidden="true" className="size-5" />
            )}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">{W.updates}</span>
            <span className="text-sm text-muted-foreground">{W.updatesHelp}</span>
          </div>
          {state === 'granted' ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-success-text">
              <CheckIcon aria-hidden="true" className="size-4" />
              {W.updatesOn}
            </span>
          ) : null}
        </div>
        {state === 'ask' ? (
          <Button
            className="h-11 rounded-full bg-shop-10 text-shop-10-foreground hover:bg-shop-10-hover"
            disabled={asking || !online}
            onClick={() => void turnOn()}
          >
            {W.turnOn}
          </Button>
        ) : null}
        {blocked ? (
          <p role="status" className="rounded-xl bg-muted p-3 text-sm">
            {BLOCK_HELP[state]}
          </p>
        ) : null}
      </section>

      <section className="flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/8">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-member-soft text-member-soft-foreground">
          <MegaphoneIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Label htmlFor={newsId} className="text-base font-semibold">
            {W.news}
          </Label>
          <span id={`${newsId}-help`} className="text-sm text-muted-foreground">
            {W.newsHelp}
          </span>
        </div>
        <Switch
          id={newsId}
          checked={news}
          disabled={loading || save.isPending || !online}
          onCheckedChange={setNews}
          aria-describedby={`${newsId}-help`}
        />
      </section>
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
