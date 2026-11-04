import { useState } from 'react';
import { ORDER_STAGES, type BoardOrder } from '@smartapp/core';
import { useOpenOrders } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ResponsiveSheet } from '@smartapp/ui/compositions/responsive-sheet';
import { OrderCard } from '@/app/orders/order-card';
import { StageChip } from '@/app/orders/stage-chip';
import { TimeChip } from '@/app/orders/time-chip';
import { KitSection } from './kit-section.js';

const KIT_SLUG = 'kanto-smash';
const noop = () => undefined;
const resolved = (): Promise<void> => Promise.resolve();

/** Pick one order per look so every card state shows: locked, new, preparing, ready, out, member. */
function samples(orders: readonly BoardOrder[]): BoardOrder[] {
  const picks: BoardOrder[] = [];
  const add = (found: BoardOrder | undefined) => {
    if (found && !picks.includes(found)) picks.push(found);
  };
  add(
    orders.find(
      (o) => o.status === 'placed' && o.paymentStatus !== 'paid' && o.paymentMethod !== 'cash',
    ),
  );
  add(orders.find((o) => o.status === 'placed' && o.paymentStatus === 'paid'));
  add(orders.find((o) => o.status === 'preparing'));
  add(orders.find((o) => o.status === 'ready'));
  add(orders.find((o) => o.status === 'out_for_delivery'));
  add(orders.find((o) => o.memberStamps !== null));
  return picks;
}

/** Orders v2 pieces on /kit (T54): stage chips, time chips, the order card states and the responsive sheet. */
export function OrdersV2Sections() {
  const { data: orders = [], isPending } = useOpenOrders(KIT_SLUG);
  const [sheetOpen, setSheetOpen] = useState(false);
  const now = new Date();
  const picks = samples(orders);

  return (
    <>
      <KitSection
        title="Stage chips (Orders v2)"
        library="composition of ReUI Badge + stage tokens"
        path="apps/dashboard/src/app/orders/stage-chip.tsx"
        usedIn="Orders board column heads, List view status, order panel header (T54, T56)"
      >
        <div className="flex flex-wrap gap-2">
          {ORDER_STAGES.map((stage) => (
            <StageChip key={stage} stage={stage} kind="food" count={3} />
          ))}
          <StageChip stage="preparing" kind="retail" />
        </div>
      </KitSection>

      <KitSection
        title="Time chips (Orders v2)"
        library="composition of ReUI Badge"
        path="apps/dashboard/src/app/orders/time-chip.tsx"
        usedIn="order card, order panel header (D10)"
      >
        <div className="flex flex-wrap gap-2">
          <TimeChip
            order={{
              status: 'placed',
              dueAt: new Date(now.getTime() + 20 * 60_000).toISOString(),
              lastStepAt: now.toISOString(),
              scheduledAt: null,
            }}
            now={now}
          />
          <TimeChip
            order={{
              status: 'preparing',
              dueAt: new Date(now.getTime() + 4 * 60_000).toISOString(),
              lastStepAt: now.toISOString(),
              scheduledAt: null,
            }}
            now={now}
          />
          <TimeChip
            order={{
              status: 'preparing',
              dueAt: new Date(now.getTime() - 6 * 60_000).toISOString(),
              lastStepAt: now.toISOString(),
              scheduledAt: null,
            }}
            now={now}
          />
          <TimeChip
            order={{
              status: 'ready',
              dueAt: now.toISOString(),
              lastStepAt: new Date(now.getTime() - 12 * 60_000).toISOString(),
              scheduledAt: null,
            }}
            now={now}
          />
          <TimeChip
            order={{
              status: 'out_for_delivery',
              dueAt: now.toISOString(),
              lastStepAt: new Date(now.getTime() - 18 * 60_000).toISOString(),
              scheduledAt: null,
            }}
            now={now}
          />
        </div>
      </KitSection>

      <KitSection
        title="Order card states (Orders v2)"
        library="composition (Avatar, AvatarGroup, ReUI Badge, AsyncButton)"
        path="apps/dashboard/src/app/orders/order-card.tsx"
        usedIn="Orders board (phone list and Kanban), kit (D11)"
      >
        {isPending ? (
          <Skeleton className="h-48 w-72 rounded-xl" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                now={now}
                kind="food"
                onOpen={noop}
                onAdvance={resolved}
                onPayAndComplete={resolved}
              />
            ))}
          </div>
        )}
      </KitSection>

      <KitSection
        title="Responsive sheet"
        library="composition of shadcn Sheet + Drawer"
        path="packages/ui/src/compositions/responsive-sheet.tsx"
        usedIn="Orders order panel (T54)"
      >
        <Button variant="outline" className="h-11 md:h-9" onClick={() => setSheetOpen(true)}>
          Open the sheet
        </Button>
        <ResponsiveSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Responsive sheet"
          header={<div className="border-b px-4 py-3 text-lg font-bold">Pinned header</div>}
          footer={
            <Button className="h-11 w-full" onClick={() => setSheetOpen(false)}>
              Pinned main button
            </Button>
          }
        >
          <div className="space-y-3 p-4">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </ResponsiveSheet>
      </KitSection>
    </>
  );
}
