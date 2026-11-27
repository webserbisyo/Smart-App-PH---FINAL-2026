'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  artPath,
  errorWords,
  availabilityAt,
  formatPeso,
  goesWellWith,
  lineIdentity,
  normalisePhPhone,
  rewardState,
  variantAvailability,
  vocab,
  words,
  type BasketLine as SavedLine,
  type OrderPayload,
  type PaymentMethod,
  orderFlowWords,
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
  useRefreshShop,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Pending } from '@smartapp/ui/components/pending';
import { Alert, AlertDescription } from '@smartapp/ui/components/reui/alert';
import { Spinner } from '@smartapp/ui/components/spinner';
import { EmptyState } from '@smartapp/ui/compositions/empty-state';
import { useReducedMotion } from '@smartapp/ui/hooks/use-reduced-motion';
import { AlertTriangleIcon } from 'lucide-react';
import { formatManilaDateTime } from '../../receipt/receipt-rules';
import { useBasketView, type BasketRow } from '../../basket/components/use-basket-view';
import { removeRowsWithUndo } from '../../basket/remove-lines';
import { closeAddedToast } from '../../menu/use-added-toast';
import { useShop } from '../../shell/components/shop-context';
import { useWhenIdle } from '../../shell/use-when-idle';
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
import type { PrinterSlip, PrinterState } from './order-printer';

// The printer (a dialog) loads when the page is idle, or when Place order is pressed before that
// (decision R49).
const OrderPrinter = dynamic(() => import('./order-printer').then((m) => m.OrderPrinter), {
  ssr: false,
});

// Lines that can't be ordered and the Goes well pairings load only when shown (T127, JS budget).
const CheckoutFixLines = dynamic(() => import('./checkout-fix-lines'), { ssr: false });
const BasketGoesWellWith = dynamic(
  () => import('../../basket/components/basket-goes-well-with').then((m) => m.BasketGoesWellWith),
  { ssr: false },
);

// Edit a line, or a pairing with choices, opens the item sheet over checkout (T127).
const ItemSheet = dynamic(
  () => import('../../menu/item-sheet/item-sheet').then((m) => m.ItemSheet),
  {
    ssr: false,
  },
);

// Order errors that mean a line can't be ordered any more: the menu is read again and the jam offers to
// remove those lines (T127).
const STOCK_CODES: ReadonlySet<string> = new Set([
  'out_of_stock',
  'item_unavailable',
  'invalid_options',
]);

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

interface CheckoutFormProps {
  now: string;
  /** Called when the page is hidden after an order went through, so the next visit starts a fresh checkout. */
  onSpent: () => void;
}

export function CheckoutForm({ now, onSpent }: CheckoutFormProps) {
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
  const refreshShop = useRefreshShop(slug);
  const [sheet, setSheet] = useState<{ itemId: string; edit: SavedLine | null } | null>(null);
  const [sheetLoaded, setSheetLoaded] = useState(false);
  const openSheet = (next: { itemId: string; edit: SavedLine | null }) => {
    setSheetLoaded(true);
    setSheet(next);
  };
  // The "added · View basket" toast sat on Place order (T127).
  useEffect(() => closeAddedToast(), []);

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
  // Which account (T84): a shop can take up to three banks.
  const [paymentAccountId, setPaymentAccountId] = useState<string | null>(
    draft?.paymentAccountId ?? null,
  );

  // Reward and Note
  const [useReward, setUseReward] = useState(draft?.useReward ?? false);
  const [note, setNote] = useState(draft?.note ?? '');

  // Scheduled time
  const scheduledAt = queryScheduled || choice.scheduledAt;
  // Stock is judged at the booked time (T127), as the server does.
  const stockAt = availabilityAt(scheduledAt, now);

  // Order type: the customer's pick, or the only way this shop takes orders. Never a silent default.
  const pickedType =
    choice.type ?? (sf.orderTypes.length === 1 ? (sf.orderTypes[0] ?? null) : null);
  // The quote still needs a type before the pick; Place order waits for the pick.
  const orderType = pickedType ?? sf.orderTypes[0] ?? 'pickup';
  // Each new value opens the How and where sheet (Place order tapped before a pick).
  const [askKey, setAskKey] = useState(0);

  // Client idempotency key (stable across manual retries)
  const clientKeyRef = useRef<string>(generateClientKey());

  // Error feedback state
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<{ at: string | null; key: number }>({
    at: null,
    key: 0,
  });
  const [placedOk, setPlacedOk] = useState(false);
  // The order was turned away because a line can't be ordered any more (T127).
  const [stockJam, setStockJam] = useState(false);
  const [printer, setPrinter] = useState<PrinterState | null>(null);
  const [printerLoaded, loadPrinter] = useWhenIdle();
  if (printer !== null && !printerLoaded) loadPrinter();
  const printStartRef = useRef(0);
  const skipRef = useRef(false);
  const placedTokenRef = useRef<string | null>(null);
  const openedRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});

  // Next keeps a page alive, hidden, when the customer moves on (React Activity). Once an order went
  // through, hiding the page asks for a fresh checkout: no old printer, a new order key, the saved details
  // read again. A failed try keeps everything as typed.
  useLayoutEffect(
    () => () => {
      if (placedOk) onSpent();
    },
    [placedOk, onSpent],
  );

  // Track serialized state to only write when actual values change
  const lastSavedJsonRef = useRef<string>(
    JSON.stringify({
      name: draft?.name ?? member?.name ?? '',
      phone: draft?.phone ?? member?.phone ?? '',
      email: draft?.email ?? member?.email ?? '',
      rememberMe: draft?.rememberMe ?? true,
      paymentMethod: draft?.paymentMethod ?? null,
      paymentAccountId: draft?.paymentAccountId ?? null,
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
      paymentAccountId,
      note,
      scheduledAt,
      useReward,
    };
    const serialized = JSON.stringify(payload);
    if (serialized === lastSavedJsonRef.current) return;
    lastSavedJsonRef.current = serialized;
    storage.checkoutDraft.write(slug, payload);
  }, [
    name,
    phone,
    email,
    rememberMe,
    paymentMethod,
    paymentAccountId,
    note,
    scheduledAt,
    useReward,
    slug,
  ]);

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
      paymentAccountId,
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
    paymentAccountId,
    note,
    readyReward,
    useReward,
  ]);

  const quoteQuery = useQuote(slug, quotePayload);
  const quote = quoteQuery.data;
  // A quote kept on screen while a newer one loads is not the order as it is now (T127): Place order
  // waits for the current one.
  const isQuoteLoading = quotePayload !== null && !quoteQuery.isCurrent && !quoteQuery.isError;
  const { goodRows, flaggedRows, goodCount } = useBasketView(shop, quote ?? null, stockAt);
  const placeOrder = usePlaceOrder(slug);

  // Totals
  const localSubtotal = goodRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const subtotal = quote?.subtotal ?? localSubtotal;
  const discount = quote?.discount ?? 0;
  const deliveryFee = orderType === 'delivery' ? (quote?.deliveryFee ?? null) : null;
  const total = quote?.total ?? Math.max(0, subtotal - discount) + (deliveryFee ?? 0);

  // Payment options
  const paymentOptions = useMemo(
    () => resolvePaymentOptions(sf, orderType, total),
    [sf, orderType, total],
  );

  // Effective payment: the picked account if still offered, else the picked method, else the first one.
  const selectedOption = useMemo(() => {
    const enabled = paymentOptions.filter((o) => !o.disabled);
    return (
      enabled.find((o) => o.accountId === paymentAccountId) ??
      enabled.find((o) => o.method === paymentMethod) ??
      enabled[0] ??
      null
    );
  }, [paymentOptions, paymentMethod, paymentAccountId]);
  const selectedPaymentMethod = selectedOption?.method ?? null;
  // The price check follows the way to pay the screen shows: when the picked one drops out (over the COD
  // limit, a bank removed) or none was picked yet, the shown one becomes the pick.
  if (
    selectedOption &&
    (selectedOption.method !== paymentMethod || selectedOption.accountId !== paymentAccountId)
  ) {
    setPaymentMethod(selectedOption.method);
    setPaymentAccountId(selectedOption.accountId);
  }

  // Flagged lines, judged on this phone as well as by the last quote (T127).
  const flaggedCount = flaggedRows.length;
  const flaggedIds = new Set(flaggedRows.map((r) => r.identity));

  // The quote says the picked time filled up: open the picker at that day once per time.
  const quoteRejectedAt =
    scheduledAt && quote?.problems.some((p) => p.code === 'slot_unavailable') ? scheduledAt : null;
  if (quoteRejectedAt && rejected.at !== quoteRejectedAt) {
    setRejected((prev) => ({ at: quoteRejectedAt, key: prev.key + 1 }));
  }

  // Eligibility evaluation
  const eligibility = checkPlaceOrderEligibility({
    online: isOnline,
    sf,
    now,
    linesCount: basket.lines.length,
    flaggedCount,
    orderType: pickedType,
    scheduledAt,
    name,
    phone,
    addressLine: address.addressLine,
    spot: address.spot,
    zoneId: address.zoneId,
    paymentMethod: selectedPaymentMethod,
    quote: isQuoteLoading ? null : quote,
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
    setStockJam(false);
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
          paymentAccountId: selectedOption?.accountId ?? null,
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
      if (STOCK_CODES.has(errCode)) {
        // Read the menu again so the lines that can't be ordered show as such, here and in the jam.
        setStockJam(true);
        void refreshShop();
      }
      switch (errCode) {
        case 'rate_limited':
          setSubmitError(words.checkout.rateLimited);
          break;
        case 'pickup_time_invalid':
          setSubmitError(words.checkout.pickupTimeInvalid);
          break;
        case 'slot_unavailable':
          // The time filled up meanwhile: the picker opens at that day, everything else stays filled in.
          setSubmitError(words.location.slotFilled);
          setRejected((prev) => ({ at: scheduledAt, key: prev.key + 1 }));
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
    const storage = getDeviceStorage();
    if (!rememberMe) storage.checkoutDraft.remove(slug);
    else {
      // Name, phone and payment stay for next time; the time, note and reward were for this order only.
      const saved = storage.checkoutDraft.read(slug).value;
      if (saved) {
        storage.checkoutDraft.write(slug, {
          ...saved,
          scheduledAt: null,
          note: '',
          useReward: false,
        });
      }
    }
    // Replace, not push: back from the receipt goes to the shop, never to a spent checkout (decision R45).
    router.replace(`/${slug}/o/${token}?new=1`);
  }

  function skipPrinting() {
    skipRef.current = true;
    if (placedTokenRef.current) openReceipt(placedTokenRef.current);
  }

  // Quote lines for collapsible
  const allLines =
    quote?.lines ??
    basket.lines.map((l) => ({
      identity: lineIdentity(l),
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
  // The summary lists what will be ordered; lines that can't be sit in their own box above it (T127).
  const quoteLines = allLines.filter((l) => !flaggedIds.has(l.identity));
  const editRow = (row: BasketRow) => openSheet({ itemId: row.itemId, edit: row.line });

  // Up to 3 pairings under Your order (T127): "+" adds at once, an item with choices opens over checkout.
  const basketItemIds = new Set(basket.lines.map((l) => l.itemId));
  const pairings = goesWellWith(
    catalog,
    catalog.items.filter((i) => basketItemIds.has(i.id)),
    stockAt,
    { exclude: basketItemIds, limit: 3 },
  );

  // The jam names what sold out and removes it in one tap, back to checkout with the new total (T127).
  const jamFix =
    stockJam && flaggedRows.length > 0
      ? {
          label: orderFlowWords.removeSoldOut(flaggedRows.length),
          onClick: () => {
            removeRowsWithUndo(basket, flaggedRows);
            setStockJam(false);
            setPrinter(null);
          },
        }
      : null;
  const jamError =
    stockJam && flaggedRows.length > 0
      ? orderFlowWords.soldOutHint(flaggedRows.map((r) => r.name).join(', '))
      : submitError;

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
  const askForType = !busy && eligibility.missingField === 'type';
  const placeLabel = placedOk
    ? words.checkout.placed
    : placeOrder.isPending
      ? words.checkout.placing
      : eligibility.canPlace
        ? words.checkout.placeOrder
        : (eligibility.reason ?? words.checkout.placeOrder);

  // Nothing to check out (and no order just placed): one way back to the menu.
  if (basket.lines.length === 0 && !placedOk) {
    return (
      <div className="mx-auto flex w-full max-w-160 flex-col pt-2 pb-24">
        <EmptyState
          id="checkout-empty"
          art={artPath('basket_empty')}
          title={words.basket.empty}
          description={words.basket.emptyHint}
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${slug}/menu`} />}
              className="h-11 rounded-full bg-shop-10 px-6 text-shop-10-foreground hover:bg-shop-10-hover"
            >
              {words.basket.browse(vocab(sf.info.kind).catalog)}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-160 flex-col gap-4 pt-2 pb-40">
      <CheckoutSummary
        slug={slug}
        lines={quoteLines}
        count={goodCount}
        total={total}
        footer={
          // While a line can't be ordered, the page is about fixing that, not adding more.
          pairings.length > 0 && flaggedRows.length === 0 ? (
            <BasketGoesWellWith
              items={pairings}
              onOpenItem={(itemId) => openSheet({ itemId, edit: null })}
            />
          ) : null
        }
      />

      {flaggedRows.length > 0 ? (
        <CheckoutFixLines basket={basket} rows={flaggedRows} onEdit={editRow} />
      ) : null}

      <CheckoutHow
        sf={sf}
        choice={choice}
        now={now}
        rejectedAt={rejected.at}
        rejectKey={rejected.key}
        askKey={askKey}
      />

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
        selected={selectedOption?.accountId ?? null}
        onSelect={(option) => {
          setPaymentMethod(option.method);
          setPaymentAccountId(option.accountId);
        }}
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

      {printerLoaded ? (
        <OrderPrinter
          state={printer}
          slip={slip}
          error={jamError}
          fix={jamFix}
          onSkip={skipPrinting}
          onRetry={() => {
            setPrinter(null);
            void handlePlaceOrder();
          }}
          onClose={() => {
            setStockJam(false);
            setPrinter(null);
          }}
        />
      ) : null}

      {sheetLoaded ? (
        <ItemSheet
          slug={slug}
          catalog={catalog}
          itemId={sheet?.itemId ?? null}
          edit={sheet?.edit ?? null}
          onClose={() => setSheet(null)}
          now={now}
          nested
          inBasket
        />
      ) : null}

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
              disabled={!placedOk && !askForType && (!eligibility.canPlace || placeOrder.isPending)}
              onClick={
                busy ? undefined : askForType ? () => setAskKey((k) => k + 1) : handlePlaceOrder
              }
              aria-busy={placeOrder.isPending}
            >
              {placedOk ? (
                <DrawnCheck />
              ) : placeOrder.isPending ? (
                <Spinner aria-hidden="true" />
              ) : null}
              <span
                className={
                  eligibility.canPlace || busy || askForType ? undefined : 'text-sm font-semibold'
                }
              >
                {placeLabel}
              </span>
            </Button>
          </Pending>
        </div>
      </div>
    </div>
  );
}
