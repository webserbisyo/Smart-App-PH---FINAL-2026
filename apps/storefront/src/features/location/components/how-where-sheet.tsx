'use client';

import { useEffect, useState } from 'react';
import {
  chosenOrderType,
  chosenZone,
  deliveryFee,
  formatPeso,
  isShortMapsLink,
  mapsLinkFor,
  openState,
  openStateText,
  orderTypeDetail,
  parseMapsLink,
  readyEstimate,
  roundKm,
  slotGroups,
  words,
  OrderTypeEnum,
  type LatLng,
  type OrderType,
} from '@smartapp/core';
import { useBasket, useResolveMapsLink } from '@smartapp/data';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Button } from '@smartapp/ui/components/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@smartapp/ui/components/input-group';
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@smartapp/ui/components/native-select';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { Spinner } from '@smartapp/ui/components/spinner';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import {
  AlertTriangleIcon,
  CheckIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  LocateFixedIcon,
  MapPinIcon,
} from 'lucide-react';
import { useShop } from '../../shell/components/shop-context';
import { ORDER_TYPE_ICON } from './order-type-icons';
import { useLocationChoice } from './use-location-choice';

const TYPE_COLS: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' };

function Required() {
  return (
    <span className="text-destructive-text">
      <span aria-hidden="true">*</span>
      <span className="sr-only">{words.location.required}</span>
    </span>
  );
}

type When = 'asap' | 'later';
const isWhen = (value: unknown): value is When => value === 'asap' || value === 'later';
type GeoStatus = 'idle' | 'locating' | 'done' | 'denied';

function HowWhereForm({ now, onDone }: { now: string; onDone: () => void }) {
  const { slug, shop } = useShop();
  const sf = shop.storefront;
  const basket = useBasket(slug);
  const resolveMaps = useResolveMapsLink();
  const { choice, address, save } = useLocationChoice(slug);

  const asapOpen = readyEstimate(sf, now) !== null;
  const groups = slotGroups(sf, now);
  const firstSlot = groups[0]?.slots[0]?.value ?? null;

  const [type, setType] = useState<OrderType>(
    chosenOrderType(sf, choice.type) ?? sf.orderTypes[0] ?? 'pickup',
  );
  const [when, setWhen] = useState<When>(choice.scheduledAt || !asapOpen ? 'later' : 'asap');
  const [slot, setSlot] = useState<string | null>(
    groups.some((g) => g.slots.some((s) => s.value === choice.scheduledAt))
      ? choice.scheduledAt
      : firstSlot,
  );

  // Delivery fields
  const [spot, setSpot] = useState<LatLng | null>(address.spot ?? null);
  const [zoneId, setZoneId] = useState<string | null>(
    chosenZone(sf, address.zoneId)?.id ?? sf.delivery.zones[0]?.id ?? null,
  );
  const [addressLine, setAddressLine] = useState(address.addressLine ?? '');
  const [houseNo, setHouseNo] = useState(address.houseNo ?? '');
  const [floor, setFloor] = useState(address.floor ?? '');
  const [landmark, setLandmark] = useState(address.landmark ?? '');

  // Geolocation state (pattern c-button-44)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');

  // Google Maps link paste input state
  const [mapsInput, setMapsInput] = useState('');
  const [mapsValid, setMapsValid] = useState(false);
  const [mapsError, setMapsError] = useState(false);

  const state = openState(sf, now);

  // Re-evaluate Maps input whenever text changes
  async function handleMapsInputChange(val: string) {
    setMapsInput(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setMapsValid(false);
      setMapsError(false);
      return;
    }

    const parsed = parseMapsLink(trimmed);
    if (parsed) {
      setSpot(parsed);
      setMapsValid(true);
      setMapsError(false);
      return;
    }

    if (isShortMapsLink(trimmed)) {
      try {
        const resolved = await resolveMaps.mutateAsync({ url: trimmed });
        if (resolved) {
          setSpot(resolved);
          setMapsValid(true);
          setMapsError(false);
          return;
        }
      } catch {
        // Fall through to error
      }
    }

    setMapsValid(false);
    setMapsError(true);
  }

  // Geolocation trigger (only after tap)
  function requestLocation() {
    if (geoStatus === 'locating') return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('denied');
      return;
    }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSpot({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('done');
      },
      () => {
        setGeoStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // Auto-reset 'done' status after 2 seconds
  useEffect(() => {
    if (geoStatus !== 'done') return;
    const timer = setTimeout(() => setGeoStatus('idle'), 2000);
    return () => clearTimeout(timer);
  }, [geoStatus]);

  // Delivery fee & range result
  const basketSubtotal = basket.lines.reduce((acc, l) => acc + l.qty * 100, 0);
  const deliveryResult = deliveryFee(sf, { spot, zoneId }, basketSubtotal);

  // Google maps search link for "Fix pin in Google Maps"
  const mapsSearchUrl = spot
    ? mapsLinkFor(spot)
    : sf.info.contact.pin
      ? mapsLinkFor(sf.info.contact.pin)
      : 'https://www.google.com/maps';

  function submit() {
    save({
      type,
      scheduledAt: type === 'walk_in' || when === 'asap' ? null : slot,
      zoneId: type === 'delivery' ? zoneId : null,
      spot: type === 'delivery' ? spot : null,
      addressLine: type === 'delivery' ? addressLine.trim() : '',
      houseNo: type === 'delivery' ? houseNo.trim() : '',
      floor: type === 'delivery' ? floor.trim() : '',
      landmark: type === 'delivery' ? landmark.trim() : '',
    });
    onDone();
  }

  const isTooFar = !deliveryResult.ok && deliveryResult.code === 'out_of_range';
  const isDeliveryDisabled = type === 'delivery' && (isTooFar || !deliveryResult.ok);

  const zone = chosenZone(sf, zoneId);
  const typeCols = TYPE_COLS[Math.min(sf.orderTypes.length, 3)] ?? 'grid-cols-3';

  return (
    <form
      id="how-where-form"
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {/* Order type: a segmented choice with icons (c-radio-group-7 cards). */}
      <FieldSet className="gap-3">
        <FieldLegend variant="label">{words.location.orderType}</FieldLegend>
        <RadioGroup
          value={type}
          onValueChange={(value) => {
            const parsed = OrderTypeEnum.safeParse(value);
            if (parsed.success) setType(parsed.data);
          }}
          className={`grid gap-2 ${typeCols}`}
        >
          {sf.orderTypes.map((t) => {
            const Icon = ORDER_TYPE_ICON[t];
            return (
              <FieldLabel key={t} htmlFor={`how-${t}`} className="rounded-2xl">
                <Field className="min-h-20 items-center justify-center gap-1.5 text-center">
                  <RadioGroupItem value={t} id={`how-${t}`} className="sr-only" />
                  <Icon aria-hidden="true" className="size-6" />
                  <FieldTitle className="justify-center text-sm">
                    {words.shop.orderType[t]}
                  </FieldTitle>
                </Field>
              </FieldLabel>
            );
          })}
        </RadioGroup>
        <p className="text-sm text-muted-foreground">{orderTypeDetail(sf, type)}</p>
      </FieldSet>

      {type === 'pickup' ? (
        <FieldSet className="gap-3">
          <FieldLegend variant="label">{words.location.when}</FieldLegend>
          {!asapOpen ? (
            <FieldDescription>
              {openStateText(state, now)}. {words.location.closedNow}
            </FieldDescription>
          ) : null}
          {/* ASAP or later: pattern c-radio-group-3 as two cards. */}
          <RadioGroup
            value={when}
            onValueChange={(value) => {
              if (isWhen(value)) setWhen(value);
            }}
            className="grid grid-cols-2 gap-2"
          >
            <FieldLabel htmlFor="when-asap" className="rounded-2xl">
              <Field
                orientation="horizontal"
                data-disabled={asapOpen ? undefined : 'true'}
                className="min-h-16 items-start gap-2.5"
              >
                <RadioGroupItem value="asap" id="when-asap" disabled={!asapOpen} />
                <FieldContent>
                  <FieldTitle>{words.location.asap}</FieldTitle>
                  <FieldDescription>{words.shop.readyIn(sf.prepMinutes)}</FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
            <FieldLabel htmlFor="when-later" className="rounded-2xl">
              <Field orientation="horizontal" className="min-h-16 items-start gap-2.5">
                <RadioGroupItem value="later" id="when-later" />
                <FieldContent>
                  <FieldTitle>{words.location.later}</FieldTitle>
                  <FieldDescription>{words.location.laterDetail}</FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
          </RadioGroup>
          {when === 'later' ? (
            groups.length > 0 ? (
              <Field>
                <FieldLabel htmlFor="pickup-slot">{words.location.pickupTime}</FieldLabel>
                {/* Pattern c-native-select-2, grouped Today / Tomorrow. */}
                <NativeSelect
                  id="pickup-slot"
                  className="h-11 w-full rounded-xl"
                  value={slot ?? ''}
                  onChange={(event) => setSlot(event.target.value || null)}
                >
                  <NativeSelectOption value="" disabled>
                    {words.location.chooseTime}
                  </NativeSelectOption>
                  {groups.map((g) => (
                    <NativeSelectOptGroup key={g.label} label={g.label}>
                      {g.slots.map((s) => (
                        <NativeSelectOption key={s.value} value={s.value}>
                          {s.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelectOptGroup>
                  ))}
                </NativeSelect>
              </Field>
            ) : (
              <FieldDescription>{words.location.noSlots}</FieldDescription>
            )
          ) : null}
        </FieldSet>
      ) : null}

      {type === 'delivery' ? (
        <div className="flex flex-col gap-6">
          <FieldSet className="gap-3">
            <FieldLegend variant="label">{words.location.area}</FieldLegend>
            {/* Use my location: pattern c-button-44, big and first. */}
            <Button
              type="button"
              onClick={requestLocation}
              disabled={geoStatus === 'locating'}
              aria-busy={geoStatus === 'locating'}
              aria-live="polite"
              className="h-12 w-full gap-2 rounded-full text-base font-semibold"
            >
              {geoStatus === 'locating' ? (
                <>
                  <Spinner aria-hidden="true" />
                  {words.location.locating}
                </>
              ) : geoStatus === 'done' ? (
                <>
                  <CheckIcon aria-hidden="true" className="size-5" />
                  {words.location.locationUsed}
                </>
              ) : (
                <>
                  <LocateFixedIcon aria-hidden="true" className="size-5" />
                  {words.location.useMyLocation}
                </>
              )}
            </Button>

            {geoStatus === 'denied' ? (
              <Alert variant="destructive" role="status">
                <CircleAlertIcon aria-hidden="true" />
                <AlertTitle>{words.location.locationOffTitle}</AlertTitle>
                <AlertDescription>{words.location.locationDenied}</AlertDescription>
              </Alert>
            ) : null}

            {/* Paste full Maps link field: patterns c-input-group-10 / 24 / 3 */}
            <Field className="w-full">
              <FieldLabel htmlFor="maps-link-input">{words.location.pasteMapsLink}</FieldLabel>
              <InputGroup data-invalid={mapsError ? 'true' : undefined} className="h-11 rounded-xl">
                <InputGroupInput
                  id="maps-link-input"
                  value={mapsInput}
                  onChange={(e) => void handleMapsInputChange(e.target.value)}
                  placeholder={words.location.mapsPlaceholder}
                  aria-invalid={mapsError}
                  aria-describedby={mapsError ? 'maps-link-error' : undefined}
                  className="text-base"
                />
                <InputGroupAddon align="inline-end">
                  {mapsValid ? (
                    <div className="flex items-center gap-1.5 px-2 text-xs font-medium text-success-text">
                      <CheckIcon className="size-3.5" aria-hidden="true" />
                      <span>{words.location.validLink}</span>
                    </div>
                  ) : (
                    <InputGroupButton
                      className="h-9 rounded-lg px-3"
                      onClick={async () => {
                        try {
                          const clip = await navigator.clipboard.readText();
                          if (clip) void handleMapsInputChange(clip);
                        } catch {
                          // Clipboard access denied
                        }
                      }}
                    >
                      {words.location.pasteButton}
                    </InputGroupButton>
                  )}
                </InputGroupAddon>
              </InputGroup>
              {mapsError ? (
                <p id="maps-link-error" className="text-sm text-destructive-text">
                  {words.location.pasteError}
                </p>
              ) : null}
            </Field>

            <Button
              type="button"
              variant="ghost"
              render={<a href={mapsSearchUrl} target="_blank" rel="noopener noreferrer" />}
              nativeButton={false}
              className="h-11 gap-1.5 self-start rounded-full px-3"
            >
              <ExternalLinkIcon aria-hidden="true" className="size-4" />
              {words.location.fixPinInMaps}
            </Button>

            {/* Zones: compact cards (pattern c-radio-group-8). */}
            {sf.delivery.zones.length > 0 ? (
              <RadioGroup
                value={zoneId}
                onValueChange={(value) => {
                  if (typeof value === 'string') {
                    setZoneId(value);
                    setSpot(null); // Switching to zone clears spot override
                  }
                }}
                className="grid gap-2 sm:grid-cols-2"
              >
                {sf.delivery.zones.map((z) => (
                  <FieldLabel key={z.id} htmlFor={`zone-${z.id}`} className="rounded-2xl">
                    <Field orientation="horizontal" className="min-h-14 items-start gap-2.5">
                      <RadioGroupItem value={z.id} id={`zone-${z.id}`} />
                      <FieldContent className="min-w-0">
                        <FieldTitle className="w-full">
                          <span className="min-w-0 flex-1 truncate">{z.name}</span>
                          <span className="shrink-0 whitespace-nowrap tabular">
                            {z.fee === 0 ? words.shop.free : formatPeso(z.fee)}
                          </span>
                        </FieldTitle>
                        <FieldDescription>{z.etaText}</FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
            ) : null}
          </FieldSet>

          {/* Result line: pattern c-item-1 tabular or c-alert-7 too far */}
          {deliveryResult.ok ? (
            <div
              role="status"
              className="flex items-center gap-3 rounded-2xl bg-shop-10-soft px-3.5 py-3 text-shop-10-soft-foreground"
            >
              <MapPinIcon aria-hidden="true" className="size-5 shrink-0" />
              <span className="text-sm font-semibold tabular">
                {deliveryResult.via === 'distance'
                  ? words.location.deliverySummary(
                      roundKm(deliveryResult.distanceM ?? 0),
                      formatPeso(deliveryResult.fee),
                      deliveryResult.etaText,
                    )
                  : words.location.zoneSummary(
                      zone?.name ?? '',
                      formatPeso(deliveryResult.fee),
                      deliveryResult.etaText,
                    )}
              </span>
            </div>
          ) : isTooFar ? (
            <Alert variant="warning" role="alert">
              <AlertTriangleIcon aria-hidden="true" />
              <AlertTitle>{words.location.tooFarTitle}</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <span>{words.location.tooFar(deliveryResult.km ?? 0, deliveryResult.maxKm)}</span>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-fit rounded-full px-4"
                  onClick={() => setType('pickup')}
                >
                  {words.location.switchToPickup}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Rider details: pattern c-field-2 */}
          <FieldSet className="gap-3">
            <FieldLegend variant="label">{words.location.riderDetails}</FieldLegend>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="rider-address">
                  {words.location.addressLine} <Required />
                </FieldLabel>
                <Input
                  id="rider-address"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder={words.location.addressPlaceholder}
                  autoComplete="street-address"
                  className="h-11 rounded-xl"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor="rider-house-no">{words.location.houseNo}</FieldLabel>
                    <Badge variant="outline" size="lg" radius="full">
                      {words.location.optionalBadge}
                    </Badge>
                  </div>
                  <Input
                    id="rider-house-no"
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                    placeholder={words.location.houseNoPlaceholder}
                    className="h-11 rounded-xl"
                  />
                </Field>
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor="rider-floor">{words.location.floor}</FieldLabel>
                    <Badge variant="outline" size="lg" radius="full">
                      {words.location.optionalBadge}
                    </Badge>
                  </div>
                  <Input
                    id="rider-floor"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder={words.location.floorPlaceholder}
                    className="h-11 rounded-xl"
                  />
                </Field>
              </div>

              {/* Landmark: pattern c-input-13 */}
              <Field>
                <FieldLabel htmlFor="rider-landmark">
                  {words.location.landmark} <Required />
                </FieldLabel>
                <Input
                  id="rider-landmark"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder={words.location.landmarkPlaceholder}
                  className="h-11 rounded-xl"
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>
      ) : null}

      <ResponsiveDialogFooter>
        <Button
          id="how-where-save"
          type="submit"
          size="lg"
          className="h-12 w-full rounded-full text-base font-semibold"
          disabled={
            (type === 'pickup' && when === 'later' && !slot) ||
            (type === 'delivery' && Boolean(isDeliveryDisabled))
          }
        >
          {words.location.save}
        </Button>
      </ResponsiveDialogFooter>
    </form>
  );
}

/** The How and where sheet: drawer on phones, dialog from tablets up; the body scrolls, Save stays. */
export function HowWhereSheet({
  open,
  onOpenChange,
  now,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  now: string;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={words.location.sheetTitle}
      description={words.location.sheetDescription}
      scroll
    >
      {open ? <HowWhereForm now={now} onDone={() => onOpenChange(false)} /> : null}
    </ResponsiveDialog>
  );
}
