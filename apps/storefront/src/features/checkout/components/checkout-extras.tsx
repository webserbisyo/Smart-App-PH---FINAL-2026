'use client';

import { formatPeso, words, type Item, type Storefront } from '@smartapp/core';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@smartapp/ui/components/field';
import { Separator } from '@smartapp/ui/components/separator';
import { Switch } from '@smartapp/ui/components/switch';
import { Textarea } from '@smartapp/ui/components/textarea';
import { GiftIcon } from 'lucide-react';
import { CheckoutStep } from './checkout-step';

const NOTE_MAX_CHARS = 300;

interface CheckoutExtrasProps {
  sf: Storefront;
  items: Item[];
  readyReward: {
    kind: 'discount' | 'free_item';
    title: string;
    soldOutToday: boolean;
  } | null;
  useReward: boolean;
  onUseRewardChange: (val: boolean) => void;
  note: string;
  onNoteChange: (val: string) => void;
  subtotalCentavos: number;
  discountCentavos: number;
  deliveryFeeCentavos: number | null;
  totalCentavos: number;
  isDelivery: boolean;
}

/**
 * After the steps: the reward switch in a member-coloured card (c-switch-2), then the order note
 * (c-textarea-6, grows with the text) and the totals (c-separator-6) with the consent line.
 */
export function CheckoutExtras({
  readyReward,
  useReward,
  onUseRewardChange,
  note,
  onNoteChange,
  subtotalCentavos,
  discountCentavos,
  deliveryFeeCentavos,
  totalCentavos,
  isDelivery,
}: CheckoutExtrasProps) {
  const remainingChars = NOTE_MAX_CHARS - note.length;

  return (
    <>
      {readyReward ? (
        <FieldLabel
          htmlFor="checkout-reward-switch"
          className="w-full cursor-pointer rounded-3xl bg-member-soft p-4 text-member-soft-foreground sm:p-5"
        >
          <Field orientation="horizontal" className="items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-member text-member-foreground">
              <GiftIcon aria-hidden="true" className="size-5" />
            </span>
            <FieldContent>
              <FieldTitle className="text-base">
                {words.checkout.rewardUse(readyReward.title)}
              </FieldTitle>
              <FieldDescription className="text-member-soft-foreground">
                {readyReward.soldOutToday
                  ? words.checkout.rewardSoldOutToday
                  : words.checkout.rewardHint}
              </FieldDescription>
            </FieldContent>
            <Switch
              id="checkout-reward-switch"
              checked={readyReward.soldOutToday ? false : useReward}
              disabled={readyReward.soldOutToday}
              onCheckedChange={onUseRewardChange}
            />
          </Field>
        </FieldLabel>
      ) : null}

      <CheckoutStep id="checkout-total" title={words.checkout.noteAndTotal}>
        <Field className="w-full">
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="checkout-order-note">{words.checkout.orderNote}</FieldLabel>
            <span
              className={`text-xs tabular ${
                remainingChars === 0
                  ? 'font-semibold text-destructive-text'
                  : remainingChars <= 20
                    ? 'text-warning-text'
                    : 'text-muted-foreground'
              }`}
            >
              {words.checkout.noteCount(note.length, NOTE_MAX_CHARS)}
            </span>
          </div>
          <Textarea
            id="checkout-order-note"
            value={note}
            maxLength={NOTE_MAX_CHARS}
            onChange={(e) => onNoteChange(e.target.value.slice(0, NOTE_MAX_CHARS))}
            placeholder={words.checkout.notePlaceholder}
            rows={2}
            className="min-h-20 resize-none rounded-xl"
          />
        </Field>

        <dl className="flex flex-col gap-2 rounded-2xl bg-muted/50 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{words.checkout.totals.subtotal}</dt>
            <dd className="font-medium tabular">{formatPeso(subtotalCentavos)}</dd>
          </div>

          {discountCentavos > 0 ? (
            <div className="flex justify-between gap-3 text-success-text">
              <dt>{words.checkout.totals.discount}</dt>
              <dd className="font-medium tabular">{formatPeso(-discountCentavos)}</dd>
            </div>
          ) : null}

          {isDelivery ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{words.checkout.totals.deliveryFee}</dt>
              <dd className="font-medium tabular">
                {deliveryFeeCentavos === null
                  ? words.basket.deliveryFeeAtCheckout
                  : deliveryFeeCentavos === 0
                    ? words.shop.free
                    : formatPeso(deliveryFeeCentavos)}
              </dd>
            </div>
          ) : null}

          <Separator className="my-1" />

          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-base font-bold">{words.checkout.totals.total}</dt>
            <dd className="text-xl font-extrabold tabular">{formatPeso(totalCentavos)}</dd>
          </div>
        </dl>

        <p className="text-center text-xs text-muted-foreground">{words.checkout.privacyConsent}</p>
      </CheckoutStep>
    </>
  );
}
