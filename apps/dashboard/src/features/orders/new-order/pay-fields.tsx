import {
  formatPeso,
  newOrderWords,
  paymentLabel,
  type OrderType,
  type PaymentMethod,
  type Quote,
  type Storefront,
} from '@smartapp/core';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Switch } from '@smartapp/ui/components/switch';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { cn } from 'cn';
import { PesoInput } from '@/app/peso-input';
import { partValid, type Draft } from './draft.js';

const W = newOrderWords;
const PRESSED = 'aria-pressed:bg-primary aria-pressed:text-primary-foreground';
const TRANSFER: readonly PaymentMethod[] = ['gcash', 'maya', 'bank', 'qr_ph'];

export interface PayChoice {
  key: string;
  method: PaymentMethod;
  accountId: string | null;
  label: string;
}

/**
 * The ways the owner can record payment (T111): cash for walk-in and pickup (even when the storefront
 * has no cash), cash on delivery for delivery, and each of the shop's transfer accounts.
 */
export function payChoices(storefront: Storefront, type: OrderType): PayChoice[] {
  const list: PayChoice[] = [];
  if (type === 'delivery') {
    if (storefront.payments.some((p) => p.method === 'cod'))
      list.push({
        key: 'cod',
        method: 'cod',
        accountId: null,
        label: paymentLabel({ method: 'cod', bank: null }),
      });
  } else {
    list.push({
      key: 'cash',
      method: 'cash',
      accountId: null,
      label: paymentLabel({ method: 'cash', bank: null }),
    });
  }
  for (const account of storefront.payments) {
    if (!TRANSFER.includes(account.method)) continue;
    list.push({
      key: account.id,
      method: account.method,
      accountId: account.id,
      label: paymentLabel(account),
    });
  }
  return list;
}

export function choiceKey(draft: Pick<Draft, 'paymentMethod' | 'paymentAccountId'>): string {
  return draft.paymentAccountId ?? draft.paymentMethod;
}

/** Step 3 of New order (T111): paid with, paid now / not yet / part, and for a walk-in, handed over. */
export function PayFields({
  draft,
  onChange,
  storefront,
  total,
  editing,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  storefront: Storefront;
  total: number;
  editing: boolean;
}) {
  const choices = payChoices(storefront, draft.type);
  const badPart = draft.paidKind === 'part' && draft.partAmount > 0 && !partValid(draft, total);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{W.pay.method}</span>
        <ToggleGroup
          value={[choiceKey(draft)]}
          onValueChange={(next) => {
            const picked = choices.find((c) => c.key === next[0]);
            if (picked)
              onChange({ paymentMethod: picked.method, paymentAccountId: picked.accountId });
          }}
          aria-label={W.pay.method}
          spacing={2}
          className="flex flex-wrap justify-start"
        >
          {choices.map((c) => (
            <ToggleGroupItem
              key={c.key}
              value={c.key}
              variant="outline"
              className={`h-11 rounded-full px-4 text-sm font-medium md:h-9 ${PRESSED}`}
            >
              {c.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {!editing ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{W.pay.title}</span>
          <ToggleGroup
            value={[draft.paidKind]}
            onValueChange={(next) => {
              const kind = (['paid', 'unpaid', 'part'] as const).find((k) => k === next[0]);
              if (kind)
                onChange({ paidKind: kind, handedOver: kind === 'paid' && draft.handedOver });
            }}
            aria-label={W.pay.title}
            spacing={2}
            className="grid grid-cols-3"
          >
            {(['paid', 'unpaid', 'part'] as const).map((k) => (
              <ToggleGroupItem
                key={k}
                value={k}
                variant="outline"
                className={`h-11 px-2 text-sm font-semibold md:h-9 ${PRESSED}`}
              >
                {W.pay[k]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {draft.paidKind === 'part' ? (
            <Field data-invalid={badPart || undefined}>
              <FieldLabel htmlFor="new-order-part">{W.pay.partAmount}</FieldLabel>
              <PesoInput
                id="new-order-part"
                value={draft.partAmount}
                onChange={(amount) => onChange({ partAmount: amount })}
                className="sm:max-w-48"
              />
              <FieldDescription className={cn(badPart && 'text-destructive')}>
                {badPart ? W.pay.partInvalid(formatPeso(total)) : W.pay.partHint(formatPeso(total))}
              </FieldDescription>
            </Field>
          ) : null}
          {draft.paidKind === 'unpaid' && TRANSFER.includes(draft.paymentMethod) ? (
            <p className="text-sm text-muted-foreground">{W.pay.transferNote}</p>
          ) : null}
        </div>
      ) : null}

      {!editing && draft.type === 'walk_in' ? (
        <Field orientation="horizontal" className="rounded-xl border p-3">
          <FieldContent>
            <FieldLabel htmlFor="new-order-handed">{W.pay.handedOver}</FieldLabel>
            <FieldDescription>{W.pay.handedOverHint}</FieldDescription>
          </FieldContent>
          <Switch
            id="new-order-handed"
            checked={draft.handedOver}
            disabled={draft.paidKind !== 'paid'}
            onCheckedChange={(on) => onChange({ handedOver: on })}
          />
        </Field>
      ) : null}
    </div>
  );
}

/** Subtotal, prize, delivery fee, total, and what is paid now or still to collect. */
export function Totals({
  quote,
  draft,
  editing,
  className,
}: {
  quote: Quote | undefined;
  draft: Draft;
  editing: boolean;
  className?: string | undefined;
}) {
  if (!quote) return null;
  const paid = editing
    ? null
    : draft.paidKind === 'paid'
      ? quote.total
      : draft.paidKind === 'part'
        ? draft.partAmount
        : 0;
  const row = 'flex items-center justify-between gap-3 text-sm tabular-nums';
  return (
    <dl className={cn('flex flex-col gap-1.5', className)}>
      <div className={row}>
        <dt className="text-muted-foreground">{W.totals.subtotal}</dt>
        <dd>{formatPeso(quote.subtotal)}</dd>
      </div>
      {quote.discount > 0 ? (
        <div className={row}>
          <dt className="text-muted-foreground">{W.totals.prize}</dt>
          <dd className="text-member-text">−{formatPeso(quote.discount)}</dd>
        </div>
      ) : null}
      {draft.type === 'delivery' ? (
        <div className={row}>
          <dt className="text-muted-foreground">{W.totals.deliveryFee}</dt>
          <dd>{formatPeso(quote.deliveryFee)}</dd>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-t pt-2 text-base font-bold tabular-nums">
        <dt>{W.totals.total}</dt>
        <dd>{formatPeso(quote.total)}</dd>
      </div>
      {paid !== null && draft.paidKind === 'part' ? (
        <>
          <div className={row}>
            <dt className="text-muted-foreground">{W.totals.paidNow}</dt>
            <dd>{formatPeso(paid)}</dd>
          </div>
          <div className={cn(row, 'font-semibold')}>
            <dt>{W.totals.toCollect}</dt>
            <dd>{formatPeso(Math.max(0, quote.total - paid))}</dd>
          </div>
        </>
      ) : null}
    </dl>
  );
}
