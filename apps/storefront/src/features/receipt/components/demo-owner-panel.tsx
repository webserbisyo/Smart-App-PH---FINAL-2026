'use client';

import { useState } from 'react';
import { isDemoShopSlug, isFinal, words, type OrderReceipt } from '@smartapp/core';
import { qk, useAdapters, useQueryClient } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@smartapp/ui/components/collapsible';
import { ChevronDown, Wrench } from 'lucide-react';
import { showTestNotification } from '../../install/push';
import { useShop } from '../../shell/components/shop-context';
import { formatOrderNumber } from '../receipt-rules';

export interface DemoOwnerPanelProps {
  readonly slug: string;
  readonly order: OrderReceipt;
}

export function DemoOwnerPanel({ slug, order }: DemoOwnerPanelProps) {
  const { ownerOrders } = useAdapters();
  const { shop } = useShop();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // In production builds, this component should never render anything
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  async function resolveOrderId(): Promise<string | null> {
    try {
      const openOrders = await ownerOrders.listOrders({ slug, open: true });
      const found = openOrders.find((o) => o.token === order.token);
      if (found) return found.id;

      // Fallback: search date
      const dateStr = order.placedAt.slice(0, 10);
      const dayOrders = await ownerOrders.listOrders({ slug, date: dateStr });
      const foundInDay = dayOrders.find((o) => o.token === order.token);
      return foundInDay ? foundInDay.id : null;
    } catch {
      return null;
    }
  }

  async function runAction(action: (orderId: string) => Promise<unknown>) {
    setIsPending(true);
    try {
      const orderId = await resolveOrderId();
      if (!orderId) {
        alert('Could not locate order ID in mock store');
        return;
      }
      await action(orderId);
      await queryClient.invalidateQueries({ queryKey: qk.order(slug, order.token) });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsPending(false);
    }
  }

  const isTransfer = order.paymentMethod !== 'cash' && order.paymentMethod !== 'cod';
  const isUnpaid = order.paymentStatus === 'unpaid';
  const isProofPending = order.paymentStatus === 'pending';
  const isPaid = order.paymentStatus === 'paid';
  const status = order.status;
  const isFinished = isFinal(status);

  return (
    <div
      id="demo-owner-panel"
      className="fixed right-4 bottom-4 z-40 max-w-sm rounded-xl border bg-card/95 p-3 text-xs shadow-lg backdrop-blur-md"
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          render={
            <Button
              type="button"
              id="demo-owner-panel-trigger"
              variant="ghost"
              size="sm"
              className="flex h-8 w-full items-center justify-between gap-2 px-2 py-1 font-semibold text-primary"
            />
          }
        >
          <div className="flex items-center gap-1.5">
            <Wrench className="size-3.5" />
            <span>Demo owner controls</span>
          </div>
          <ChevronDown className={`size-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2.5 flex flex-col gap-2 border-t pt-2">
          <p className="text-xs text-muted-foreground">
            Advance this order through owner states without visiting the dashboard:
          </p>

          <div className="flex flex-col gap-1.5">
            {/* Payment actions */}
            {isTransfer && (
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  id="demo-owner-approve"
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-xs"
                  disabled={isPending || !isProofPending}
                  onClick={() =>
                    runAction((id) =>
                      ownerOrders.reviewPayment({ slug, orderId: id, approve: true }),
                    )
                  }
                >
                  Approve payment
                </Button>
                <Button
                  type="button"
                  id="demo-owner-reject"
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-xs text-destructive hover:text-destructive"
                  disabled={isPending || !isProofPending}
                  onClick={() =>
                    runAction((id) =>
                      ownerOrders.reviewPayment({
                        slug,
                        orderId: id,
                        approve: false,
                        rejectReason: 'Payment amount is short',
                      }),
                    )
                  }
                >
                  Reject payment
                </Button>
              </div>
            )}

            {isUnpaid && (
              <Button
                type="button"
                id="demo-owner-record-cash"
                size="sm"
                variant="outline"
                className="h-7 w-full text-xs"
                disabled={isPending}
                onClick={() =>
                  runAction((id) =>
                    ownerOrders.recordPayment({
                      slug,
                      orderId: id,
                      method: order.paymentMethod,
                    }),
                  )
                }
              >
                Record cash received
              </Button>
            )}

            {/* Preparation / Progress actions */}
            {status === 'placed' && (
              <Button
                type="button"
                id="demo-owner-start-preparing"
                size="sm"
                variant="secondary"
                className="h-7 w-full text-xs"
                disabled={isPending || (!isPaid && order.type !== 'delivery')}
                onClick={() =>
                  runAction((id) =>
                    ownerOrders.advanceOrder({ slug, orderId: id, toStatus: 'preparing' }),
                  )
                }
              >
                Start preparing
              </Button>
            )}

            {status === 'preparing' && (
              <Button
                type="button"
                id="demo-owner-ready"
                size="sm"
                variant="secondary"
                className="h-7 w-full text-xs"
                disabled={isPending}
                onClick={() =>
                  runAction((id) =>
                    ownerOrders.advanceOrder({ slug, orderId: id, toStatus: 'ready' }),
                  )
                }
              >
                Mark ready
              </Button>
            )}

            {status === 'ready' && order.type === 'delivery' && (
              <Button
                type="button"
                id="demo-owner-out-for-delivery"
                size="sm"
                variant="secondary"
                className="h-7 w-full text-xs"
                disabled={isPending}
                onClick={() =>
                  runAction(async (id) => {
                    await ownerOrders.saveDeliveryInfo({
                      slug,
                      orderId: id,
                      riderName: 'Kuya Jun',
                      riderPhone: '0917 000 5555',
                      trackingUrl: 'https://example.com/track/demo-ride',
                    });
                    await ownerOrders.advanceOrder({
                      slug,
                      orderId: id,
                      toStatus: 'out_for_delivery',
                    });
                  })
                }
              >
                Out for delivery (assign rider)
              </Button>
            )}

            {(status === 'ready' || status === 'out_for_delivery') && (
              <Button
                type="button"
                id="demo-owner-complete"
                size="sm"
                variant="default"
                className="h-7 w-full text-xs"
                disabled={isPending}
                onClick={() =>
                  runAction((id) =>
                    ownerOrders.advanceOrder({ slug, orderId: id, toStatus: 'completed' }),
                  )
                }
              >
                Complete order
              </Button>
            )}

            {/* What an order update looks like on this phone (T13). */}
            <Button
              type="button"
              id="demo-owner-test-notification"
              size="sm"
              variant="outline"
              className="h-7 w-full text-xs"
              onClick={() =>
                void showTestNotification({
                  title: words.install.notificationTitle(shop.storefront.info.name),
                  body: words.install.notificationBody(
                    formatOrderNumber(order.orderNo),
                    words.shop.orderStatus[status],
                  ),
                  url: `/${slug}/o/${order.token}`,
                  icon: isDemoShopSlug(slug) ? `/demo/${slug}/brand/icon-192.png` : undefined,
                })
              }
            >
              {words.install.testNotification}
            </Button>

            {/* Cancel actions */}
            {!isFinished && (
              <div className="flex gap-1.5 pt-1">
                <Button
                  type="button"
                  id="demo-owner-cancel"
                  size="sm"
                  variant="ghost"
                  className="h-7 flex-1 text-xs text-destructive hover:bg-destructive/10"
                  disabled={isPending}
                  onClick={() =>
                    runAction((id) =>
                      ownerOrders.cancelOrder({
                        slug,
                        orderId: id,
                        reason: 'Cancelled by shop owner',
                      }),
                    )
                  }
                >
                  Cancel
                </Button>
                {isPaid && (
                  <Button
                    type="button"
                    id="demo-owner-refund"
                    size="sm"
                    variant="ghost"
                    className="h-7 flex-1 text-xs text-destructive hover:bg-destructive/10"
                    disabled={isPending}
                    onClick={() =>
                      runAction((id) =>
                        ownerOrders.cancelOrder({
                          slug,
                          orderId: id,
                          reason: 'Item out of stock · full refund',
                        }),
                      )
                    }
                  >
                    Cancel & Refund
                  </Button>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
