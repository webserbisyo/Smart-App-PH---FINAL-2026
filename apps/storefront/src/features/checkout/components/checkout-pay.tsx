'use client';

import {
  formatPeso,
  imageSources,
  isTransfer,
  pesoAmountText,
  words,
  PaymentMethodEnum,
  type PaymentMethod,
  type Storefront,
} from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Field, FieldLabel, FieldTitle } from '@smartapp/ui/components/field';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Alert, AlertDescription } from '@smartapp/ui/components/reui/alert';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import {
  AlertTriangleIcon,
  BanknoteIcon,
  HandCoinsIcon,
  LandmarkIcon,
  QrCodeIcon,
  SmartphoneIcon,
  type LucideIcon,
} from 'lucide-react';
import type { PaymentOption } from '../checkout-rules';
import { CheckoutStep } from './checkout-step';
import { CopyButton } from './copy-button';

interface CheckoutPayProps {
  sf: Storefront;
  options: PaymentOption[];
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
  totalCentavos: number;
  error?: string | undefined;
}

const METHOD_ICON: Record<PaymentMethod, LucideIcon> = {
  cash: BanknoteIcon,
  cod: HandCoinsIcon,
  gcash: SmartphoneIcon,
  maya: SmartphoneIcon,
  bank: LandmarkIcon,
  qr_ph: QrCodeIcon,
};

function DetailRow({
  label,
  value,
  copy,
  strong = false,
}: {
  label: string;
  value: string;
  copy: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl px-3.5 py-2 ${strong ? 'bg-shop-10-soft text-shop-10-soft-foreground' : 'bg-card'}`}
    >
      <div className="flex min-w-0 flex-col">
        <span className={`text-xs ${strong ? 'opacity-80' : 'text-muted-foreground'}`}>
          {label}
        </span>
        <span
          className={`break-words tabular ${strong ? 'text-lg font-extrabold' : 'font-semibold'}`}
        >
          {value}
        </span>
      </div>
      <CopyButton
        textToCopy={copy}
        label={words.checkout.copyField(label)}
        iconOnly
        className="size-11 shrink-0 rounded-full"
      />
    </div>
  );
}

/**
 * Step 3, payment: method cards with icons (c-radio-group-9, recommended badge c-radio-group-15),
 * the COD limit note (c-alert-7) and, for transfers, the account and exact amount with Copy.
 */
export function CheckoutPay({
  sf,
  options,
  selectedMethod,
  onSelectMethod,
  totalCentavos,
  error,
}: CheckoutPayProps) {
  const selectedConfig = sf.payments.find((p) => p.method === selectedMethod);
  const isSelectedTransfer = selectedMethod ? isTransfer(selectedMethod) : false;

  return (
    <CheckoutStep step={3} id="checkout-pay" title={words.checkout.paySection}>
      <RadioGroup
        value={selectedMethod ?? ''}
        onValueChange={(val) => {
          const parsed = PaymentMethodEnum.safeParse(val);
          if (parsed.success) onSelectMethod(parsed.data);
        }}
        className="gap-2"
      >
        {options.map((opt) => {
          const Icon = METHOD_ICON[opt.method];
          return (
            <FieldLabel
              key={opt.method}
              htmlFor={`pay-${opt.method}`}
              className={`rounded-2xl ${opt.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Field
                orientation="horizontal"
                data-disabled={opt.disabled ? 'true' : undefined}
                className="min-h-14 items-center gap-3 px-3.5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <FieldTitle className="min-w-0 flex-1 flex-wrap gap-x-2 gap-y-1 text-base">
                  <span>{opt.label}</span>
                  {opt.isRecommended ? (
                    <Badge variant="secondary" size="lg" radius="full">
                      {words.checkout.recommended}
                    </Badge>
                  ) : null}
                </FieldTitle>
                <RadioGroupItem
                  value={opt.method}
                  id={`pay-${opt.method}`}
                  disabled={opt.disabled}
                />
              </Field>
              {opt.disabled && opt.disabledReason ? (
                <div className="px-3.5 pb-3">
                  <Alert variant="warning" className="py-2">
                    <AlertTriangleIcon aria-hidden="true" />
                    <AlertDescription>{opt.disabledReason}</AlertDescription>
                  </Alert>
                </div>
              ) : null}
            </FieldLabel>
          );
        })}
      </RadioGroup>

      {error ? <p className="text-sm text-destructive-text">{error}</p> : null}

      {isSelectedTransfer && selectedConfig ? (
        <div className="flex flex-col gap-2 rounded-3xl bg-muted/60 p-3">
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-sm font-semibold">{words.checkout.transferDetails}</span>
            {selectedConfig.sample ? (
              <Badge variant="outline" size="lg" radius="full">{words.checkout.sampleLabel}</Badge>
            ) : null}
          </div>

          {selectedConfig.accountName ? (
            <DetailRow
              label={words.checkout.accountName}
              value={selectedConfig.accountName}
              copy={selectedConfig.accountName}
            />
          ) : null}
          {selectedConfig.accountNumber ? (
            <DetailRow
              label={words.checkout.accountNumber}
              value={selectedConfig.accountNumber}
              copy={selectedConfig.accountNumber}
            />
          ) : null}
          <DetailRow
            label={words.checkout.amountToPay}
            value={words.checkout.sendExactly(formatPeso(totalCentavos))}
            copy={pesoAmountText(totalCentavos)}
            strong
          />

          {selectedConfig.qr ? (
            <figure className="flex flex-col items-center gap-2 py-2">
              <ShopImage
                src={imageSources(selectedConfig.qr)}
                alt={words.checkout.qrAlt(words.shop.paymentMethod[selectedConfig.method])}
                ratio="1:1"
                sizes="192px"
                fallbackText={sf.info.name}
                className="size-48 rounded-2xl ring-1 ring-foreground/8"
              />
              <figcaption className="text-xs text-muted-foreground">
                {words.checkout.qrHint}
              </figcaption>
            </figure>
          ) : null}

          <p className="px-1 pb-1 text-sm text-muted-foreground">
            {words.checkout.uploadProofNotice}
          </p>
        </div>
      ) : null}
    </CheckoutStep>
  );
}
