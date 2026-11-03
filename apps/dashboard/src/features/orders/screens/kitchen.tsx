import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ChefHatIcon,
  MonitorSmartphoneIcon,
  SunIcon,
  Volume2Icon,
  WifiOffIcon,
  XIcon,
} from 'lucide-react';
import type { BoardOrder, ShopKind, TicketLine } from '@smartapp/core';
import { errorWords, kitchenReady, kitchenTickets, ordersWords, vocab } from '@smartapp/core';
import { errorCodeOf, useOpenOrders, useOrderDetail } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Label } from '@smartapp/ui/components/label';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { AsyncButton } from '@smartapp/ui/compositions/async-button';
import { Notice } from '@/app/notice';
import { OrderTicket, orderNoLabel } from '@/app/orders/order-ticket';
import { usePrintTicket } from '@/app/orders/print-ticket';
import {
  useDarkPage,
  useKitchenChecks,
  useKitchenTheme,
  useWakeLock,
} from '@/app/orders/use-kitchen-device';
import { useNow } from '@/app/orders/use-now';
import { useOrderSound } from '@/app/orders/use-order-sound';
import { useStepChange } from '@/app/orders/use-step-change';
import { PageEmpty, PageError } from '@/app/page-state';
import { useOnlineStatus } from '@/app/use-online-status';
import { useShop } from '@/app/shop';
import { getButtonLabels } from '../board-column.js';
import { ORDER_TYPES, useOrdersSearch } from '../tabs.js';
import { TypeFilter, type TypeFilterCounts } from '../type-filter.js';

const NO_IDS: ReadonlySet<string> = new Set();

/** New orders since the wall first loaded: their border flashes once (state adjusted while rendering). */
function useNewIds(orders: readonly BoardOrder[], loaded: boolean): ReadonlySet<string> {
  const key = orders.map((o) => o.id).join(',');
  const [seen, setSeen] = React.useState<{ key: string; known: ReadonlySet<string> | null }>({
    key: '',
    known: null,
  });
  const [fresh, setFresh] = React.useState<ReadonlySet<string>>(NO_IDS);
  if (loaded && key !== seen.key) {
    const known = new Set(seen.known ?? []);
    const added = new Set<string>();
    for (const o of orders) {
      if (seen.known && !known.has(o.id)) added.add(o.id);
      known.add(o.id);
    }
    setSeen({ key, known });
    setFresh(added.size > 0 ? added : NO_IDS);
  }
  return fresh;
}

interface KitchenItemProps {
  slug: string;
  kind: ShopKind;
  order: BoardOrder;
  now: Date;
  isOnline: boolean;
  isNew: boolean;
  checked: readonly number[];
  onToggleLine: (orderId: string, line: number) => void;
  onPrint: (orderId: string) => void;
  onAdvance: (order: BoardOrder) => Promise<void>;
}

function KitchenItem({
  slug,
  kind,
  order,
  now,
  isOnline,
  isNew,
  checked,
  onToggleLine,
  onPrint,
  onAdvance,
}: KitchenItemProps) {
  const [advancing, setAdvancing] = React.useState(false);
  // A board card carries up to 8 lines; a longer order loads the rest so the cook sees every line.
  const needsAll = order.moreLines > 0;
  const detail = useOrderDetail(slug, needsAll ? order.id : '');
  const lines = React.useMemo<TicketLine[]>(
    () =>
      needsAll && detail.data
        ? detail.data.lines.map((l) => ({
            qty: l.qty,
            name: l.name,
            variantLabel: l.variantLabel,
            optionLabels: l.optionLabels,
            note: l.note,
          }))
        : order.lines,
    [needsAll, detail.data, order.lines],
  );

  const labels = getButtonLabels(order, kind);
  const action = labels ? (
    <AsyncButton
      size="lg"
      status={advancing ? 'loading' : 'idle'}
      busyLabel={labels.pending}
      doneLabel={labels.done}
      disabled={!isOnline}
      onClick={async () => {
        try {
          setAdvancing(true);
          await onAdvance(order);
        } finally {
          setAdvancing(false);
        }
      }}
      className="h-14 w-full text-lg font-bold"
    >
      {labels.idle}
    </AsyncButton>
  ) : null;

  return (
    <OrderTicket
      order={order}
      size="kitchen"
      now={now}
      kitchen={{
        lines,
        checked,
        onToggleLine: (idx) => onToggleLine(order.id, idx),
        onPrint: () => onPrint(order.id),
        action,
        linesNote: needsAll && !detail.data ? ordersWords.kitchen.loadingMore : undefined,
        isNew,
      }}
    />
  );
}

/**
 * Kitchen view (food) / Packing view (retail), O5: a full-screen wall of tickets outside the shell for a
 * tablet or phone by the grill or packing table. Same data and rules as the Now board.
 */
export function KitchenScreen() {
  const shop = useShop();
  const words = vocab(shop.kind);
  const search = useOrdersSearch();
  const type = search.type ?? 'all';
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const now = useNow(15_000);

  const { data: orders, isLoading, isError, error, refetch } = useOpenOrders(shop.slug);
  const allOrders = React.useMemo(() => orders ?? [], [orders]);
  const { soundEnabled, enableSound } = useOrderSound(orders);
  const { advance } = useStepChange({ slug: shop.slug, kind: shop.kind });
  const printer = usePrintTicket(shop.slug);
  const [theme, setTheme] = useKitchenTheme();
  useDarkPage(theme === 'dark');
  const { refused: wakeRefused } = useWakeLock();
  const [wakeNoticeHidden, setWakeNoticeHidden] = React.useState(false);

  const openIds = React.useMemo(() => (orders ? new Set(orders.map((o) => o.id)) : null), [orders]);
  const { checks, toggle } = useKitchenChecks(shop.slug, openIds);

  const tickets = React.useMemo(() => kitchenTickets(allOrders, now, type), [allOrders, now, type]);
  const ready = React.useMemo(() => kitchenReady(allOrders, type), [allOrders, type]);
  const newIds = useNewIds(tickets, orders !== undefined);

  const counts = React.useMemo<TypeFilterCounts>(() => {
    const visible = kitchenTickets(allOrders, now);
    const result: TypeFilterCounts = { all: visible.length, walk_in: 0, pickup: 0, delivery: 0 };
    for (const o of visible) result[o.type] += 1;
    return result;
  }, [allOrders, now]);

  const exit = React.useCallback(() => {
    const keepType = ORDER_TYPES.find((t) => t === search.type && t !== 'all');
    void navigate({ to: '/orders', search: { view: 'now', type: keepType } });
  }, [navigate, search.type]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exit]);

  React.useEffect(() => {
    const prefix = tickets.length > 0 ? `(${tickets.length}) ` : '';
    document.title = `${prefix}${words.kitchenView} · ${shop.name}`;
  }, [tickets.length, words.kitchenView, shop.name]);

  const handleAdvance = React.useCallback(
    async (order: BoardOrder) => {
      await advance(order);
    },
    [advance],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-sticky flex flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2 pt-safe">
        <Button
          type="button"
          variant="outline"
          onClick={exit}
          className="h-14 gap-2 px-3 text-base font-semibold"
        >
          <XIcon className="size-5" aria-hidden="true" />
          {ordersWords.kitchen.exit}
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold md:flex-none md:text-xl">
          {words.kitchenView}
        </h1>
        <TypeFilter
          to="/orders/kitchen"
          counts={counts}
          className="order-last w-full md:order-none md:w-auto"
        />
        <div className="flex items-center gap-2 md:ml-auto">
          {!soundEnabled && (
            <Button
              type="button"
              variant="outline"
              onClick={enableSound}
              className="h-14 gap-2 px-3 text-base"
            >
              <Volume2Icon className="size-5" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{ordersWords.states.soundNotice}</span>
            </Button>
          )}
          <Label
            htmlFor="kitchen-light"
            className="flex h-14 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-base font-medium"
          >
            <SunIcon className="size-5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{ordersWords.kitchen.lightOn}</span>
            <Switch
              id="kitchen-light"
              checked={theme === 'light'}
              onCheckedChange={(on) => setTheme(on ? 'light' : 'dark')}
            />
          </Label>
        </div>
      </header>

      <div className="space-y-2 px-3 pt-3 empty:hidden">
        {!isOnline && (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
            {ordersWords.kitchen.offlineReason}
          </Notice>
        )}
        {wakeRefused && !wakeNoticeHidden && (
          <Notice
            tone="info"
            icon={<MonitorSmartphoneIcon className="size-4" />}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWakeNoticeHidden(true)}
                className="h-11"
              >
                {ordersWords.kitchen.dismiss}
              </Button>
            }
          >
            {ordersWords.kitchen.wakeLockRefused}
          </Notice>
        )}
      </div>

      <main className="flex-1 p-3">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-80 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <PageError
            title={ordersWords.states.errorBoard}
            message={errorWords(errorCodeOf(error))}
            retryLabel={ordersWords.states.tryAgain}
            onRetry={() => void refetch()}
          />
        ) : tickets.length === 0 ? (
          <PageEmpty
            className="py-16"
            icon={<ChefHatIcon className="size-10 text-muted-foreground" />}
            description={
              shop.kind === 'retail' ? ordersWords.kitchen.emptyRetail : ordersWords.kitchen.empty
            }
            action={
              <Button
                type="button"
                variant="outline"
                onClick={exit}
                className="h-14 px-5 text-base"
              >
                {ordersWords.kitchen.exit}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {tickets.map((order) => (
              <KitchenItem
                key={order.id}
                slug={shop.slug}
                kind={shop.kind}
                order={order}
                now={now}
                isOnline={isOnline}
                isNew={newIds.has(order.id)}
                checked={checks[order.id] ?? []}
                onToggleLine={toggle}
                onPrint={printer.print}
                onAdvance={handleAdvance}
              />
            ))}
          </div>
        )}
      </main>

      {ready.length > 0 && (
        <footer className="sticky bottom-0 scrollbar-none flex items-center gap-3 overflow-x-auto border-t border-border bg-card px-3 py-3 pb-safe">
          <span className="shrink-0 text-lg font-bold text-success">
            {ordersWords.kitchen.readyRow}
          </span>
          <ul className="flex gap-2">
            {ready.map((o) => (
              <li
                key={o.id}
                className="shrink-0 rounded-lg bg-success-soft px-3 py-1 text-lg font-bold text-success-text tabular-nums"
              >
                {orderNoLabel(o.orderNo)}
              </li>
            ))}
          </ul>
        </footer>
      )}

      {printer.node}
    </div>
  );
}
