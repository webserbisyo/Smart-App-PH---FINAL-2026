'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  errorWords,
  formatPeso,
  normalisePhPhone,
  rewardState,
  variantAvailability,
  words,
  type OrderPayload,
  type PaymentMethod,
} from '@smartapp/core';
import {
  errorCodeOf,
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
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { AlertTriangleIcon } from 'lucide-react';
import { formatManilaDateTime } from '../../receipt/receipt-rules';
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
import { OrderPrinter, type PrinterSlip, type PrinterState } from './order-printer';

// The printer's slip takes 1.6 s to feed out (decision R32); the receipt opens once it has, or at
// once on Skip or under reduced motion.
const PRINT_MS = 1600;
// The slip shows the first few lines and "+ N more".
const SLIP_LINES = 4;

function DrawnCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden="true"
      className="size-5"
    >
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        pathLength={1}
        className="draw-check"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const [placedOk, setPlacedOk] = useState(false);
  const [printer, setPrinter] = useState<PrinterState | null>(null);
  const printStartRef = useRef(0);
  const skipRef = useRef(false);
  const placedTokenRef = useRef<string | null>(null);
  const openedRef = useRef(false);
  const reducedMotion = useReducedMotion();
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
        title = words.checkout.rewardFree(freeItem.name);
        const avail = variantAvailability(freeVariant, now);
        freeItemAvailable = avail === 'available';
        soldOutToday = avail === 'sold_out_today' || avail === 'sold_out';
      }
    } else if (reward.kind === 'discount') {
      title = words.checkout.rewardOff(formatPeso(reward.amount ?? 0));
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
    if (!name.trim()) errors.name = words.checkout.enterName;
    if (!normalisePhPhone(phone).ok) errors.phone = words.shop.phoneInvalid;

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

    skipRef.current = false;
    printStartRef.current = Date.now();
    setPrinter('printing');

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

      // The slip finishes printing, then the receipt opens (already in the cache, so no skeleton).
      placedTokenRef.current = placed.token;
      setPlacedOk(true);
      setPrinter('printed');
      const left = printStartRef.current + PRINT_MS - Date.now();
      setTimeout(
        () => openReceipt(placed.token),
        skipRef.current || reducedMotion ? 0 : Math.max(0, left),
      );
    } catch (err: unknown) {
      const errCode = errorCodeOf(err);
      setPrinter(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'jam');
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
        case 'unknown':
          setSubmitError(words.checkout.placeFailed);
          break;
        default:
          setSubmitError(errorWords(errCode));
          break;
      }
    }
  }

  function openReceipt(token: string) {
    if (openedRef.current) return;
    openedRef.current = true;
    basket.clear();
    if (!rememberMe) getDeviceStorage().checkoutDraft.remove(slug);
    router.push(`/${slug}/o/${token}?new=1`);
  }

  function skipPrinting() {
    skipRef.current = true;
    if (placedTokenRef.current) openReceipt(placedTokenRef.current);
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
      photo: catalog.items.find((i) => i.id === l.itemId)?.photos[0] ?? null,
      problems: [],
    }));

  const slipLines = quoteLines.map((line) => ({
    key: line.identity,
    name: `${line.qty}x ${line.name}`,
    price: formatPeso(line.lineTotal),
  }));
  const slip: PrinterSlip = {
    storeName: sf.info.name,
    date: formatManilaDateTime(now),
    items:
      slipLines.length > SLIP_LINES
        ? [
            ...slipLines.slice(0, SLIP_LINES - 1),
            {
              key: 'more',
              name: words.checkout.printer.more(slipLines.length - SLIP_LINES + 1),
              price: '',
            },
          ]
        : slipLines,
    subtotal: formatPeso(subtotal),
    total: formatPeso(total),
  };

  const busy = placeOrder.isPending || placedOk;
  const placeLabel = placedOk
    ? words.checkout.placed
    : placeOrder.isPending
      ? words.checkout.placing
      : eligibility.canPlace
        ? words.checkout.placeOrder
        : (eligibility.reason ?? words.checkout.placeOrder);

  return (
    <div className="mx-auto flex w-full max-w-160 flex-col gap-4 pt-2 pb-40">
      <CheckoutSummary slug={slug} lines={quoteLines} count={basket.count} total={total} />

      <CheckoutHow sf={sf} choice={choice} now={now} />

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

      <CheckoutPay
        sf={sf}
        options={paymentOptions}
        selectedMethod={selectedPaymentMethod}
        onSelectMethod={setPaymentMethod}
        totalCentavos={total}
      />

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

      {submitError ? (
        <Alert variant="destructive" role="alert">
          <AlertTriangleIcon aria-hidden="true" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <OrderPrinter
        state={printer}
        slip={slip}
        error={submitError}
        onSkip={skipPrinting}
        onRetry={() => {
          setPrinter(null);
          void handlePlaceOrder();
        }}
        onClose={() => setPrinter(null)}
      />

      {/* Fixed bar: the total and Place order (c-button-9 large + c-button-44 states in DiceUI Pending). */}
      <div className="fixed inset-x-0 bottom-0 z-basket border-t glass pb-safe">
        <div className="mx-auto flex w-full max-w-160 items-center gap-4 px-4 py-3">
          <div className="flex shrink-0 flex-col">
            <span className="text-xs text-muted-foreground">{words.checkout.totals.total}</span>
            <span className="text-xl font-extrabold tabular">{formatPeso(total)}</span>
          </div>
          <Pending isPending={placeOrder.isPending} className="min-w-0 flex-1">
            <Button
              id="checkout-place-order"
              type="button"
              size="lg"
              className="h-auto min-h-12 w-full rounded-full px-5 py-2 text-base font-bold whitespace-normal shadow-md"
              disabled={!placedOk && (!eligibility.canPlace || placeOrder.isPending)}
              onClick={busy ? undefined : handlePlaceOrder}
              aria-busy={placeOrder.isPending}
            >
              {placedOk ? (
                <DrawnCheck />
              ) : placeOrder.isPending ? (
                <Spinner aria-hidden="true" />
              ) : null}
              <span className={eligibility.canPlace || busy ? undefined : 'text-sm font-semibold'}>
                {placeLabel}
              </span>
            </Button>
          </Pending>
        </div>
      </div>
    </div>
  );
}
