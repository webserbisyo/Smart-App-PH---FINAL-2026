import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LifeBuoyIcon, LockIcon, PackageIcon, UtensilsIcon } from 'lucide-react';
import {
  adminWords,
  CLOSE_REASONS,
  errorWords,
  extendPlan,
  formatPeso,
  normalisePhPhone,
  PLAN_MONTH_CHOICES,
  PLAN_PAID_VIA,
  planAmount,
  planCoversUntil,
  ShopKind,
  SUPPORT_MINUTES,
  SUPPORT_REASONS,
  supportWords,
  words,
  type AdminShopDetail,
  type CloseReason,
  type PlanMonths,
  type PlanPaidVia,
  type SupportReason,
} from '@smartapp/core';
import {
  errorCodeOf,
  useCloseShop,
  useCreateClientShop,
  useDeleteShop,
  useExtendPlan,
  usePlatformSetup,
  useQueryClient,
  useRecordPlanPayment,
  useStartSupport,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { MaskInput } from '@smartapp/ui/components/mask-input';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { dayText } from '@/app/billing-thread';
import { PesoInput } from '@/app/peso-input';
import { saveSupport } from '@/app/support';
import { useOnlineStatus } from '@/app/use-online-status';

const A = adminWords;
const EXTRA_CHOICES = [3, 7, 14, 30] as const;

const failed = (err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });

interface DialogProps {
  shop: AdminShopDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Footer({ onCancel, children }: { onCancel: () => void; children: React.ReactNode }) {
  return (
    <ResponsiveDialogFooter>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={onCancel}>
          {A.cancel}
        </Button>
        {children}
      </div>
    </ResponsiveDialogFooter>
  );
}

// ---------------------------------------------------------------- extra days

export function ExtraDaysDialog({ shop, open, onOpenChange }: DialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={A.extra.title}
      description={A.extra.line}
      scroll
    >
      {open ? <ExtraDaysForm shop={shop} onClose={() => onOpenChange(false)} /> : null}
    </ResponsiveDialog>
  );
}

function ExtraDaysForm({ shop, onClose }: { shop: AdminShopDetail; onClose: () => void }) {
  const extend = useExtendPlan();
  const action = useAsyncAction();
  const online = useOnlineStatus();
  const [days, setDays] = React.useState<number>(7);
  const [reason, setReason] = React.useState('');
  const [tried, setTried] = React.useState(false);
  const bad = reason.trim().length < 2;
  const next = extendPlan(shop, days, new Date());
  const until = next.paidUntil ?? (next.trialEndsAt ? next.trialEndsAt.slice(0, 10) : null);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (bad) return;
        void action
          .run(async () => {
            await extend.mutateAsync({ shopId: shop.id, days, reason: reason.trim() });
            notify({ title: A.extra.given(days), tone: 'success' });
            onClose();
          })
          .catch(failed);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel id="extra-days-label">{A.extra.days}</FieldLabel>
          <ToggleGroup
            aria-labelledby="extra-days-label"
            value={[String(days)]}
            onValueChange={(value) => {
              const n = EXTRA_CHOICES.find((d) => String(d) === value[0]);
              if (n) setDays(n);
            }}
            className="grid w-full grid-cols-4"
          >
            {EXTRA_CHOICES.map((d) => (
              <ToggleGroupItem key={d} value={String(d)} className="h-11 tabular-nums md:h-9">
                {d}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {until ? <FieldDescription>{A.record.covers(dayText(until))}</FieldDescription> : null}
        </Field>
        <Field data-invalid={tried && bad ? true : undefined}>
          <FieldLabel htmlFor="extra-reason">{A.extra.reason}</FieldLabel>
          <Input
            id="extra-reason"
            className="h-11 text-base md:h-9 md:text-sm"
            maxLength={120}
            placeholder={A.extra.reasonPlaceholder}
            value={reason}
            aria-invalid={tried && bad ? true : undefined}
            onChange={(e) => setReason(e.target.value)}
          />
          {tried && bad ? <FieldError>{A.extra.reasonBad}</FieldError> : null}
        </Field>
      </FieldGroup>
      <Footer onCancel={onClose}>
        <AsyncButton
          type="submit"
          status={action.status}
          busyLabel={A.extra.giving}
          doneLabel={A.extra.give(days)}
          disabled={!online}
          className="h-11 font-semibold md:h-9"
        >
          {A.extra.give(days)}
        </AsyncButton>
      </Footer>
    </form>
  );
}

// ---------------------------------------------------------------- record a payment

export function RecordPaymentDialog({ shop, open, onOpenChange }: DialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={A.record.title}
      description={A.record.line}
      scroll
    >
      {open ? <RecordForm shop={shop} onClose={() => onOpenChange(false)} /> : null}
    </ResponsiveDialog>
  );
}

function RecordForm({ shop, onClose }: { shop: AdminShopDetail; onClose: () => void }) {
  const record = useRecordPlanPayment();
  const setup = usePlatformSetup();
  const bonus = setup.data?.sixMonthBonus ?? false;
  const action = useAsyncAction();
  const online = useOnlineStatus();
  const [months, setMonths] = React.useState<PlanMonths>(1);
  const [method, setMethod] = React.useState<PlanPaidVia>('gcash');
  const [reference, setReference] = React.useState('');
  const [amount, setAmount] = React.useState<number>(shop.priceMonthly);
  const [note, setNote] = React.useState('');
  const [tried, setTried] = React.useState(false);
  const refBad = reference.trim().length < 4;
  const covers = planCoversUntil(shop.paidUntil, months, new Date());

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (refBad || amount <= 0) return;
        void action
          .run(async () => {
            await record.mutateAsync({
              shopId: shop.id,
              months,
              method,
              reference: reference.trim(),
              amount,
              note: note.trim() === '' ? null : note.trim(),
            });
            notify({ title: A.record.saved, tone: 'success' });
            onClose();
          })
          .catch(failed);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel id="rec-months-label">{A.record.months}</FieldLabel>
          <ToggleGroup
            aria-labelledby="rec-months-label"
            value={[String(months)]}
            onValueChange={(value) => {
              const n = PLAN_MONTH_CHOICES.find((m) => String(m) === value[0]);
              if (n) {
                setMonths(n);
                setAmount(planAmount(n, shop.priceMonthly, bonus));
              }
            }}
            className="grid w-full grid-cols-3"
          >
            {PLAN_MONTH_CHOICES.map((n) => (
              <ToggleGroupItem key={n} value={String(n)} className="h-11 tabular-nums md:h-9">
                {A.payments.months(n)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>{A.record.covers(dayText(covers))}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel id="rec-method-label">{A.record.method}</FieldLabel>
          <ToggleGroup
            aria-labelledby="rec-method-label"
            value={[method]}
            onValueChange={(value) => {
              const m = PLAN_PAID_VIA.find((x) => x === value[0]);
              if (m) setMethod(m);
            }}
            className="grid w-full grid-cols-2 sm:grid-cols-4"
          >
            {PLAN_PAID_VIA.map((m) => (
              <ToggleGroupItem key={m} value={m} className="h-11 md:h-9">
                {words.shop.paymentMethod[m]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="rec-amount">{A.record.amount}</FieldLabel>
          <PesoInput id="rec-amount" value={amount} onChange={setAmount} />
        </Field>
        <Field data-invalid={tried && refBad ? true : undefined}>
          <FieldLabel htmlFor="rec-ref">{A.record.reference}</FieldLabel>
          <Input
            id="rec-ref"
            className="h-11 font-mono text-base md:h-9 md:text-sm"
            autoComplete="off"
            maxLength={40}
            value={reference}
            aria-invalid={tried && refBad ? true : undefined}
            onChange={(e) => setReference(e.target.value)}
          />
          {tried && refBad ? <FieldError>{A.record.referenceBad}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="rec-note">{A.record.note}</FieldLabel>
          <Input
            id="rec-note"
            className="h-11 text-base md:h-9 md:text-sm"
            maxLength={120}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </FieldGroup>
      <Footer onCancel={onClose}>
        <AsyncButton
          type="submit"
          status={action.status}
          busyLabel={A.record.saving}
          doneLabel={A.record.saved}
          disabled={!online}
          className="h-11 font-semibold md:h-9"
        >
          {A.record.save} · {formatPeso(amount)}
        </AsyncButton>
      </Footer>
    </form>
  );
}

// ---------------------------------------------------------------- close

export function CloseShopDialog({ shop, open, onOpenChange }: DialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={A.close.title(shop.name)}
      description={A.close.line}
      scroll
    >
      {open ? <CloseForm shop={shop} onClose={() => onOpenChange(false)} /> : null}
    </ResponsiveDialog>
  );
}

function CloseForm({ shop, onClose }: { shop: AdminShopDetail; onClose: () => void }) {
  const close = useCloseShop();
  const action = useAsyncAction();
  const online = useOnlineStatus();
  const [reason, setReason] = React.useState<CloseReason>('not_paying');
  const paidAhead =
    shop.paidUntil !== null && shop.planStatus !== 'overdue' && shop.planStatus !== 'paused';
  const [when, setWhen] = React.useState<'now' | 'period_end'>(paidAhead ? 'period_end' : 'now');
  const [note, setNote] = React.useState('');

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void action
          .run(async () => {
            const res = await close.mutateAsync({
              shopId: shop.id,
              reason,
              when,
              note: note.trim() === '' ? null : note.trim(),
            });
            notify({
              title: res.closesOn ? A.close.willClose(dayText(res.closesOn)) : A.close.closed,
              tone: 'success',
            });
            onClose();
          })
          .catch(failed);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel id="close-reason-label">{A.close.reason}</FieldLabel>
          <RadioGroup
            aria-labelledby="close-reason-label"
            value={reason}
            onValueChange={(value) => {
              const r = CLOSE_REASONS.find((x) => x === value);
              if (r) setReason(r);
            }}
            className="gap-1"
          >
            {CLOSE_REASONS.map((r) => (
              <label
                key={r}
                className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-muted"
              >
                <RadioGroupItem value={r} />
                <span className="text-sm">{A.close.reasons[r]}</span>
              </label>
            ))}
          </RadioGroup>
        </Field>
        {paidAhead && shop.paidUntil ? (
          <Field>
            <FieldLabel id="close-when-label">{A.close.when}</FieldLabel>
            <RadioGroup
              aria-labelledby="close-when-label"
              value={when}
              onValueChange={(value) => setWhen(value === 'now' ? 'now' : 'period_end')}
              className="gap-1"
            >
              <label className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-muted">
                <RadioGroupItem value="period_end" />
                <span className="text-sm">{A.close.whenEnd(dayText(shop.paidUntil))}</span>
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-muted">
                <RadioGroupItem value="now" />
                <span className="text-sm">{A.close.whenNow}</span>
              </label>
            </RadioGroup>
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor="close-note">{A.close.note}</FieldLabel>
          <Input
            id="close-note"
            className="h-11 text-base md:h-9 md:text-sm"
            maxLength={120}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </FieldGroup>
      <Footer onCancel={onClose}>
        <AsyncButton
          type="submit"
          variant="destructive"
          status={action.status}
          busyLabel={A.close.closing}
          doneLabel={A.close.confirm}
          disabled={!online}
          className="h-11 font-semibold md:h-9"
        >
          {A.close.confirm}
        </AsyncButton>
      </Footer>
    </form>
  );
}

// ---------------------------------------------------------------- delete forever

export function DeleteShopDialog({
  shop,
  open,
  onOpenChange,
  onDeleted,
}: DialogProps & { onDeleted: () => void }) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={A.remove.title(shop.name)}
      description={A.remove.line}
    >
      {open ? (
        <DeleteForm shop={shop} onClose={() => onOpenChange(false)} onDeleted={onDeleted} />
      ) : null}
    </ResponsiveDialog>
  );
}

function DeleteForm({
  shop,
  onClose,
  onDeleted,
}: {
  shop: AdminShopDetail;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const remove = useDeleteShop();
  const action = useAsyncAction();
  const online = useOnlineStatus();
  const [typed, setTyped] = React.useState('');
  const matches = typed.trim().toLowerCase() === shop.name.toLowerCase();
  return (
    <form
      noValidate
      className="flex flex-col gap-4 pb-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!matches) return;
        void action
          .run(async () => {
            await remove.mutateAsync({ shopId: shop.id, confirmName: typed.trim() });
            notify({ title: A.remove.deleted, tone: 'success' });
            onClose();
            onDeleted();
          })
          .catch(failed);
      }}
    >
      <Field>
        <FieldLabel htmlFor="delete-name">{A.remove.type(shop.name)}</FieldLabel>
        <Input
          id="delete-name"
          className="h-11 text-base md:h-9 md:text-sm"
          autoComplete="off"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={onClose}>
          {A.cancel}
        </Button>
        <AsyncButton
          type="submit"
          variant="destructive"
          status={action.status}
          busyLabel={A.remove.deleting}
          doneLabel={A.remove.confirm}
          disabled={!online || !matches}
          className="h-11 font-semibold md:h-9"
        >
          {A.remove.confirm}
        </AsyncButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- create for a client

export function CreateClientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (shopId: string) => void;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={A.create.title}
      description={A.create.line}
      scroll
    >
      {open ? <CreateForm onClose={() => onOpenChange(false)} onCreated={onCreated} /> : null}
    </ResponsiveDialog>
  );
}

function CreateForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const create = useCreateClientShop();
  const action = useAsyncAction();
  const online = useOnlineStatus();
  const [f, setF] = React.useState({ fullName: '', email: '', phone: '', shopName: '', city: '' });
  const [kind, setKind] = React.useState<ShopKind>('food');
  const [tried, setTried] = React.useState(false);
  const phone = normalisePhPhone(f.phone);
  const bad = {
    fullName: f.fullName.trim().length < 2,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim()),
    phone: !phone.ok,
    shopName: f.shopName.trim().length < 2,
    city: f.city.trim().length < 2,
  };
  const anyBad = Object.values(bad).some(Boolean);
  const field = (
    key: keyof typeof f,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <Field data-invalid={tried && bad[key] ? true : undefined}>
      <FieldLabel htmlFor={`cc-${key}`}>{label}</FieldLabel>
      <Input
        id={`cc-${key}`}
        className="h-11 text-base md:h-9 md:text-sm"
        value={f[key]}
        aria-invalid={tried && bad[key] ? true : undefined}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        {...props}
      />
    </Field>
  );

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (anyBad || !phone.ok) return;
        void action
          .run(async () => {
            const shop = await create.mutateAsync({
              fullName: f.fullName.trim(),
              email: f.email.trim().toLowerCase(),
              phone: phone.e164,
              shopName: f.shopName.trim(),
              kind,
              city: f.city.trim(),
            });
            notify({ title: A.create.created(shop.name), tone: 'success' });
            onClose();
            onCreated(shop.id);
          })
          .catch(failed);
      }}
    >
      <FieldGroup>
        {field('fullName', A.create.fullName, { autoComplete: 'off', maxLength: 80 })}
        {field('email', A.create.email, { type: 'email', inputMode: 'email', autoComplete: 'off' })}
        <Field data-invalid={tried && bad.phone ? true : undefined}>
          <FieldLabel htmlFor="cc-phone">{A.create.phone}</FieldLabel>
          <MaskInput
            id="cc-phone"
            mask={{
              pattern: '####-###-####',
              transform: (val) => val.replace(/\D/g, ''),
              validate: (val) => normalisePhPhone(val).ok,
            }}
            inputMode="numeric"
            className="h-11 text-base md:h-9 md:text-sm"
            value={f.phone}
            aria-invalid={tried && bad.phone ? true : undefined}
            onValueChange={(_, unmasked) => setF({ ...f, phone: unmasked })}
          />
        </Field>
        {field('shopName', A.create.shopName, { maxLength: 60 })}
        <Field>
          <FieldLabel id="cc-kind-label">{A.create.kind}</FieldLabel>
          <ToggleGroup
            aria-labelledby="cc-kind-label"
            value={[kind]}
            onValueChange={(value) => {
              const k = ShopKind.find((x) => x === value[0]);
              if (k) setKind(k);
            }}
            className="grid w-full grid-cols-2"
          >
            {ShopKind.map((k) => (
              <ToggleGroupItem key={k} value={k} className="h-11 gap-2 md:h-9">
                {k === 'food' ? (
                  <UtensilsIcon aria-hidden="true" />
                ) : (
                  <PackageIcon aria-hidden="true" />
                )}
                {words.nav.catalog(k)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        {field('city', A.create.city, { maxLength: 60 })}
        {tried && anyBad ? <FieldError>{errorWords('invalid_input')}</FieldError> : null}
      </FieldGroup>
      <Footer onCancel={onClose}>
        <AsyncButton
          type="submit"
          status={action.status}
          busyLabel={A.create.saving}
          doneLabel={A.create.save}
          disabled={!online}
          className="h-11 font-semibold md:h-9"
        >
          {A.create.save}
        </AsyncButton>
      </Footer>
    </form>
  );
}

// ---------------------------------------------------------------- open as owner (help mode)

export function OpenAsOwnerDialog({ shop, open, onOpenChange }: DialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={supportWords.title}
      description={supportWords.line}
    >
      {open ? <OpenAsOwnerForm shop={shop} onClose={() => onOpenChange(false)} /> : null}
    </ResponsiveDialog>
  );
}

function OpenAsOwnerForm({ shop, onClose }: { shop: AdminShopDetail; onClose: () => void }) {
  const start = useStartSupport();
  const action = useAsyncAction();
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reason, setReason] = React.useState<SupportReason>('set_up');
  return (
    <form
      noValidate
      className="flex flex-col gap-4 pb-2"
      onSubmit={(e) => {
        e.preventDefault();
        void action
          .run(async () => {
            const session = await start.mutateAsync({ shopId: shop.id, reason });
            saveSupport(session);
            onClose();
            // The owner's pages read fresh for this shop.
            qc.clear();
            await navigate({ to: '/' });
          })
          .catch(failed);
      }}
    >
      <Field>
        <FieldLabel id="support-reason-label">{supportWords.reason}</FieldLabel>
        <RadioGroup
          aria-labelledby="support-reason-label"
          value={reason}
          onValueChange={(value) => {
            const r = SUPPORT_REASONS.find((x) => x === value);
            if (r) setReason(r);
          }}
          className="gap-1"
        >
          {SUPPORT_REASONS.map((r) => (
            <label
              key={r}
              className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-muted"
            >
              <RadioGroupItem value={r} />
              <span className="text-sm">{supportWords.reasons[r]}</span>
            </label>
          ))}
        </RadioGroup>
      </Field>
      <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {supportWords.lockedList}
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={onClose}>
          {A.cancel}
        </Button>
        <AsyncButton
          type="submit"
          status={action.status}
          busyLabel={supportWords.opening}
          doneLabel={supportWords.open}
          disabled={!online || !shop.hasDemoData}
          className="h-11 font-semibold md:h-9"
        >
          <LifeBuoyIcon aria-hidden="true" />
          {supportWords.open} · {SUPPORT_MINUTES} min
        </AsyncButton>
      </div>
      {shop.hasDemoData ? null : (
        <p className="text-xs text-muted-foreground">{supportWords.noDemoData}</p>
      )}
    </form>
  );
}
