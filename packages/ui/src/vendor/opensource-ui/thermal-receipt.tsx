// Source: https://opensourceui.in/components/thermal-receipt · copied 2026-10-25 · MIT, Opensource UI by Bidyut Kundu
// Changes: our cn, paper colour and torn edges as tokens/utilities (no inline style), type sizes on our scale,
// sample data and labels removed (all from props; the tax row only shows when given). Nothing auto-updates.
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { cn } from 'cn';
import { QrCode } from 'lucide-react';

export type ThermalReceiptItem = Readonly<{
  key: string;
  name: string;
  price: string;
}>;

export type ThermalReceiptCardProps = Readonly<
  {
    storeName: string;
    storeAddress?: string;
    orderId: string;
    date: string;
    items: readonly ThermalReceiptItem[];
    subtotalLabel: string;
    subtotal: string;
    taxLabel?: string;
    tax?: string;
    totalLabel: string;
    total: string;
    footer?: string;
    // Replaces the decorative QR icon (for example a real QR code).
    code?: ReactNode;
  } & ComponentPropsWithoutRef<'div'>
>;

// Thermal Receipt — paper slip with torn top and bottom edges.
export const ThermalReceiptCard = forwardRef<HTMLDivElement, ThermalReceiptCardProps>(
  (
    {
      className,
      storeName,
      storeAddress,
      orderId,
      date,
      items,
      subtotalLabel,
      subtotal,
      taxLabel,
      tax,
      totalLabel,
      total,
      footer,
      code,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      data-slot="thermal-receipt-card"
      className={cn('w-full font-mono', className)}
      {...props}
    >
      <div className="relative bg-paper px-4 py-5 text-paper-foreground shadow-md">
        <div className="pointer-events-none absolute -top-2 right-0 left-0 h-2 receipt-edge-top" />

        <div data-slot="thermal-receipt-card-header" className="text-center">
          <p className="text-sm font-bold tracking-widest">{storeName}</p>
          {storeAddress ? (
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{storeAddress}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {orderId} · {date}
          </p>
        </div>

        <div
          data-slot="thermal-receipt-card-divider"
          className="my-3 border-t border-dashed border-border-strong"
        />

        <div data-slot="thermal-receipt-card-items" className="space-y-1.5">
          {items.map((item) => (
            <div key={item.key} className="flex justify-between gap-2 text-xs">
              <span className="min-w-0 truncate">{item.name}</span>
              <span className="shrink-0 tabular-nums">{item.price}</span>
            </div>
          ))}
        </div>

        <div className="my-3 border-t border-dashed border-border-strong" />

        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>{subtotalLabel}</span>
            <span className="tabular-nums">{subtotal}</span>
          </div>
          {taxLabel && tax ? (
            <div className="flex justify-between text-muted-foreground">
              <span>{taxLabel}</span>
              <span className="tabular-nums">{tax}</span>
            </div>
          ) : null}
          <div className="flex justify-between pt-1 text-sm font-bold">
            <span>{totalLabel}</span>
            <span className="tabular-nums">{total}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          {code ?? <QrCode size={36} className="text-paper-foreground" aria-hidden />}
          {footer ? (
            <p className="text-center text-xs leading-snug text-muted-foreground">{footer}</p>
          ) : null}
        </div>

        <div className="pointer-events-none absolute right-0 -bottom-2 left-0 h-2 receipt-edge-bottom" />
      </div>
    </div>
  ),
);

ThermalReceiptCard.displayName = 'ThermalReceiptCard';
