'use client';

import { useCallback, useRef } from 'react';
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
 * Extras: Reward switch (pattern c-switch-2), auto-resize order note (pattern c-textarea-6),
 * totals summary (pattern c-separator-6), and consent disclaimer.
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      if (val.length <= NOTE_MAX_CHARS) {
        onNoteChange(val);
      }
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    },
    [onNoteChange],
  );

  const remainingChars = NOTE_MAX_CHARS - note.length;

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-4">
      {/* Reward Switch: pattern c-switch-2 */}
      {readyReward ? (
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="checkout-reward-switch" className="cursor-pointer">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>{words.checkout.rewardUse(readyReward.title)}</FieldTitle>
                {readyReward.soldOutToday ? (
                  <FieldDescription className="font-medium text-destructive">
                    {words.checkout.rewardSoldOutToday}
                  </FieldDescription>
                ) : (
                  <FieldDescription>Apply this reward to your order</FieldDescription>
                )}
              </FieldContent>
              <Switch
                id="checkout-reward-switch"
                checked={readyReward.soldOutToday ? false : useReward}
                disabled={readyReward.soldOutToday}
                onCheckedChange={onUseRewardChange}
              />
            </Field>
          </FieldLabel>
          <Separator className="mt-2" />
        </div>
      ) : null}

      {/* Order note: pattern c-textarea-6 */}
      <Field className="w-full">
        <div className="flex items-center justify-between pb-1">
          <FieldLabel htmlFor="checkout-order-note">{words.checkout.orderNote}</FieldLabel>
          <span
            className={`text-xs tabular-nums ${
              remainingChars === 0
                ? 'font-semibold text-destructive'
                : remainingChars <= 20
                  ? 'text-warning'
                  : 'text-muted-foreground'
            }`}
          >
            {note.length}/{NOTE_MAX_CHARS}
          </span>
        </div>
        <Textarea
          ref={textareaRef}
          id="checkout-order-note"
          value={note}
          onChange={handleNoteChange}
          placeholder={words.checkout.notePlaceholder}
          rows={2}
          className="resize-none overflow-hidden"
        />
      </Field>

      {/* Totals: pattern c-separator-6 */}
      <div className="flex flex-col gap-2 pt-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{words.checkout.totals.subtotal}</span>
          <span className="font-medium tabular">{formatPeso(subtotalCentavos)}</span>
        </div>

        {discountCentavos > 0 ? (
          <div className="flex justify-between text-success">
            <span>{words.checkout.totals.discount}</span>
            <span className="font-medium tabular">−{formatPeso(discountCentavos)}</span>
          </div>
        ) : null}

        {isDelivery ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{words.checkout.totals.deliveryFee}</span>
            <span className="font-medium tabular">
              {deliveryFeeCentavos === null
                ? words.basket.deliveryFeeAtCheckout
                : deliveryFeeCentavos === 0
                  ? words.shop.free
                  : formatPeso(deliveryFeeCentavos)}
            </span>
          </div>
        ) : null}

        <Separator className="my-1" />

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-base font-bold">{words.checkout.totals.total}</span>
          <span className="text-xl font-bold text-foreground tabular">
            {formatPeso(totalCentavos)}
          </span>
        </div>
      </div>

      {/* Consent line */}
      <p className="text-center text-xs text-muted-foreground">{words.checkout.privacyConsent}</p>
    </div>
  );
}
