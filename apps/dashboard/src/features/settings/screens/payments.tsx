import * as React from 'react';
import {
  BanknoteIcon,
  Building2Icon,
  FlaskConicalIcon,
  QrCodeIcon,
  SmartphoneIcon,
  TruckIcon,
} from 'lucide-react';
import {
  PAYMENT_METHODS,
  settingsWords,
  words,
  type OwnerSettings,
  type PaymentAccount,
  type PaymentMethod,
  type PaymentSettings,
} from '@smartapp/core';
import { useSavePayments } from '@smartapp/data';
import { Field, FieldDescription, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
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
  return { method, accountName: null, accountNumber: null, qr: null, sample: false };
}

/** What a transfer still needs before customers can use it. */
function missing(account: PaymentAccount): { name: boolean; number: boolean; qr: boolean } {
  if (!TRANSFERS.includes(account.method)) return { name: false, number: false, qr: false };
  return {
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
  const parked = React.useRef(new Map<PaymentMethod, PaymentAccount>());

  const accounts = draft.payments;
  const onlyOne = accounts.length === 1;
  const anySample = accounts.some((a) => a.sample);
  const valid =
    accounts.length > 0 &&
    accounts.every((a) => {
      const m = missing(a);
      return !m.name && !m.number && !m.qr;
    });

  const toggle = (method: PaymentMethod, on: boolean) =>
    setDraft((d) => {
      if (on) {
        const back = parked.current.get(method) ?? blankAccount(method);
        const next = [...d.payments, back];
        return {
          ...d,
          payments: PAYMENT_METHODS.flatMap((m) => next.filter((a) => a.method === m)),
        };
      }
      const leaving = d.payments.find((a) => a.method === method);
      if (leaving) parked.current.set(method, leaving);
      return { ...d, payments: d.payments.filter((a) => a.method !== method) };
    });

  const update = (method: PaymentMethod, patch: Partial<PaymentAccount>) =>
    setDraft((d) => ({
      ...d,
      // Editing a sample account makes it the owner's own.
      payments: d.payments.map((a) =>
        a.method === method ? { ...a, ...patch, sample: false } : a,
      ),
    }));

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
            const account = accounts.find((a) => a.method === method);
            const on = account !== undefined;
            const last = on && onlyOne;
            const need = account ? missing(account) : null;
            const qrSrc = account?.qr
              ? (previews[account.qr] ?? orderPhotoSrc(account.qr, 400))
              : null;
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
                {account && TRANSFERS.includes(method) ? (
                  <div className="flex flex-col gap-4 rounded-lg bg-muted/40 p-3 sm:ml-12">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field data-invalid={need?.name ? true : undefined}>
                        <FieldLabel htmlFor={`pay-${method}-name`}>
                          {method === 'bank' ? W.bankName : W.accountName}
                        </FieldLabel>
                        <Input
                          className="h-11 md:h-9"
                          id={`pay-${method}-name`}
                          value={account.accountName ?? ''}
                          maxLength={80}
                          aria-invalid={need?.name ? true : undefined}
                          onChange={(e) => update(method, { accountName: e.target.value || null })}
                        />
                      </Field>
                      {method !== 'qr_ph' ? (
                        <Field data-invalid={need?.number ? true : undefined}>
                          <FieldLabel htmlFor={`pay-${method}-number`}>
                            {W.accountNumber(method)}
                          </FieldLabel>
                          <Input
                            className="h-11 md:h-9"
                            id={`pay-${method}-number`}
                            value={account.accountNumber ?? ''}
                            inputMode={method === 'bank' ? 'numeric' : 'tel'}
                            maxLength={40}
                            aria-invalid={need?.number ? true : undefined}
                            onChange={(e) =>
                              update(method, { accountNumber: e.target.value || null })
                            }
                          />
                        </Field>
                      ) : null}
                    </div>
                    {need && (need.name || need.number) ? (
                      <FieldError>{W.required}</FieldError>
                    ) : null}
                    <ImageUploadRow
                      id={`pay-${method}-qr`}
                      kind="qr"
                      maxSide={QR_SIDE}
                      label={W.qr}
                      help={W.qrHelp}
                      src={qrSrc}
                      onUploaded={(done) => {
                        setPreviews((p) => ({ ...p, [done.ref]: done.preview }));
                        update(method, { qr: done.ref });
                      }}
                      onRemove={() => update(method, { qr: null })}
                    />
                    {need?.qr ? <FieldError>{W.required}</FieldError> : null}
                  </div>
                ) : null}
                {account && method === 'cod' ? (
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
