'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  formatPeso,
  normalisePhPhone,
  rewardState,
  variantAvailability,
  words,
  type OrderPayload,
  type PaymentMethod,
} from '@smartapp/core';
import {
  getDeviceStorage,
  useBasket,
  useCheckoutDraft,
  useMyAccount,
  useOnline,
  usePlaceOrder,
  useQuote,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Pending } from '@smartapp/ui/components/pending';
import { Alert, AlertDescription } from '@smartapp/ui/components/reui/alert';
import { Spinner } from '@smartapp/ui/components/spinner';
import { AlertTriangleIcon } from 'lucide-react';
import { useShop } from '../../shell/components/shop-context';
import { useLocationChoice } from '../../location/components/use-location-choice';
import {
  checkPlaceOrderEligibility,
  generateClientKey,
  resolvePaymentOptions,
} from '../checkout-rules';
import { CheckoutExtras } from './checkout-extras';
import { CheckoutHow } from './checkout-how';
import { CheckoutPay } from './checkout-pay';
import { CheckoutSummary } from './checkout-summary';
import { CheckoutWho } from './checkout-who';

export function CheckoutForm({ now }: { now: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug, shop } = useShop();
  const sf = shop.storefront;
  const catalog = shop.catalog;

  const isOnline = useOnline();
  const basket = useBasket(slug);
  const { choice, address } = useLocationChoice(slug);
  const { draft } = useCheckoutDraft(slug);
  const { data: member } = useMyAccount(slug);

  // Scheduled slot from query param if passed by basket drawer (e.g. ?scheduled=...)
  const queryScheduled = searchParams.get('scheduled');

  // Customer details state (prefill from draft, fallback to member account)
  const [name, setName] = useState(draft?.name ?? member?.name ?? '');
  const [phone, setPhone] = useState(draft?.phone ?? member?.phone ?? '');
  const [email, setEmail] = useState(draft?.email ?? member?.email ?? '');
  const [rememberMe, setRememberMe] = useState(draft?.rememberMe ?? true);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    draft?.paymentMethod ?? null,
  );

  // Reward and Note
  const [useReward, setUseReward] = useState(draft?.useReward ?? false);
  const [note, setNote] = useState(draft?.note ?? '');

  // Scheduled time
  const scheduledAt = queryScheduled || choice.scheduledAt;

  // Order type
  const orderType = choice.type ?? sf.orderTypes[0] ?? 'pickup';

  // Client idempotency key (stable across manual retries)
  const clientKeyRef = useRef<string>(generateClientKey());

  // Error feedback state
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});

  // Track serialized state to only write when actual values change
  const lastSavedJsonRef = useRef<string>(
    JSON.stringify({
      name: draft?.name ?? member?.name ?? '',
      phone: draft?.phone ?? member?.phone ?? '',
      email: draft?.email ?? member?.email ?? '',
      rememberMe: draft?.rememberMe ?? true,
      paymentMethod: draft?.paymentMethod ?? null,
      note: draft?.note ?? '',
      scheduledAt: queryScheduled || choice.scheduledAt,
      useReward: draft?.useReward ?? false,
    }),
  );

  // Auto-save draft on changes if rememberMe is enabled
  useEffect(() => {
    const storage = getDeviceStorage();
    if (!rememberMe) {
      if (lastSavedJsonRef.current !== '__cleared__') {
        storage.checkoutDraft.remove(slug);
        lastSavedJsonRef.current = '__cleared__';
      }
      return;
    }

    const payload = {
      name,
      phone,
      email,
      rememberMe: true,
      paymentMethod,
      note,
      scheduledAt,
      useReward,
    };
    const serialized = JSON.stringify(payload);
    if (serialized === lastSavedJsonRef.current) return;
    lastSavedJsonRef.current = serialized;
    storage.checkoutDraft.write(slug, payload);
  }, [name, phone, email, rememberMe, paymentMethod, note, scheduledAt, useReward, slug]);

  // Evaluate member reward availability
  const readyReward = useMemo(() => {
    const card = sf.stampCard;
    if (card.status === 'off' || !member) return null;
    const reward = card.reward;
    if (reward.kind === 'custom') return null;

    let freeItemAvailable = false;
    let soldOutToday = false;
    let title = '';

    if (reward.kind === 'free_item') {
      const freeItem = catalog.items.find((i) => i.id === reward.itemId);
      const freeVariant = freeItem?.variants.find((v) => v.id === reward.variantId);
      if (freeItem && freeVariant) {
        title = `free ${freeItem.name}`;
        const avail = variantAvailability(freeVariant, now);
        freeItemAvailable = avail === 'available';
        soldOutToday = avail === 'sold_out_today' || avail === 'sold_out';
      }
    } else if (reward.kind === 'discount') {
      title = `${formatPeso(reward.amount ?? 0)} off`;
      freeItemAvailable = true;
    }

    const state = rewardState({ card, member, freeItemAvailable });
    if (state !== 'ready') return null;

    return {
      kind: reward.kind,
      title,
      soldOutToday,
    };
  }, [sf.stampCard, member, catalog.items, now]);

  // Construct quote payload
  const quotePayload: OrderPayload | null = useMemo(() => {
    if (basket.lines.length === 0) return null;
    const phoneRes = normalisePhPhone(phone);
    return {
      type: orderType,
      scheduledAt,
      lines: basket.lines,
      customer: {
        name: name.trim() || 'Guest',
        phone: phoneRes.ok ? phoneRes.e164 : '+639000000000',
        email: email.trim() || null,
      },
      delivery:
        orderType === 'delivery'
          ? {
              spot: address.spot ?? null,
              zoneId: address.zoneId ?? null,
              addressLine: address.addressLine || 'Address',
              houseNo: address.houseNo || null,
              floor: address.floor || null,
              landmark: address.landmark || null,
            }
          : null,
      paymentMethod: paymentMethod ?? (orderType === 'delivery' ? 'cod' : 'cash'),
      note: note.trim() || null,
      useReward: readyReward && !readyReward.soldOutToday ? useReward : false,
    };
  }, [
    basket.lines,
    orderType,
    scheduledAt,
    name,
    phone,
    email,
    address,
    paymentMethod,
    note,
    readyReward,
    useReward,
  ]);

  const { data: quote, isLoading: isQuoteLoading } = useQuote(slug, quotePayload);
  const placeOrder = usePlaceOrder(slug);

  // Totals
  const localSubtotal = basket.lines.reduce((sum, l) => sum + l.qty * 100, 0);
  const subtotal = quote?.subtotal ?? localSubtotal;
  const discount = quote?.discount ?? 0;
  const deliveryFee = orderType === 'delivery' ? (quote?.deliveryFee ?? null) : null;
  const total = quote?.total ?? Math.max(0, subtotal - discount) + (deliveryFee ?? 0);

  // Payment options
  const paymentOptions = useMemo(
    () => resolvePaymentOptions(sf, orderType, total),
    [sf, orderType, total],
  );

  // Effective payment method: selected if valid, otherwise first enabled
  const selectedPaymentMethod = useMemo(() => {
    if (paymentMethod && paymentOptions.some((o) => o.method === paymentMethod && !o.disabled)) {
      return paymentMethod;
    }
    const firstEnabled = paymentOptions.find((o) => !o.disabled);
    return firstEnabled ? firstEnabled.method : null;
  }, [paymentOptions, paymentMethod]);

  // Flagged lines count
  const flaggedCount = quote?.lines.filter((l) => l.problems.length > 0).length ?? 0;

  // Eligibility evaluation
  const eligibility = checkPlaceOrderEligibility({
    online: isOnline,
    sf,
    now,
    linesCount: basket.lines.length,
    flaggedCount,
    orderType,
    scheduledAt,
    name,
    phone,
    addressLine: address.addressLine,
    spot: address.spot,
    zoneId: address.zoneId,
    paymentMethod: selectedPaymentMethod,
    quote,
    quoteLoading: isQuoteLoading,
    submitting: placeOrder.isPending,
  });

  async function handlePlaceOrder() {
    setSubmitError(null);
    setFieldErrors({});

    // Field-level checks
    const errors: { name?: string; phone?: string } = {};
    if (!name.trim()) errors.name = 'Enter your name';
    if (!normalisePhPhone(phone).ok) errors.phone = 'Enter a valid mobile number';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.name) {
        document.getElementById('checkout-name')?.focus();
      } else if (errors.phone) {
        document.getElementById('checkout-phone')?.focus();
      }
      return;
    }

    if (!quotePayload) return;

    try {
      const phoneRes = normalisePhPhone(phone);
      const cleanPhone = phoneRes.ok ? phoneRes.e164 : phone;

      const placed = await placeOrder.mutateAsync({
        payload: {
          ...quotePayload,
          customer: {
            name: name.trim(),
            phone: cleanPhone,
            email: email.trim() || null,
          },
          paymentMethod: selectedPaymentMethod ?? 'cash',
        },
        clientKey: clientKeyRef.current,
      });

      basket.clear();
      if (!rememberMe) getDeviceStorage().checkoutDraft.remove(slug);
      router.push(`/${slug}/o/${placed.token}`);
    } catch (err: unknown) {
      const errCode =
        typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string'
          ? err.code
          : null;
      const errMessage =
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof err.message === 'string'
          ? err.message
          : null;
      switch (errCode) {
        case 'rate_limited':
          setSubmitError(words.checkout.rateLimited);
          break;
        case 'pickup_time_invalid':
          setSubmitError(words.checkout.pickupTimeInvalid);
          break;
        case 'out_of_range':
          setSubmitError(words.checkout.outOfRange);
          break;
        case 'cod_limit':
          setSubmitError(words.checkout.codLimitReached);
          break;
        default:
          setSubmitError(errMessage || 'Could not place order. Please try again.');
          break;
      }
    }
  }

  // Quote lines for collapsible
  const quoteLines =
    quote?.lines ??
    basket.lines.map((l) => ({
      identity: `${l.itemId}-${l.variantId}`,
      itemId: l.itemId,
      variantId: l.variantId,
      optionIds: l.optionIds,
      qty: l.qty,
      name: catalog.items.find((i) => i.id === l.itemId)?.name ?? '',
      variantLabel: null,
      optionLabels: [],
      note: l.note,
      unitPrice: 0,
      lineTotal: 0,
      photo: null,
      problems: [],
    }));

  return (
    <div className="mx-auto flex w-full max-w-160 flex-col gap-6 py-4">
      {/* Back button and collapsible order summary */}
      <CheckoutSummary slug={slug} lines={quoteLines} count={basket.count} total={total} />

      {/* How: Order type and time/place */}
      <CheckoutHow sf={sf} choice={choice} now={now} />

      {/* Who: Customer details */}
      <CheckoutWho
        name={name}
        onNameChange={setName}
        phone={phone}
        onPhoneChange={setPhone}
        email={email}
        onEmailChange={setEmail}
        rememberMe={rememberMe}
        onRememberMeChange={setRememberMe}
        errors={fieldErrors}
      />

      {/* Pay: Payment methods */}
      <CheckoutPay
        sf={sf}
        options={paymentOptions}
        selectedMethod={selectedPaymentMethod}
        onSelectMethod={setPaymentMethod}
        totalCentavos={total}
      />

      {/* Extras: Reward, Note, Totals, Consent */}
      <CheckoutExtras
        sf={sf}
        items={catalog.items}
        readyReward={readyReward}
        useReward={useReward}
        onUseRewardChange={setUseReward}
        note={note}
        onNoteChange={setNote}
        subtotalCentavos={subtotal}
        discountCentavos={discount}
        deliveryFeeCentavos={deliveryFee}
        totalCentavos={total}
        isDelivery={orderType === 'delivery'}
      />

      {/* Server error alert */}
      {submitError ? (
        <Alert variant="destructive" role="alert">
          <AlertTriangleIcon aria-hidden="true" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      {/* Place order button: pattern c-button-9 large + c-button-44 states inside DiceUI Pending */}
      <div className="pt-2 pb-8">
        <Pending isPending={placeOrder.isPending}>
          <Button
            id="checkout-place-order"
            type="button"
            size="lg"
            className="h-12 w-full text-base font-bold shadow-md"
            disabled={!eligibility.canPlace || placeOrder.isPending}
            onClick={handlePlaceOrder}
            aria-busy={placeOrder.isPending}
          >
            {placeOrder.isPending ? (
              <>
                <Spinner aria-hidden="true" />
                <span>Placing order…</span>
              </>
            ) : eligibility.canPlace ? (
              <span>
                {words.checkout.placeOrder} · {formatPeso(total)}
              </span>
            ) : (
              <span>{eligibility.reason ?? words.checkout.placeOrder}</span>
            )}
          </Button>
        </Pending>
      </div>
    </div>
  );
}
