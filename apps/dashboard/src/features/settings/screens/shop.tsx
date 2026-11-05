import * as React from 'react';
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  ExternalLinkIcon,
  MapPinIcon,
  XIcon,
} from 'lucide-react';
import {
  formatPhPhone,
  isShortMapsLink,
  normalisePhPhone,
  parseMapsLink,
  settingsWords,
  type LatLng,
  type OwnerSettings,
  type ShopFacts,
} from '@smartapp/core';
import { useResolveMapsLink, useSaveShopFacts } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Textarea } from '@smartapp/ui/components/textarea';
import { CopyButton } from '@smartapp/ui/compositions/copy-button';
import { useShop } from '@/app/shop';
import { storefrontUrl } from '@/app/use-nav-items';
import { ShopPreview } from '../previews.js';
import {
  SaveBar,
  SettingsCard,
  SettingsPage,
  SwitchRow,
  WithSettings,
  serverError,
  useDraft,
  useSectionSave,
} from '../settings-ui.js';
import { shortLink } from '../use-status.js';

const W = settingsWords.shop;

interface ShopDraft {
  name: string;
  phone: string;
  messenger: string;
  facebook: string;
  review: string;
  address: string;
  showAddress: boolean;
  pin: LatLng | null;
  pickupNote: string;
}

function draftOf(settings: OwnerSettings): ShopDraft {
  const c = settings.shop.contact;
  return {
    name: settings.shop.name,
    phone: c.phone ? formatPhPhone(c.phone) : '',
    messenger: c.messengerUsername ?? '',
    facebook: c.facebookUrl ?? '',
    review: c.googleReviewUrl ?? '',
    address: c.address ?? '',
    showAddress: c.showAddress,
    pin: c.pin,
    pickupNote: c.pickupNote ?? '',
  };
}

const orNull = (text: string): string | null => (text.trim() ? text.trim() : null);

function isHttpsUrl(text: string): boolean {
  if (!text.trim()) return true;
  try {
    return new URL(text.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

function factsOf(d: ShopDraft): ShopFacts {
  const phone = normalisePhPhone(d.phone);
  return {
    name: d.name.trim(),
    contact: {
      phone: d.phone.trim() && phone.ok ? phone.e164 : null,
      messengerUsername: orNull(d.messenger.replace(/^@/, '').replace(/^https?:\/\/m\.me\//, '')),
      facebookUrl: orNull(d.facebook),
      googleReviewUrl: orNull(d.review),
      address: orNull(d.address),
      showAddress: d.showAddress,
      pin: d.pin,
      pickupNote: orNull(d.pickupNote),
    },
  };
}

export function ShopSettingsScreen() {
  return <WithSettings>{(settings) => <ShopForm settings={settings} />}</WithSettings>;
}

function ShopForm({ settings }: { settings: OwnerSettings }) {
  const shop = useShop();
  const saved = React.useMemo(() => draftOf(settings), [settings]);
  const { draft, setDraft, dirty, reset } = useDraft(saved);
  const saveShop = useSaveShopFacts();
  const section = useSectionSave(settingsWords.sectionTitles.shop);
  const set = (patch: Partial<ShopDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const link = storefrontUrl(shop.slug);

  const problems = {
    name: draft.name.trim() ? undefined : W.nameRequired,
    phone: draft.phone.trim() && !normalisePhPhone(draft.phone).ok ? W.phoneBad : undefined,
    facebook: isHttpsUrl(draft.facebook) ? undefined : W.facebookBad,
    review: isHttpsUrl(draft.review) ? undefined : W.facebookBad,
  };
  const valid = Object.values(problems).every((p) => p === undefined);
  const phoneError = problems.phone ?? serverError(section.fieldErrors, 'phone', W.phoneBad);

  return (
    <SettingsPage id="shop" preview={<ShopPreview facts={factsOf(draft)} slug={shop.slug} />}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) void section.save(() => saveShop.mutateAsync(factsOf(draft)));
        }}
      >
        <SettingsCard title={W.nameCard}>
          <Field data-invalid={problems.name ? true : undefined}>
            <FieldLabel htmlFor="shop-name">{W.name}</FieldLabel>
            <Input
              className="h-11 md:h-9"
              id="shop-name"
              value={draft.name}
              maxLength={60}
              autoComplete="organization"
              aria-invalid={problems.name ? true : undefined}
              onChange={(e) => set({ name: e.target.value })}
            />
            {problems.name ? <FieldError>{problems.name}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="shop-link">{W.link}</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="shop-link"
                value={shortLink(link)}
                readOnly
                className="h-11 min-w-0 flex-1 md:h-9"
              />
              <CopyButton value={link} label={W.copy} className="h-11 shrink-0 md:h-9" />
              <Button
                variant="outline"
                size="icon"
                className="size-11 shrink-0 md:size-9"
                nativeButton={false}
                render={<a href={link} target="_blank" rel="noopener noreferrer" />}
                aria-label={settingsWords.preview}
              >
                <ExternalLinkIcon />
              </Button>
            </div>
            <FieldDescription>{W.linkHelp}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="shop-kind">{W.kind}</FieldLabel>
            <p id="shop-kind" className="text-sm font-medium text-foreground">
              {W.kindName[settings.kind]}
            </p>
            <FieldDescription>{W.kindHelp}</FieldDescription>
          </Field>
        </SettingsCard>

        <SettingsCard title={W.reachCard}>
          <Field data-invalid={phoneError ? true : undefined}>
            <FieldLabel htmlFor="shop-phone">{W.phone}</FieldLabel>
            <Input
              className="h-11 md:h-9"
              id="shop-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={draft.phone}
              aria-invalid={phoneError ? true : undefined}
              onChange={(e) => set({ phone: e.target.value })}
              onBlur={() => {
                const p = normalisePhPhone(draft.phone);
                if (p.ok) set({ phone: formatPhPhone(p.e164) });
              }}
            />
            {phoneError ? (
              <FieldError>{phoneError}</FieldError>
            ) : (
              <FieldDescription>{W.phoneHelp}</FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="shop-messenger">{W.messenger}</FieldLabel>
            <Input
              className="h-11 md:h-9"
              id="shop-messenger"
              value={draft.messenger}
              autoCapitalize="none"
              spellCheck={false}
              onChange={(e) => set({ messenger: e.target.value })}
            />
            <FieldDescription>{W.messengerHelp}</FieldDescription>
          </Field>
          <Field data-invalid={problems.facebook ? true : undefined}>
            <FieldLabel htmlFor="shop-facebook">{W.facebook}</FieldLabel>
            <Input
              className="h-11 md:h-9"
              id="shop-facebook"
              type="url"
              inputMode="url"
              value={draft.facebook}
              placeholder="https://facebook.com/"
              aria-invalid={problems.facebook ? true : undefined}
              onChange={(e) => set({ facebook: e.target.value })}
            />
            {problems.facebook ? <FieldError>{problems.facebook}</FieldError> : null}
          </Field>
          <Field data-invalid={problems.review ? true : undefined}>
            <FieldLabel htmlFor="shop-review">{W.review}</FieldLabel>
            <Input
              className="h-11 md:h-9"
              id="shop-review"
              type="url"
              inputMode="url"
              value={draft.review}
              aria-invalid={problems.review ? true : undefined}
              onChange={(e) => set({ review: e.target.value })}
            />
            {problems.review ? (
              <FieldError>{problems.review}</FieldError>
            ) : (
              <FieldDescription>{W.reviewHelp}</FieldDescription>
            )}
          </Field>
        </SettingsCard>

        <SettingsCard title={W.whereCard}>
          <Field>
            <FieldLabel htmlFor="shop-address">{W.address}</FieldLabel>
            <Textarea
              id="shop-address"
              rows={2}
              value={draft.address}
              autoComplete="street-address"
              onChange={(e) => set({ address: e.target.value })}
            />
          </Field>
          <SwitchRow
            id="shop-show-address"
            label={W.showAddress}
            help={W.showAddressHelp}
            checked={draft.showAddress}
            onCheckedChange={(showAddress) => set({ showAddress })}
          />
          <PinField pin={draft.pin} onChange={(pin) => set({ pin })} />
          <Field>
            <FieldLabel htmlFor="shop-pickup-note">{W.pickupNote}</FieldLabel>
            <Textarea
              id="shop-pickup-note"
              rows={2}
              maxLength={200}
              value={draft.pickupNote}
              onChange={(e) => set({ pickupNote: e.target.value })}
            />
            <FieldDescription>{W.pickupNoteHelp}</FieldDescription>
          </Field>
        </SettingsCard>
      </form>
      <SaveBar
        dirty={dirty}
        valid={valid}
        status={section.status}
        onDiscard={() => {
          reset();
          section.clear();
        }}
        onSave={() => void section.save(() => saveShop.mutateAsync(factsOf(draft)))}
      />
    </SettingsPage>
  );
}

/** Paste a Google Maps link; a short link is read by the server (no Maps API, decision Location A). */
function PinField({
  pin,
  onChange,
}: {
  pin: LatLng | null;
  onChange: (pin: LatLng | null) => void;
}) {
  const [text, setText] = React.useState('');
  const [bad, setBad] = React.useState(false);
  const resolve = useResolveMapsLink();

  const read = async (value: string) => {
    const trimmed = value.trim();
    setBad(false);
    if (!trimmed) return;
    const parsed = parseMapsLink(trimmed);
    if (parsed) {
      onChange(parsed);
      setText('');
      return;
    }
    if (isShortMapsLink(trimmed)) {
      try {
        onChange(await resolve.mutateAsync({ url: trimmed }));
        setText('');
        return;
      } catch {
        // Falls through to the error line.
      }
    }
    setBad(true);
  };

  return (
    <Field data-invalid={bad ? true : undefined}>
      <FieldLabel htmlFor="shop-pin">{W.pin}</FieldLabel>
      {pin ? (
        <div className="flex min-h-11 items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success-soft-foreground">
          <CheckCircle2Icon className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            {W.pinFound(pin.lat.toFixed(5), pin.lng.toFixed(5))}
            <span className="block text-xs opacity-80">{W.pinSet}</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 md:size-9"
            aria-label={W.pinClear}
            onClick={() => onChange(null)}
          >
            <XIcon />
          </Button>
        </div>
      ) : null}
      <div className="relative">
        <MapPinIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="shop-pin"
          type="url"
          inputMode="url"
          value={text}
          placeholder={W.pinPlaceholder}
          className="h-11 pl-9 md:h-9"
          aria-invalid={bad ? true : undefined}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (pasted) {
              e.preventDefault();
              setText(pasted);
              void read(pasted);
            }
          }}
          onBlur={() => void read(text)}
        />
        {resolve.isPending ? (
          <Spinner
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2"
            aria-label={W.pinChecking}
          />
        ) : null}
      </div>
      {bad ? (
        <FieldError className="flex items-start gap-1">
          <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {W.pinBad}
        </FieldError>
      ) : (
        <FieldDescription>{W.pinHelp}</FieldDescription>
      )}
    </Field>
  );
}
