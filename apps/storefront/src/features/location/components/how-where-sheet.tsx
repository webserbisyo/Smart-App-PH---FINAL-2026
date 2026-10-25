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
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { Card } from '@smartapp/ui/components/card';
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
import { Item, ItemContent, ItemTitle } from '@smartapp/ui/components/item';
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@smartapp/ui/components/native-select';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { Separator } from '@smartapp/ui/components/separator';
import { Spinner } from '@smartapp/ui/components/spinner';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import {
  AlertTriangleIcon,
  CheckIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  MapPinIcon,
} from 'lucide-react';
import { useShop } from '../../shell/components/shop-context';
import { useLocationChoice } from './use-location-choice';

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

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {/* Order type: pattern c-radio-group-7. */}
      <FieldSet>
        <FieldLegend variant="label">{words.location.orderType}</FieldLegend>
        <RadioGroup
          value={type}
          onValueChange={(value) => {
            const parsed = OrderTypeEnum.safeParse(value);
            if (parsed.success) setType(parsed.data);
          }}
        >
          {sf.orderTypes.map((t) => (
            <FieldLabel key={t} htmlFor={`how-${t}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{words.shop.orderType[t]}</FieldTitle>
                  <FieldDescription>{orderTypeDetail(sf, t)}</FieldDescription>
                </FieldContent>
                <RadioGroupItem value={t} id={`how-${t}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </FieldSet>

      {type === 'pickup' ? (
        <FieldSet>
          <FieldLegend variant="label">{words.location.when}</FieldLegend>
          {!asapOpen ? (
            <FieldDescription>
              {openStateText(state, now)}. {words.location.closedNow}
            </FieldDescription>
          ) : null}
          {/* ASAP or later: pattern c-radio-group-3. */}
          <RadioGroup
            value={when}
            onValueChange={(value) => {
              if (isWhen(value)) setWhen(value);
            }}
          >
            <Field orientation="horizontal" data-disabled={asapOpen ? undefined : ''}>
              <RadioGroupItem value="asap" id="when-asap" disabled={!asapOpen} />
              <FieldContent>
                <FieldLabel htmlFor="when-asap">{words.location.asap}</FieldLabel>
                <FieldDescription>{words.shop.readyIn(sf.prepMinutes)}</FieldDescription>
              </FieldContent>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="later" id="when-later" />
              <FieldContent>
                <FieldLabel htmlFor="when-later">{words.location.later}</FieldLabel>
                <FieldDescription>{words.location.laterDetail}</FieldDescription>
              </FieldContent>
            </Field>
          </RadioGroup>
          {when === 'later' ? (
            groups.length > 0 ? (
              <Field>
                <FieldLabel htmlFor="pickup-slot">{words.location.pickupTime}</FieldLabel>
                {/* Pattern c-native-select-2, grouped Today / Tomorrow. */}
                <NativeSelect
                  id="pickup-slot"
                  className="w-full"
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
          {/* Location pins: Use my location + Fix pin in Google Maps */}
          <FieldSet>
            <FieldLegend variant="label">{words.location.area}</FieldLegend>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Use my location: pattern c-button-44 */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestLocation}
                  disabled={geoStatus === 'locating'}
                  aria-busy={geoStatus === 'locating'}
                  aria-live="polite"
                  className="min-w-36"
                >
                  {geoStatus === 'locating' ? (
                    <>
                      <Spinner aria-hidden="true" />
                      {words.location.locating}
                    </>
                  ) : geoStatus === 'done' ? (
                    <>
                      <CheckIcon aria-hidden="true" className="text-success" />
                      {words.location.locationUsed}
                    </>
                  ) : (
                    <>
                      <MapPinIcon aria-hidden="true" />
                      {words.location.useMyLocation}
                    </>
                  )}
                </Button>

                {/* Fix pin in Google Maps */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  render={<a href={mapsSearchUrl} target="_blank" rel="noopener noreferrer" />}
                  nativeButton={false}
                >
                  <ExternalLinkIcon aria-hidden="true" />
                  {words.location.fixPinInMaps}
                </Button>
              </div>

              {/* Denied alert: pattern c-alert-8 with role status */}
              {geoStatus === 'denied' ? (
                <Alert variant="destructive" role="status">
                  <CircleAlertIcon aria-hidden="true" />
                  <AlertTitle>Location is off</AlertTitle>
                  <AlertDescription>{words.location.locationDenied}</AlertDescription>
                </Alert>
              ) : null}

              {/* Paste full Maps link field: patterns c-input-group-10 / 24 / 3 */}
              <Field className="w-full">
                <FieldLabel htmlFor="maps-link-input">{words.location.pasteMapsLink}</FieldLabel>
                <InputGroup data-invalid={mapsError ? 'true' : undefined}>
                  <InputGroupInput
                    id="maps-link-input"
                    value={mapsInput}
                    onChange={(e) => void handleMapsInputChange(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    aria-invalid={mapsError}
                    aria-describedby={mapsError ? 'maps-link-error' : undefined}
                  />
                  <InputGroupAddon align="inline-end">
                    {mapsValid ? (
                      <div className="flex items-center gap-1.5 px-2 text-xs font-medium text-success">
                        <CheckIcon className="size-3.5 text-success" aria-hidden="true" />
                        <span>{words.location.validLink}</span>
                      </div>
                    ) : (
                      <InputGroupButton
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
                  <p id="maps-link-error" className="text-xs text-destructive">
                    {words.location.pasteError}
                  </p>
                ) : null}
              </Field>

              {/* Zone list: pattern c-radio-group-8 */}
              {sf.delivery.zones.length > 0 ? (
                <Card className="p-0">
                  <RadioGroup
                    value={zoneId}
                    onValueChange={(value) => {
                      if (typeof value === 'string') {
                        setZoneId(value);
                        setSpot(null); // Switching to zone clears spot override
                      }
                    }}
                  >
                    <FieldGroup className="gap-0">
                      {sf.delivery.zones.map((zone, i) => (
                        <div key={zone.id}>
                          {i > 0 ? <Separator /> : null}
                          <Field>
                            <FieldLabel htmlFor={`zone-${zone.id}`} className="px-4 py-3">
                              <RadioGroupItem value={zone.id} id={`zone-${zone.id}`} />
                              <FieldContent className="min-w-0">
                                <FieldTitle className="w-full">
                                  <span className="min-w-0 flex-1 truncate">{zone.name}</span>
                                  <span className="shrink-0 whitespace-nowrap tabular">
                                    {zone.fee === 0 ? words.shop.free : formatPeso(zone.fee)}
                                  </span>
                                </FieldTitle>
                                <FieldDescription>{zone.etaText}</FieldDescription>
                              </FieldContent>
                            </FieldLabel>
                          </Field>
                        </div>
                      ))}
                    </FieldGroup>
                  </RadioGroup>
                </Card>
              ) : null}
            </div>
          </FieldSet>

          {/* Result line: pattern c-item-1 tabular or c-alert-7 too far */}
          {deliveryResult.ok ? (
            <Item variant="outline" className="tabular">
              <ItemContent>
                <ItemTitle className="font-semibold">
                  {deliveryResult.via === 'distance'
                    ? words.location.deliverySummary(
                        roundKm(deliveryResult.distanceM ?? 0),
                        formatPeso(deliveryResult.fee),
                        deliveryResult.etaText,
                      )
                    : `${chosenZone(sf, zoneId)?.name} · ${formatPeso(deliveryResult.fee)} · ${deliveryResult.etaText}`}
                </ItemTitle>
              </ItemContent>
            </Item>
          ) : isTooFar ? (
            <Alert variant="warning" role="alert">
              <AlertTriangleIcon aria-hidden="true" />
              <AlertTitle>Too far for delivery</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <span>{words.location.tooFar(deliveryResult.km ?? 0, deliveryResult.maxKm)}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setType('pickup')}
                >
                  {words.location.switchToPickup}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Rider details: pattern c-field-2 */}
          <FieldSet>
            <FieldLegend variant="label">Rider details</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="rider-address">
                  {words.location.addressLine} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="rider-address"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Street address or building"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor="rider-house-no">{words.location.houseNoFloor}</FieldLabel>
                    <Badge variant="outline">{words.location.optionalBadge}</Badge>
                  </div>
                  <Input
                    id="rider-house-no"
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                    placeholder="Unit / Floor"
                  />
                </Field>
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor="rider-floor">Floor</FieldLabel>
                    <Badge variant="outline">{words.location.optionalBadge}</Badge>
                  </div>
                  <Input
                    id="rider-floor"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="e.g. 3rd flr"
                  />
                </Field>
              </div>

              {/* Landmark: pattern c-input-13 */}
              <Field>
                <FieldLabel htmlFor="rider-landmark">
                  {words.location.landmark} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="rider-landmark"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder={words.location.landmarkPlaceholder}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>
      ) : null}

      <Button
        id="how-where-save"
        type="submit"
        size="lg"
        className="w-full"
        disabled={
          (type === 'pickup' && when === 'later' && !slot) ||
          (type === 'delivery' && Boolean(isDeliveryDisabled))
        }
      >
        {words.location.save}
      </Button>
    </form>
  );
}

/** The How and where sheet: drawer on phones, dialog from tablets up (responsive-dialog). */
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
    >
      {open ? <HowWhereForm now={now} onDone={() => onOpenChange(false)} /> : null}
    </ResponsiveDialog>
  );
}
