'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { GiftIcon, RotateCwIcon, WifiOffIcon } from 'lucide-react';
import { artPath, formatManila, vocab, words } from '@smartapp/core';
import { useMyAccount, useMyOrders, useNow, useOnline, useSavedReceipts } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { EmptyState } from '@smartapp/ui/compositions/empty-state';
import { useShop } from '../../shell/components/shop-context';
import {
  mergeOrderRows,
  PAST_PAGE,
  pickTab,
  rowFromReceipt,
  splitOrders,
  type OrderTab,
} from '../orders-rules';
import { useOrderAgain } from '../use-order-again';
import { ActiveOrderCard, PastOrderRow } from './order-parts';
import { OrdersSkeleton } from './orders-skeleton';

const W = words.orders;

/**
 * My orders (T11): Active and Past as a segmented control (c-tabs-7 counts on the c-tabs-2 segmented
 * look), the orders kept on this phone merged with the member's, Order again, and every state.
 */
export function OrdersScreen() {
  const { slug, shop } = useShop();
  const kind = shop.storefront.info.kind;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const online = useOnline();
  const now = useNow();
  const query = useMyOrders(slug);
  const account = useMyAccount(slug).data;
  const saved = useSavedReceipts(slug);
  const { orderAgain, loadingToken } = useOrderAgain();
  const [shown, setShown] = useState(PAST_PAGE);

  const savedRows = useMemo(
    () => saved.map((s) => rowFromReceipt(s.receipt, shop.catalog.items)),
    [saved, shop.catalog.items],
  );
  const rows = useMemo(() => mergeOrderRows(query.data, savedRows), [query.data, savedRows]);
  const { active, past } = splitOrders(rows);
  const tab = pickTab(params.get('tab'), active.length);
  const lastSaved =
    saved
      .map((s) => s.savedAt)
      .sort()
      .at(-1) ?? null;
  const showSaved = !online || query.isError;
  const stampsOn = shop.storefront.stampCard.status !== 'off';

  function setTab(next: OrderTab) {
    const search = new URLSearchParams(params);
    search.set('tab', next);
    router.replace(`${pathname}?${search.toString()}`, { scroll: false });
  }

  if (query.isPending && online && savedRows.length === 0) return <OrdersSkeleton />;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-2 pb-6">
      <h1 id="orders-title" className="text-2xl font-bold tracking-tight">
        {W.title}
      </h1>

      {!online ? (
        <Alert variant="info">
          <WifiOffIcon aria-hidden="true" />
          <AlertDescription>
            {lastSaved ? W.offline(formatManila(lastSaved, 'time')) : W.offlineNoTime}
          </AlertDescription>
        </Alert>
      ) : query.isError ? (
        <Alert variant="warning">
          <RotateCwIcon aria-hidden="true" />
          <AlertTitle>{W.errorTitle}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            {W.errorBody}
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              className="h-11 rounded-full px-4"
            >
              {W.tryAgain}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          id="orders-empty"
          art={artPath('orders_empty')}
          title={W.emptyTitle}
          description={W.emptyBody}
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${slug}/menu`} />}
              className="h-11 rounded-full px-6"
            >
              {words.basket.browse(vocab(kind).catalog)}
            </Button>
          }
        />
      ) : (
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value === 'active' ? 'active' : 'past')}
          className="gap-4"
        >
          <TabsList
            aria-label={W.lists}
            className="grid w-full grid-cols-2 rounded-full p-1 group-data-horizontal/tabs:h-auto"
          >
            <TabsTrigger value="active" className="h-11 gap-2 rounded-full text-base">
              {W.active}
              {active.length > 0 ? (
                <Badge variant="default" size="sm" radius="full">
                  {active.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="past" className="h-11 gap-2 rounded-full text-base">
              {W.past}
              {past.length > 0 ? (
                <Badge variant="secondary" size="sm" radius="full">
                  {past.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="flex flex-col gap-3">
            {active.length === 0 ? (
              <EmptyState
                variant="plain"
                art={artPath('completed')}
                title={W.emptyActiveTitle}
                description={W.emptyActiveBody}
              />
            ) : (
              active.map((row) => (
                <ActiveOrderCard key={row.token} row={row} slug={slug} kind={kind} now={now} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="flex flex-col gap-3">
            {past.length === 0 ? (
              <EmptyState variant="plain" art={artPath('orders_empty')} title={W.emptyTitle} />
            ) : (
              <ul className="flex flex-col divide-y divide-border/60 rounded-3xl bg-card px-4 py-3 shadow-xs ring-1 ring-foreground/8 sm:px-5">
                {past.slice(0, shown).map((row) => (
                  <PastOrderRow
                    key={row.token}
                    row={row}
                    slug={slug}
                    loading={loadingToken === row.token}
                    onOrderAgain={() => orderAgain(row.token)}
                  />
                ))}
              </ul>
            )}
            {past.length > shown ? (
              <Button
                variant="outline"
                onClick={() => setShown((n) => n + PAST_PAGE)}
                className="h-11 self-center rounded-full px-6"
              >
                {W.showMore}
              </Button>
            ) : null}
          </TabsContent>
        </Tabs>
      )}

      {!account && stampsOn && !showSaved ? (
        <section
          aria-labelledby="orders-join-title"
          className="flex items-center gap-3 rounded-3xl bg-member-soft p-4 text-member-soft-foreground sm:p-5"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-member text-member-foreground">
            <GiftIcon aria-hidden="true" className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 id="orders-join-title" className="font-semibold">
              {W.joinTitle}
            </h2>
            <p className="text-sm">{W.joinBody}</p>
          </div>
          <Button
            nativeButton={false}
            render={<Link href={`/${slug}/join`} />}
            className="h-11 shrink-0 rounded-full bg-member px-5 text-member-foreground hover:bg-member-hover"
          >
            {W.join}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
