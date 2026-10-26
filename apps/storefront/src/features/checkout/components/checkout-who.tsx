'use client';

import { normalisePhPhone, words } from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/badge';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { MaskInput } from '@smartapp/ui/components/mask-input';
import { CheckoutStep } from './checkout-step';

function Required() {
  return (
    <span className="text-destructive-text">
      <span aria-hidden="true">*</span>
      <span className="sr-only">{words.location.required}</span>
    </span>
  );
}

interface CheckoutWhoProps {
  name: string;
  onNameChange: (val: string) => void;
  phone: string;
  onPhoneChange: (val: string) => void;
  email: string;
  onEmailChange: (val: string) => void;
  rememberMe: boolean;
  onRememberMeChange: (val: boolean) => void;
  errors: {
    name?: string | undefined;
    phone?: string | undefined;
  };
}

/**
 * Who section: Customer details (name, phone mask, optional email, remember me checkbox).
 */
export function CheckoutWho({
  name,
  onNameChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  rememberMe,
  onRememberMeChange,
  errors,
}: CheckoutWhoProps) {
  return (
    <CheckoutStep step={2} id="checkout-who" title={words.checkout.whoSection}>
      <FieldGroup className="gap-4">
        {/* Name: pattern c-input-2 */}
        <Field data-invalid={errors.name ? 'true' : undefined}>
          <FieldLabel htmlFor="checkout-name">
            {words.checkout.name} <Required />
          </FieldLabel>
          <Input
            id="checkout-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={words.checkout.namePlaceholder}
            maxLength={60}
            autoComplete="name"
            className="h-11 rounded-xl"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'checkout-name-error' : undefined}
            required
          />
          {errors.name ? (
            <p id="checkout-name-error" className="text-sm text-destructive-text">
              {errors.name}
            </p>
          ) : null}
        </Field>

        {/* Mobile: DiceUI MaskInput pattern ####-###-#### */}
        <Field data-invalid={errors.phone ? 'true' : undefined}>
          <FieldLabel htmlFor="checkout-phone">
            {words.checkout.mobile} <Required />
          </FieldLabel>
          <MaskInput
            id="checkout-phone"
            mask={{
              pattern: '####-###-####',
              transform: (val) => val.replace(/\D/g, ''),
              validate: (val) => normalisePhPhone(val).ok,
            }}
            inputMode="numeric"
            value={phone}
            onValueChange={(_, unmasked) => onPhoneChange(unmasked)}
            placeholder={words.checkout.mobilePlaceholder}
            autoComplete="tel"
            className="h-11 rounded-xl"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'checkout-phone-error' : undefined}
            required
          />
          {errors.phone ? (
            <p id="checkout-phone-error" className="text-sm text-destructive-text">
              {errors.phone}
            </p>
          ) : null}
        </Field>

        {/* Email: optional */}
        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="checkout-email">{words.checkout.email}</FieldLabel>
            <Badge variant="outline">{words.location.optionalBadge}</Badge>
          </div>
          <Input
            id="checkout-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder={words.checkout.emailPlaceholder}
            autoComplete="email"
            className="h-11 rounded-xl"
          />
        </Field>

        {/* Remember me: pattern c-checkbox-5 */}
        <Field orientation="horizontal" className="min-h-11 pt-1">
          <Checkbox
            id="checkout-remember"
            checked={rememberMe}
            onCheckedChange={(checked) => onRememberMeChange(Boolean(checked))}
          />
          <FieldContent>
            <FieldLabel htmlFor="checkout-remember" className="cursor-pointer font-medium">
              {words.checkout.rememberMe}
            </FieldLabel>
            <FieldDescription>{words.checkout.rememberHint}</FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>
    </CheckoutStep>
  );
}
