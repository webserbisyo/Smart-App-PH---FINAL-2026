import * as React from 'react';
import {
  BanknoteIcon,
  Building2Icon,
  FlaskConicalIcon,
  PlusIcon,
  QrCodeIcon,
  SmartphoneIcon,
  Trash2Icon,
  TruckIcon,
} from 'lucide-react';
import {
  BANK_ACCOUNTS_MAX,
  PAYMENT_METHODS,
  PH_BANKS,
  paymentLabel,
  settingsWords,
  words,
  type OwnerSettings,
  type PaymentAccount,
  type PaymentMethod,
  type PaymentSettings,
} from '@smartapp/core';
import { useSavePayments } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@smartapp/ui/components/native-select';
import { ImageUploadRow } from '@/app/image-upload-row';
import { Notice } from '@/app/notice';
import { orderPhotoSrc } from '@/app/orders/order-photo';
import { PesoInput } from '@/app/peso-input';
import { useShop } from '@/app/shop';
import { PaymentsPreview } from '../previews.js';
import {
  SaveBar,
  SettingsCard,
  SettingsPage,
  SwitchRow,
  WithSettings,
  useDraft,
  useSectionSave,
} from '../settings-ui.js';

const W = settingsWords.payments;
const TRANSFERS: readonly PaymentMethod[] = ['gcash', 'maya', 'bank', 'qr_ph'];
const ICON: Record<PaymentMethod, React.ReactNode> = {
  cash: <BanknoteIcon />,
  cod: <TruckIcon />,
  gcash: <SmartphoneIcon />,
  maya: <SmartphoneIcon />,
  bank: <Building2Icon />,
  qr_ph: <QrCodeIcon />,
};
// The QR is kept sharp so it scans (T65).
const QR_SIDE = 1000;
const SAMPLE_TOTAL = 34500;

function blankAccount(method: PaymentMethod): PaymentAccount {
  return {
    // Orders remember the account by this id (T84).
    id: `pay-${crypto.randomUUID()}`,
    method,
    bank: null,
    accountName: null,
    accountNumber: null,
    qr: null,
    sample: false,
  };
}

interface Missing {
  bank: boolean;
  name: boolean;
  number: boolean;
  qr: boolean;
}

/** What a transfer still needs before customers can use it. */
function missing(account: PaymentAccount): Missing {
  if (!TRANSFERS.includes(account.method))
    return { bank: false, name: false, number: false, qr: false };
  return {
    bank: account.method === 'bank' && !account.bank,
    name: !account.accountName?.trim(),
    number: account.method !== 'qr_ph' && !account.accountNumber?.trim(),
    qr: account.method === 'qr_ph' && !account.qr,
  };
}

export function PaymentsSettingsScreen() {
  return <WithSettings>{(settings) => <PaymentsForm settings={settings} />}</WithSettings>;
}

function PaymentsForm({ settings }: { settings: OwnerSettings }) {
  const shop = useShop();
  const { draft, setDraft, dirty, reset } = useDraft<PaymentSettings>(settings.payments);
  const savePayments = useSavePayments();
  const section = useSectionSave(settingsWords.sectionTitles.payments);
  // New QR photos show from this phone until the page reloads.
  const [previews, setPreviews] = React.useState<Record<string, string>>({});
  // Turning a method off and on again keeps what was typed.
  const parked = React.useRef(new Map<PaymentMethod, PaymentAccount[]>());

  const accounts = draft.payments;
  const methodsOn = new Set(accounts.map((a) => a.method));
  const onlyOne = methodsOn.size === 1;
  const anySample = accounts.some((a) => a.sample);
  const valid =
    accounts.length > 0 &&
    accounts.every((a) => {
      const m = missing(a);
      return !m.bank && !m.name && !m.number && !m.qr;
    });

  // Accounts stay grouped by method in the usual order; a method's accounts keep the order they were added.
  const ordered = (list: PaymentAccount[]) =>
    PAYMENT_METHODS.flatMap((m) => list.filter((a) => a.method === m));

  const toggle = (method: PaymentMethod, on: boolean) =>
    setDraft((d) => {
      if (on) {
        const back = parked.current.get(method) ?? [blankAccount(method)];
        return { ...d, payments: ordered([...d.payments, ...back]) };
      }
      const leaving = d.payments.filter((a) => a.method === method);
      if (leaving.length > 0) parked.current.set(method, leaving);
      return { ...d, payments: d.payments.filter((a) => a.method !== method) };
    });

  const update = (id: string, patch: Partial<PaymentAccount>) =>
    setDraft((d) => ({
      ...d,
      // Editing a sample account makes it the owner's own.
      payments: d.payments.map((a) => (a.id === id ? { ...a, ...patch, sample: false } : a)),
    }));

  const addBank = () =>
    setDraft((d) => ({ ...d, payments: ordered([...d.payments, blankAccount('bank')]) }));
  const removeAccount = (id: string) =>
    setDraft((d) => ({ ...d, payments: d.payments.filter((a) => a.id !== id) }));

  return (
    <SettingsPage
      id="payments"
      preview={<PaymentsPreview slug={shop.slug} payments={accounts} sampleTotal={SAMPLE_TOTAL} />}
    >
      {anySample ? (
        <Notice tone="warning" icon={<FlaskConicalIcon className="size-4" />}>
          {W.sample}
        </Notice>
      ) : null}
      <SettingsCard title={W.methodsCard} description={W.transferNote}>
        <ul className="-my-2 flex flex-col divide-y divide-border">
          {PAYMENT_METHODS.map((method) => {
            const own = accounts.filter((a) => a.method === method);
            const on = own.length > 0;
            const last = on && onlyOne;
            return (
              <li key={method} className="flex flex-col gap-3 py-3">
                <SwitchRow
                  id={`pay-${method}`}
                  icon={ICON[method]}
                  label={words.shop.paymentMethod[method]}
                  help={last ? W.lastMethod : W.help[method]}
                  checked={on}
                  disabled={last}
                  onCheckedChange={(next) => toggle(method, next)}
                />
                {TRANSFERS.includes(method)
                  ? own.map((account) => (
                      <AccountFields
                        key={account.id}
                        account={account}
                        qrSrc={
                          account.qr
                            ? (previews[account.qr] ?? orderPhotoSrc(account.qr, 400))
                            : null
                        }
                        // A shop with more than one bank can remove any of them; the switch turns off the last.
                        onRemove={own.length > 1 ? () => removeAccount(account.id) : undefined}
                        onChange={(patch) => update(account.id, patch)}
                        onPreview={(ref, preview) => setPreviews((p) => ({ ...p, [ref]: preview }))}
                      />
                    ))
                  : null}
                {method === 'bank' && on ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:ml-12">
                    <Button
                      variant="outline"
                      className="h-11 gap-1.5 md:h-9"
                      disabled={own.length >= BANK_ACCOUNTS_MAX}
                      onClick={addBank}
                    >
                      <PlusIcon aria-hidden="true" />
                      {W.addBank}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {W.bankLimit(BANK_ACCOUNTS_MAX)}
                    </span>
                  </div>
                ) : null}
                {on && method === 'cod' ? (
                  <Field className="sm:ml-12 sm:w-64">
                    <FieldLabel htmlFor="cod-max">{W.codMax}</FieldLabel>
                    <PesoInput
                      id="cod-max"
                      value={draft.codMaxTotal ?? 0}
                      onChange={(value) =>
                        setDraft((d) => ({ ...d, codMaxTotal: value > 0 ? value : null }))
                      }
                    />
                    <FieldDescription>{W.codMaxHelp}</FieldDescription>
                  </Field>
                ) : null}
              </li>
            );
          })}
        </ul>
      </SettingsCard>

      <SaveBar
        dirty={dirty}
        valid={valid}
        status={section.status}
        onDiscard={() => {
          reset();
          section.clear();
        }}
        onSave={() => void section.save(() => savePayments.mutateAsync(draft))}
      />
    </SettingsPage>
  );
}

/** One transfer account: the bank (banks only), the name and number customers send to, and its QR. */
function AccountFields({
  account,
  qrSrc,
  onChange,
  onRemove,
  onPreview,
}: {
  account: PaymentAccount;
  qrSrc: string | null;
  onChange: (patch: Partial<PaymentAccount>) => void;
  onRemove: (() => void) | undefined;
  onPreview: (ref: string, preview: string) => void;
}) {
  const { method } = account;
  const id = `pay-${account.id}`;
  const need = missing(account);
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-muted/40 p-3 sm:ml-12">
      {method === 'bank' ? (
        <div className="flex items-end gap-2">
          <Field className="min-w-0 flex-1" data-invalid={need.bank ? true : undefined}>
            <FieldLabel htmlFor={`${id}-bank`}>{W.bank}</FieldLabel>
            <NativeSelect
              id={`${id}-bank`}
              // Phone size: 44 px tall, 16 px text so iOS does not zoom.
              className="w-full [&_select]:h-11 [&_select]:text-base md:[&_select]:h-9 md:[&_select]:text-sm"
              value={account.bank ?? ''}
              aria-invalid={need.bank ? true : undefined}
              onChange={(e) =>
                onChange({ bank: PH_BANKS.find((b) => b === e.target.value) ?? null })
              }
            >
              <NativeSelectOption value="" disabled>
                {W.bankPick}
              </NativeSelectOption>
              {PH_BANKS.map((bank) => (
                <NativeSelectOption key={bank} value={bank}>
                  {words.shop.bank[bank]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          {onRemove ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 text-muted-foreground md:size-9"
              aria-label={W.removeBank(paymentLabel(account))}
              onClick={onRemove}
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      ) : null}
      {need.bank ? <FieldError>{W.bankRequired}</FieldError> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={need.name ? true : undefined}>
          <FieldLabel htmlFor={`${id}-name`}>{W.accountName}</FieldLabel>
          <Input
            className="h-11 md:h-9"
            id={`${id}-name`}
            value={account.accountName ?? ''}
            maxLength={80}
            aria-invalid={need.name ? true : undefined}
            onChange={(e) => onChange({ accountName: e.target.value || null })}
          />
        </Field>
        {method !== 'qr_ph' ? (
          <Field data-invalid={need.number ? true : undefined}>
            <FieldLabel htmlFor={`${id}-number`}>{W.accountNumber(method)}</FieldLabel>
            <Input
              className="h-11 md:h-9"
              id={`${id}-number`}
              value={account.accountNumber ?? ''}
              inputMode={method === 'bank' ? 'numeric' : 'tel'}
              maxLength={40}
              aria-invalid={need.number ? true : undefined}
              onChange={(e) => onChange({ accountNumber: e.target.value || null })}
            />
          </Field>
        ) : null}
      </div>
      {need.name || need.number ? <FieldError>{W.required}</FieldError> : null}
      <ImageUploadRow
        id={`${id}-qr`}
        kind="qr"
        maxSide={QR_SIDE}
        label={W.qr}
        help={W.qrHelp}
        src={qrSrc}
        onUploaded={(done) => {
          onPreview(done.ref, done.preview);
          onChange({ qr: done.ref });
        }}
        onRemove={() => onChange({ qr: null })}
      />
      {need.qr ? <FieldError>{W.required}</FieldError> : null}
    </div>
  );
}
