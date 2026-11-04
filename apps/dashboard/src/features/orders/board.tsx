import * as React from 'react';
import { CalendarClockIcon, CircleCheckIcon } from 'lucide-react';
import type { BoardOrder, OrderStage, OrderStatus, ShopKind } from '@smartapp/core';
import {
  awaitsTransfer,
  boardColumn,
  canAdvance,
  formatPeso,
  ordersWords,
  stageStatus,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanCommitMeta,
} from '@smartapp/ui/components/reui/kanban';
import { Scroller } from '@smartapp/ui/components/scroller';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from 'cn';
import { OrderCard, orderNoLabel } from '@/app/orders/order-card';
import { AnimatePresence, FadeUp } from '@/app/orders/order-motion';
import { STAGE_LOOK, stageLabel } from '@/app/orders/stage';
import { StageChip } from '@/app/orders/stage-chip';
import { StageIcon } from '@/app/orders/stage-icon';
import { refusedMoveWords } from '@/app/orders/use-step-change';
import { PHONE_STAGES, type PhoneStage } from './search.js';

export type BoardStage = Exclude<OrderStage, 'done'>;
type Columns = Record<OrderStage, BoardOrder[]>;

export interface BoardProps {
  orders: readonly BoardOrder[];
  now: Date;
  kind: ShopKind;
  delivers: boolean;
  isPhone: boolean;
  disabled: boolean;
  fresh: ReadonlySet<string>;
  laterCount: number;
  done: { count: number; total: number };
  phoneStage: PhoneStage;
  onPhoneStageChange: (stage: PhoneStage) => void;
  onOpen: (order: BoardOrder) => void;
  onAdvance: (order: BoardOrder, to: OrderStatus) => Promise<void>;
  onPayAndComplete: (order: BoardOrder) => Promise<void>;
  onShowLater: () => void;
  onShowDone: () => void;
}

const byDue = (a: BoardOrder, b: BoardOrder) =>
  a.dueAt.localeCompare(b.dueAt) || a.orderNo - b.orderNo;

/** Open orders by stage, oldest due first. Placed orders that start later sit off the board. */
export function groupByStage(orders: readonly BoardOrder[], now: Date): Columns {
  const cols: Columns = { new: [], preparing: [], ready: [], out: [], done: [] };
  for (const order of orders) {
    const col = boardColumn(order, now);
    if (col && col !== 'scheduled') cols[col].push(order);
  }
  cols.new.sort(byDue);
  cols.preparing.sort(byDue);
  cols.ready.sort(byDue);
  cols.out.sort(byDue);
  return cols;
}

function columnTotal(orders: readonly BoardOrder[]): number {
  return orders.reduce((sum, o) => sum + o.total, 0);
}

/** A card that can't be picked up: an unpaid transfer waits for its payment check. */
function isLocked(order: BoardOrder): boolean {
  return order.status === 'placed' && awaitsTransfer(order);
}

export function Board(props: BoardProps) {
  return props.isPhone ? <PhoneBoard {...props} /> : <KanbanBoardView {...props} />;
}

// ---------------------------------------------------------------- phone: one stage at a time

function PhoneBoard({
  orders,
  now,
  kind,
  delivers,
  disabled,
  fresh,
  laterCount,
  phoneStage,
  onPhoneStageChange,
  onOpen,
  onAdvance,
  onPayAndComplete,
  onShowLater,
}: BoardProps) {
  const cols = React.useMemo(() => groupByStage(orders, now), [orders, now]);
  const stages = PHONE_STAGES.filter((s) => s !== 'out' || delivers || cols.out.length > 0);
  const current = stages.includes(phoneStage) ? phoneStage : 'new';
  const list = cols[current];

  return (
    <div className="flex flex-col gap-3">
      {/* Sticky stage strip in stage colours. */}
      <div className="sticky top-0 z-sticky -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur-sm">
        <Scroller orientation="horizontal" hideScrollbar>
          <ToggleGroup
            value={[current]}
            onValueChange={(next) => {
              const picked = PHONE_STAGES.find((s) => s === next[0]);
              if (picked) onPhoneStageChange(picked);
            }}
            aria-label={ordersWords.stages.label}
            spacing={1.5}
            className="w-max"
          >
            {stages.map((stage) => {
              const look = STAGE_LOOK[stage];
              const count = cols[stage].length;
              return (
                <ToggleGroupItem
                  key={stage}
                  value={stage}
                  aria-label={ordersWords.stages.count(stageLabel(stage, kind), count)}
                  className={cn(
                    'h-10 gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-muted-foreground hover:bg-card',
                    'aria-pressed:border-transparent aria-pressed:shadow-xs',
                    current === stage && cn(look.soft, look.text),
                  )}
                >
                  <span className={cn('size-2 rounded-full', look.dot)} aria-hidden="true" />
                  <StageIcon stage={stage} kind={kind} />
                  {stageLabel(stage, kind)}
                  <span className="tabular-nums">{count}</span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </Scroller>
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {ordersWords.board.emptyStage}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((order, index) => (
              <FadeUp key={order.id} index={index} exit>
                <OrderCard
                  order={order}
                  now={now}
                  kind={kind}
                  onOpen={onOpen}
                  onAdvance={onAdvance}
                  onPayAndComplete={onPayAndComplete}
                  disabled={disabled}
                  fresh={fresh.has(order.id)}
                />
              </FadeUp>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Booked for later today: under the list, so the first card stays near the top. */}
      {current === 'new' && laterCount > 0 ? (
        <LaterLink count={laterCount} onClick={onShowLater} />
      ) : null}
    </div>
  );
}

function LaterLink({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      aria-label={ordersWords.board.laterTodayAria(count)}
      className="h-10 w-full justify-center gap-1.5 rounded-xl border border-dashed text-sm font-semibold text-muted-foreground"
    >
      <CalendarClockIcon aria-hidden="true" />
      {ordersWords.board.laterToday(count)}
    </Button>
  );
}

// ---------------------------------------------------------------- tablet and laptop: Kanban

function KanbanBoardView({
  orders,
  now,
  kind,
  delivers,
  disabled,
  fresh,
  laterCount,
  done,
  onOpen,
  onAdvance,
  onPayAndComplete,
  onShowLater,
  onShowDone,
}: BoardProps) {
  const grouped = React.useMemo(() => groupByStage(orders, now), [orders, now]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  // The owner's preview while a card is in hand, and right after a drop until the server's list catches
  // up (so the card doesn't jump back for a frame). Any fresh list from the server replaces it.
  const [held, setHeld] = React.useState<{ cols: Columns; base: Columns } | null>(null);
  const columns = held && (activeId !== null || held.base === grouped) ? held.cols : grouped;
  const hold = (cols: Columns) => setHeld({ cols, base: grouped });

  const showOut = delivers || grouped.out.length > 0;
  const stages: OrderStage[] = showOut
    ? ['new', 'preparing', 'ready', 'out', 'done']
    : ['new', 'preparing', 'ready', 'done'];
  const visible: Columns = React.useMemo(
    () => (showOut ? columns : { ...columns, out: [] }),
    [columns, showOut],
  );

  const activeOrder = activeId ? orders.find((o) => o.id === activeId) : undefined;
  const origin = activeOrder ? (boardColumn(activeOrder, now) ?? null) : null;
  const target = activeId
    ? (stages.find((s) => columns[s].some((o) => o.id === activeId)) ?? null)
    : null;
  const allowed = (stage: OrderStage): boolean => {
    if (!activeOrder) return true;
    if (stage === origin) return true;
    return canAdvance(activeOrder, stageStatus(stage)).ok;
  };

  const handleCommit = (next: Record<string, BoardOrder[]>, meta: KanbanCommitMeta<BoardOrder>) => {
    const restore = () => setHeld(null);
    if (meta.kind !== 'item') return restore();
    const order = orders.find((o) => o.id === String(meta.event.active.id));
    const to = stages.find((s) => s === meta.overContainer);
    if (!order || !to || meta.overContainer === meta.activeContainer) return restore();
    const status = stageStatus(to);
    const check = canAdvance(order, status);
    if (!check.ok) {
      restore();
      notify({ title: refusedMoveWords(check.code, status), tone: 'error' });
      return;
    }
    hold(toColumns(next));
    onAdvance(order, status).catch(restore);
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      <Kanban
        value={visible}
        onValueChange={(value) => hold(toColumns(value))}
        onValueCommit={handleCommit}
        restoreOnCancel
        getItemValue={(item) => item.id}
        onDragStart={(event) => {
          hold(grouped);
          setActiveId(String(event.active.id));
        }}
        onDragEnd={() => setActiveId(null)}
        onDragCancel={() => {
          setActiveId(null);
          setHeld(null);
        }}
      >
        <KanbanBoard className="flex min-w-max gap-3 lg:min-w-0">
          {stages.map((stage) =>
            stage === 'done' ? (
              <DoneRail
                key={stage}
                kind={kind}
                count={done.count}
                total={done.total}
                dropping={target === 'done'}
                dimmed={activeOrder !== undefined && !allowed('done')}
                items={visible.done}
                onShowDone={onShowDone}
              />
            ) : (
              <StageColumn
                key={stage}
                stage={stage}
                kind={kind}
                orders={visible[stage]}
                dropping={activeOrder !== undefined && target === stage && stage !== origin}
                dimmed={activeOrder !== undefined && !allowed(stage)}
                footer={
                  stage === 'new' && laterCount > 0 ? (
                    <LaterLink count={laterCount} onClick={onShowLater} />
                  ) : null
                }
              >
                {visible[stage].map((order, index) => (
                  <KanbanItem
                    key={order.id}
                    value={order.id}
                    disabled={disabled || isLocked(order)}
                    // A locked or offline card stays readable; only dragging is off.
                    className="opacity-100"
                    // The card holds its own buttons, so the drag wrapper is a group, not another button.
                    role="group"
                    aria-label={ordersWords.ticket.open(
                      orderNoLabel(order.orderNo),
                      order.customerName,
                    )}
                  >
                    <KanbanItemHandle cursor={!isLocked(order)}>
                      <FadeUp index={index}>
                        <OrderCard
                          order={order}
                          now={now}
                          kind={kind}
                          onOpen={onOpen}
                          onAdvance={onAdvance}
                          onPayAndComplete={onPayAndComplete}
                          disabled={disabled}
                          fresh={fresh.has(order.id)}
                        />
                      </FadeUp>
                    </KanbanItemHandle>
                  </KanbanItem>
                ))}
              </StageColumn>
            ),
          )}
        </KanbanBoard>
        <KanbanOverlay>
          {({ value }) => {
            const order = orders.find((o) => o.id === value);
            if (!order) return null;
            return (
              <div className="w-72 rotate-2 cursor-grabbing shadow-lg">
                <OrderCard
                  order={order}
                  now={now}
                  kind={kind}
                  onOpen={onOpen}
                  onAdvance={onAdvance}
                  onPayAndComplete={onPayAndComplete}
                />
              </div>
            );
          }}
        </KanbanOverlay>
      </Kanban>
    </div>
  );
}

function toColumns(value: Record<string, BoardOrder[]>): Columns {
  return {
    new: value.new ?? [],
    preparing: value.preparing ?? [],
    ready: value.ready ?? [],
    out: value.out ?? [],
    done: value.done ?? [],
  };
}

interface StageColumnProps {
  stage: BoardStage;
  kind: ShopKind;
  orders: readonly BoardOrder[];
  dropping: boolean;
  dimmed: boolean;
  footer: React.ReactNode;
  children: React.ReactNode;
}

function StageColumn({
  stage,
  kind,
  orders,
  dropping,
  dimmed,
  footer,
  children,
}: StageColumnProps) {
  const look = STAGE_LOOK[stage];
  return (
    <KanbanColumn
      value={stage}
      data-stage={stage}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-2xl border border-transparent bg-muted/50 transition duration-base lg:w-auto lg:min-w-0 lg:flex-1',
        dropping && cn('border-dashed', look.border, look.soft),
        dimmed && 'opacity-40',
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className={cn('h-4 w-1 rounded-full', look.dot)} aria-hidden="true" />
        <StageChip stage={stage} kind={kind} />
        <span className="text-sm font-bold tabular-nums">{orders.length}</span>
        <span className="ml-auto truncate text-xs font-medium text-muted-foreground tabular-nums">
          {formatPeso(columnTotal(orders))}
        </span>
      </div>
      <KanbanColumnContent
        value={stage}
        className="scrollbar-none flex min-h-40 flex-1 flex-col gap-2.5 overflow-y-auto px-2 pb-2 md:max-h-vh-70"
      >
        {orders.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            {ordersWords.board.emptyStage}
          </p>
        ) : null}
        {children}
      </KanbanColumnContent>
      {footer ? <div className="px-2 pb-2">{footer}</div> : null}
    </KanbanColumn>
  );
}

interface DoneRailProps {
  kind: ShopKind;
  count: number;
  total: number;
  dropping: boolean;
  dimmed: boolean;
  items: readonly BoardOrder[];
  onShowDone: () => void;
}

/** A narrow Done rail: today's count and total, and a place to drop a finished order. */
function DoneRail({ kind, count, total, dropping, dimmed, items, onShowDone }: DoneRailProps) {
  const look = STAGE_LOOK.done;
  return (
    <KanbanColumn
      value="done"
      data-stage="done"
      className={cn(
        'flex w-24 shrink-0 flex-col rounded-2xl border border-dashed border-border bg-muted/30 transition duration-base',
        dropping && cn(STAGE_LOOK.ready.border, STAGE_LOOK.ready.soft),
        dimmed && 'opacity-40',
      )}
    >
      <button
        type="button"
        onClick={onShowDone}
        aria-label={ordersWords.board.doneAria(count, formatPeso(total))}
        className="flex flex-1 flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <CircleCheckIcon className={cn('size-6', look.text)} aria-hidden="true" />
        <span className={cn('text-xs font-semibold', look.text)}>{stageLabel('done', kind)}</span>
        <span className="text-2xl font-bold tabular-nums">{count}</span>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {formatPeso(total)}
        </span>
        <span className="mt-auto text-xs leading-snug text-muted-foreground">
          {ordersWords.board.dropToFinish}
        </span>
      </button>
      {/* Drop target: a card dropped here shows as a thin slip until the server confirms. */}
      <KanbanColumnContent value="done" className="flex flex-col gap-1 px-1.5 pb-2">
        {items.map((order) => (
          <KanbanItem key={order.id} value={order.id}>
            <div className={cn('h-2 rounded-full', STAGE_LOOK.ready.dot)} />
          </KanbanItem>
        ))}
      </KanbanColumnContent>
    </KanbanColumn>
  );
}
