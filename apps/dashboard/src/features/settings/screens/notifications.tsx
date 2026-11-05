import { BellRingIcon, GemIcon, HardDriveIcon, ReceiptIcon } from 'lucide-react';
import { errorWords, settingsWords, type NotificationPrefs } from '@smartapp/core';
import { errorCodeOf, useNotificationPrefs, useSaveNotificationPrefs } from '@smartapp/data';
import { Field, FieldDescription, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { PageError } from '@/app/page-state';
import {
  SaveBar,
  SettingsCard,
  SettingsPage,
  SettingsSkeleton,
  SwitchRow,
  useDraft,
  useSectionSave,
} from '../settings-ui.js';

const W = settingsWords.notifications;
const ROWS = [
  { key: 'newOrder', icon: <BellRingIcon />, label: W.newOrder, help: W.newOrderHelp },
  {
    key: 'paymentToCheck',
    icon: <ReceiptIcon />,
    label: W.paymentToCheck,
    help: W.paymentToCheckHelp,
  },
  { key: 'storage', icon: <HardDriveIcon />, label: W.storage, help: W.storageHelp },
  { key: 'planPayment', icon: <GemIcon />, label: W.planPayment, help: W.planPaymentHelp },
] as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NotificationsSettingsScreen() {
  const prefs = useNotificationPrefs();
  if (prefs.isPending) return <SettingsSkeleton />;
  if (prefs.isError || !prefs.data)
    return (
      <PageError
        title={settingsWords.errorTitle}
        message={errorWords(errorCodeOf(prefs.error))}
        retryLabel={settingsWords.tryAgain}
        onRetry={() => void prefs.refetch()}
      />
    );
  return <NotificationsForm prefs={prefs.data} />;
}

function NotificationsForm({ prefs }: { prefs: NotificationPrefs }) {
  const { draft, setDraft, dirty, reset } = useDraft(prefs);
  const save = useSaveNotificationPrefs();
  const section = useSectionSave(settingsWords.sectionTitles.notifications);
  const emailProblem = EMAIL.test(draft.email.trim()) ? undefined : W.sendToBad;

  return (
    <SettingsPage id="notifications">
      <SettingsCard title={W.emailCard}>
        <div className="flex flex-col gap-3">
          {ROWS.map((row) => (
            <SwitchRow
              key={row.key}
              id={`notify-${row.key}`}
              icon={row.icon}
              label={row.label}
              help={row.help}
              checked={draft[row.key]}
              onCheckedChange={(on) => setDraft((d) => ({ ...d, [row.key]: on }))}
            />
          ))}
        </div>
        <Field data-invalid={emailProblem ? true : undefined}>
          <FieldLabel htmlFor="notify-email">{W.sendTo}</FieldLabel>
          <Input
            id="notify-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className="h-11 md:h-9"
            value={draft.email}
            aria-invalid={emailProblem ? true : undefined}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
          />
          {emailProblem ? (
            <FieldError>{emailProblem}</FieldError>
          ) : (
            <FieldDescription>{W.sendToHelp}</FieldDescription>
          )}
        </Field>
      </SettingsCard>
      <SaveBar
        dirty={dirty}
        valid={!emailProblem}
        status={section.status}
        onDiscard={() => {
          reset();
          section.clear();
        }}
        onSave={() =>
          void section.save(() => save.mutateAsync({ ...draft, email: draft.email.trim() }))
        }
      />
    </SettingsPage>
  );
}
