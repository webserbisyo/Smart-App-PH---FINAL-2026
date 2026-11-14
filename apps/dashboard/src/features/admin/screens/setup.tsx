import * as React from 'react';
import { MailIcon, SaveIcon, WifiOffIcon } from 'lucide-react';
import {
  adminWords,
  errorWords,
  formatPeso,
  planAmount,
  PlatformSetupSchema,
  type PlatformSetup,
} from '@smartapp/core';
import { errorCodeOf, usePlatformSetup, useSavePlatformSetup } from '@smartapp/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartapp/ui/components/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { Notice } from '@/app/notice';
import { PageError } from '@/app/page-state';
import { PesoInput } from '@/app/peso-input';
import { useOnlineStatus } from '@/app/use-online-status';

const A = adminWords;
const W = A.setup;

/**
 * Setup (decision T92): the price, the free trial, the 6-month bonus, where owners send money and the
 * Messenger link on the sign-up page. Shops keep the price they signed up at.
 */
export function AdminSetupScreen() {
  const setup = usePlatformSetup();
  const online = useOnlineStatus();

  return (
    <div className="flex min-h-full flex-col pb-24 md:pb-8">
      <PageHeader title={W.title} />
      <div className="flex w-full max-w-3xl flex-col gap-3 px-4 pt-3 md:gap-4 md:px-6 md:pt-4">
        <p className="text-sm text-muted-foreground">{W.line}</p>
        {!online ? (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
            {A.loadError}
          </Notice>
        ) : null}
        {setup.isPending ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-hidden="true">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        ) : setup.isError && !setup.data ? (
          <PageError
            title={A.loadError}
            message={errorWords(errorCodeOf(setup.error))}
            retryLabel={A.tryAgain}
            onRetry={() => void setup.refetch()}
          />
        ) : (
          <SetupForm key={JSON.stringify(setup.data)} initial={setup.data} />
        )}
      </div>
    </div>
  );
}

function SetupForm({ initial }: { initial: PlatformSetup }) {
  const [form, setForm] = React.useState(initial);
  const [tried, setTried] = React.useState(false);
  const save = useSavePlatformSetup();
  const action = useAsyncAction();
  const parsed = PlatformSetupSchema.safeParse(form);
  const issue = (path: string) =>
    tried && !parsed.success && parsed.error.issues.some((i) => i.path[0] === path);
  const payIssue = (key: string) =>
    tried &&
    !parsed.success &&
    parsed.error.issues.some((i) => i.path[0] === 'payTo' && i.path[1] === key);
  const changed = JSON.stringify(form) !== JSON.stringify(initial);

  const set = <K extends keyof PlatformSetup>(key: K, value: PlatformSetup[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const setPay = (key: keyof PlatformSetup['payTo'], value: string) =>
    setForm((prev) => ({ ...prev, payTo: { ...prev.payTo, [key]: value } }));

  return (
    <form
      className="flex flex-col gap-3 md:gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!parsed.success) return;
        void action
          .run(() => save.mutateAsync(parsed.data))
          .then(() => notify({ title: W.saved, tone: 'success' }))
          .catch((err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }));
      }}
    >
      <Card className="gap-3">
        <CardHeader>
          <CardTitle>{W.priceCard}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={issue('priceMonthly') || undefined}>
              <FieldLabel htmlFor="setup-price">{W.price}</FieldLabel>
              <PesoInput
                id="setup-price"
                value={form.priceMonthly}
                onChange={(v) => set('priceMonthly', v)}
                className="max-w-48"
              />
              <FieldDescription>{W.priceHelp}</FieldDescription>
            </Field>
            <Field data-invalid={issue('trialDays') || undefined}>
              <FieldLabel htmlFor="setup-trial">{W.trialDays}</FieldLabel>
              <Input
                id="setup-trial"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                value={String(form.trialDays)}
                onChange={(e) => set('trialDays', Math.round(Number(e.target.value) || 0))}
                className="h-11 max-w-32 text-base md:h-9 md:text-sm"
              />
              <FieldDescription>{W.trialHelp}</FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="setup-bonus">{W.bonus}</FieldLabel>
                <FieldDescription>
                  {W.bonusHelp(formatPeso(planAmount(6, form.priceMonthly, true)))}
                </FieldDescription>
              </FieldContent>
              <Switch
                id="setup-bonus"
                checked={form.sixMonthBonus}
                onCheckedChange={(v) => set('sixMonthBonus', v)}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle>{W.payCard}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={payIssue('accountName') || undefined}>
              <FieldLabel htmlFor="setup-name">{W.accountName}</FieldLabel>
              <Input
                id="setup-name"
                value={form.payTo.accountName}
                maxLength={80}
                onChange={(e) => setPay('accountName', e.target.value)}
                className="h-11 text-base md:h-9 md:text-sm"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={payIssue('gcash') || undefined}>
                <FieldLabel htmlFor="setup-gcash">{W.gcash}</FieldLabel>
                <Input
                  id="setup-gcash"
                  inputMode="tel"
                  value={form.payTo.gcash}
                  maxLength={40}
                  onChange={(e) => setPay('gcash', e.target.value)}
                  className="h-11 text-base md:h-9 md:text-sm"
                />
              </Field>
              <Field data-invalid={payIssue('maya') || undefined}>
                <FieldLabel htmlFor="setup-maya">{W.maya}</FieldLabel>
                <Input
                  id="setup-maya"
                  inputMode="tel"
                  value={form.payTo.maya}
                  maxLength={40}
                  onChange={(e) => setPay('maya', e.target.value)}
                  className="h-11 text-base md:h-9 md:text-sm"
                />
              </Field>
            </div>
            <Field data-invalid={issue('messengerUrl') || undefined}>
              <FieldLabel htmlFor="setup-messenger">{W.messenger}</FieldLabel>
              <Input
                id="setup-messenger"
                type="url"
                inputMode="url"
                value={form.messengerUrl}
                maxLength={200}
                onChange={(e) => set('messengerUrl', e.target.value.trim())}
                className="h-11 text-base md:h-9 md:text-sm"
              />
              {issue('messengerUrl') ? (
                <FieldError>{W.messengerBad}</FieldError>
              ) : (
                <FieldDescription>{W.messengerHelp}</FieldDescription>
              )}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle>{W.remindersCard}</CardTitle>
          <CardDescription>{W.remindersHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {W.reminders.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm">
                <MailIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                {line}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <AsyncButton
          type="submit"
          status={action.status}
          busyLabel={W.saving}
          doneLabel={W.saved}
          disabled={!changed}
          className="h-11 gap-1.5 shadow-md md:h-9"
        >
          <SaveIcon aria-hidden="true" />
          {W.save}
        </AsyncButton>
      </div>
    </form>
  );
}
