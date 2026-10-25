'use client';

import {
  formatPeso,
  isTransfer,
  words,
  PaymentMethodEnum,
  type PaymentMethod,
  type Storefront,
} from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/badge';
import { Card } from '@smartapp/ui/components/card';
import { Field, FieldGroup, FieldLabel, FieldTitle } from '@smartapp/ui/components/field';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Alert, AlertDescription } from '@smartapp/ui/components/reui/alert';
import { Separator } from '@smartapp/ui/components/separator';
import {
  AlertTriangleIcon,
  BanknoteIcon,
  HandCoinsIcon,
  LandmarkIcon,
  QrCodeIcon,
  SmartphoneIcon,
} from 'lucide-react';
import type { PaymentOption } from '../checkout-rules';
import { CopyButton } from './copy-button';

interface CheckoutPayProps {
  sf: Storefront;
  options: PaymentOption[];
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
  totalCentavos: number;
  error?: string | undefined;
}

function methodIcon(method: PaymentMethod) {
  switch (method) {
    case 'cash':
      return <BanknoteIcon aria-hidden="true" className="size-4 opacity-60" />;
    case 'cod':
      return <HandCoinsIcon aria-hidden="true" className="size-4 opacity-60" />;
    case 'gcash':
    case 'maya':
      return <SmartphoneIcon aria-hidden="true" className="size-4 opacity-60" />;
    case 'bank':
      return <LandmarkIcon aria-hidden="true" className="size-4 opacity-60" />;
    case 'qr_ph':
      return <QrCodeIcon aria-hidden="true" className="size-4 opacity-60" />;
  }
}

/**
 * Pay section: Payment methods cards (pattern c-radio-group-9), recommended badge (c-radio-group-15),
 * COD limit message (c-alert-7), and transfer details with copy buttons (c-button-41).
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
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {words.checkout.paySection}
      </span>

      {/* Pattern c-radio-group-9 */}
      <Card className="p-0">
        <RadioGroup
          value={selectedMethod ?? ''}
          onValueChange={(val) => {
            const parsed = PaymentMethodEnum.safeParse(val);
            if (parsed.success) onSelectMethod(parsed.data);
          }}
        >
          <FieldGroup className="gap-0">
            {options.map((opt, i) => (
              <div key={opt.method}>
                {i > 0 ? <Separator /> : null}
                <Field data-disabled={opt.disabled ? 'true' : undefined}>
                  <FieldLabel
                    htmlFor={`pay-${opt.method}`}
                    className={`justify-between px-4 py-3 ${opt.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    <FieldTitle className="flex items-center gap-2">
                      {methodIcon(opt.method)}
                      <span>{opt.label}</span>
                      {opt.isRecommended ? (
                        <Badge
                          variant="secondary"
                          className="h-4.5 rounded-full px-1.5 text-xs tracking-wider uppercase"
                        >
                          {words.checkout.recommended}
                        </Badge>
                      ) : null}
                    </FieldTitle>
                    <RadioGroupItem
                      value={opt.method}
                      id={`pay-${opt.method}`}
                      disabled={opt.disabled}
                    />
                  </FieldLabel>

                  {/* COD limit notice: pattern c-alert-7 */}
                  {opt.disabled && opt.disabledReason ? (
                    <div className="px-4 pb-3">
                      <Alert variant="warning" className="py-2">
                        <AlertTriangleIcon aria-hidden="true" />
                        <AlertDescription>{opt.disabledReason}</AlertDescription>
                      </Alert>
                    </div>
                  ) : null}
                </Field>
              </div>
            ))}
          </FieldGroup>
        </RadioGroup>
      </Card>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {/* Transfer Instructions: When GCash, Maya, Bank or QR Ph is chosen */}
      {isSelectedTransfer && selectedConfig ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-3.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{words.checkout.transferDetails}</span>
            {selectedConfig.sample ? (
              <Badge variant="outline">{words.checkout.sampleLabel}</Badge>
            ) : null}
          </div>

          {selectedConfig.accountName ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{words.checkout.accountName}</span>
                <span className="font-medium">{selectedConfig.accountName}</span>
              </div>
              <CopyButton textToCopy={selectedConfig.accountName} />
            </div>
          ) : null}

          {selectedConfig.accountNumber ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  {words.checkout.accountNumber}
                </span>
                <span className="font-mono font-medium">{selectedConfig.accountNumber}</span>
              </div>
              <CopyButton textToCopy={selectedConfig.accountNumber} />
            </div>
          ) : null}

          {/* Shop QR picture if available */}
          {selectedConfig.qr ? (
            <div className="flex flex-col items-center gap-1.5 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedConfig.qr}
                alt={`${words.shop.paymentMethod[selectedConfig.method]} QR`}
                className="max-h-48 max-w-48 rounded-lg border border-border bg-white object-contain p-2 shadow-xs"
              />
              <span className="text-xs text-muted-foreground">Scan or save QR</span>
            </div>
          ) : null}

          <Separator className="my-1" />

          {/* Send exactly ₱X with Copy button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Amount to pay</span>
              <span className="font-bold text-foreground">
                {words.checkout.sendExactly(formatPeso(totalCentavos))}
              </span>
            </div>
            <CopyButton
              textToCopy={String(Math.round(totalCentavos / 100))}
              label={words.checkout.copy}
            />
          </div>

          <p className="text-xs text-muted-foreground">{words.checkout.uploadProofNotice}</p>
        </div>
      ) : null}
    </div>
  );
}
