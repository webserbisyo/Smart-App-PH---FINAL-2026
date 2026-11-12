import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  KeyRoundIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  PencilIcon,
  SunIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  APPEARANCES,
  errorWords,
  settingsWords,
  type Appearance,
  type OwnerProfile,
  type SendCodeResult,
} from '@smartapp/core';
import {
  errorCodeOf,
  useOwnerProfile,
  useRequestAccountDelete,
  useResetPasswordWithCode,
  useSaveProfile,
  useSendPasswordCode,
  useSignOutEverywhere,
} from '@smartapp/data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { OtpResend } from '@smartapp/ui/compositions/otp-resend';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { revealPage } from '@smartapp/ui/lib/reveal-clip';
import { setAppearance, useAppearance } from '@/app/appearance';
import { OwnerAvatarView } from '@/app/owner-avatar';
import { PageError } from '@/app/page-state';
import { useShop } from '@/app/shop';
import { AvatarPicker } from '../avatar-picker.js';
import {
  SaveBar,
  SettingsCard,
  SettingsPage,
  SettingsSkeleton,
  useDraft,
  useSectionSave,
} from '../settings-ui.js';

const W = settingsWords.account;
const APPEARANCE_ICON: Record<Appearance, React.ReactNode> = {
  light: <SunIcon />,
  dark: <MoonIcon />,
  system: <MonitorIcon />,
};

export function AccountSettingsScreen() {
  const profile = useOwnerProfile();
  if (profile.isPending) return <SettingsSkeleton />;
  if (profile.isError || !profile.data)
    return (
      <PageError
        title={settingsWords.errorTitle}
        message={errorWords(errorCodeOf(profile.error))}
        retryLabel={settingsWords.tryAgain}
        onRetry={() => void profile.refetch()}
      />
    );
  return <AccountForm profile={profile.data} />;
}

function AccountForm({ profile }: { profile: OwnerProfile }) {
  const shop = useShop();
  const { draft, setDraft, dirty, reset } = useDraft(profile.name);
  const saveProfile = useSaveProfile();
  const section = useSectionSave(settingsWords.sectionTitles.account);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const appearance = useAppearance();
  const tapPoint = React.useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const nameProblem = draft.trim() ? undefined : W.nameRequired;

  return (
    <SettingsPage id="account">
      <section className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center sm:flex-row sm:text-left">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={W.changePicture}
          className="group relative rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <OwnerAvatarView
            avatar={profile.avatar}
            name={profile.name}
            className="size-20 text-xl"
          />
          <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground [&_svg]:size-3.5">
            <PencilIcon aria-hidden />
          </span>
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-lg font-semibold text-foreground">{profile.name}</p>
          <p className="text-sm text-muted-foreground">{W.owner(shop.name)}</p>
        </div>
        <Button variant="outline" className="h-11 md:h-9" onClick={() => setPickerOpen(true)}>
          {W.changePicture}
        </Button>
      </section>

      <SettingsCard title={W.detailsCard}>
        <Field data-invalid={nameProblem ? true : undefined}>
          <FieldLabel htmlFor="owner-name">{W.name}</FieldLabel>
          <Input
            id="owner-name"
            className="h-11 md:h-9"
            value={draft}
            maxLength={80}
            autoComplete="name"
            aria-invalid={nameProblem ? true : undefined}
            onChange={(e) => setDraft(e.target.value)}
          />
          {nameProblem ? <FieldError>{nameProblem}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="owner-email">{W.email}</FieldLabel>
          <p id="owner-email" className="text-sm font-medium break-all text-foreground">
            {profile.email}
          </p>
          <FieldDescription>{W.emailHelp}</FieldDescription>
        </Field>
      </SettingsCard>

      <SettingsCard title={W.appearanceCard} description={W.appearanceLine}>
        <ToggleGroup
          aria-label={W.appearanceCard}
          value={[appearance]}
          onPointerDown={(event) => {
            tapPoint.current = { x: event.clientX, y: event.clientY };
          }}
          onValueChange={(value) => {
            const next = APPEARANCES.find((a) => a === value[0]);
            // The new look grows from where you tapped (View Transitions; at once under reduced motion).
            if (next) void revealPage(tapPoint.current, () => setAppearance(next));
          }}
          className="grid w-full grid-cols-3"
        >
          {APPEARANCES.map((a) => (
            <ToggleGroupItem key={a} value={a} className="h-11 gap-2 md:h-9">
              {APPEARANCE_ICON[a]}
              {W.appearance[a]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </SettingsCard>

      <SettingsCard
        title={W.passwordCard}
        description={settingsWords.account.passwordLine}
        action={
          <Button variant="outline" className="h-11 md:h-9" onClick={() => setPasswordOpen(true)}>
            <KeyRoundIcon />
            {W.changePassword}
          </Button>
        }
      />

      <SessionsCard />

      <SaveBar
        dirty={dirty}
        valid={!nameProblem}
        status={section.status}
        onDiscard={() => {
          reset();
          section.clear();
        }}
        onSave={() =>
          void section.save(() =>
            saveProfile.mutateAsync({ name: draft.trim(), avatar: profile.avatar }),
          )
        }
      />
      <AvatarPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        name={profile.name}
        current={profile.avatar}
      />
      <PasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} email={profile.email} />
    </SettingsPage>
  );
}

function SessionsCard() {
  const navigate = useNavigate();
  const signOutAll = useSignOutEverywhere();
  const requestDelete = useRequestAccountDelete();
  const [ask, setAsk] = React.useState<'signout' | 'delete' | null>(null);
  const action = useAsyncAction();

  const confirm = async () => {
    try {
      if (ask === 'signout') {
        await action.run(() => signOutAll.mutateAsync());
        setAsk(null);
        // Every device, this one too, goes back to the login page.
        void navigate({ to: '/logout' });
      } else if (ask === 'delete') {
        await action.run(() => requestDelete.mutateAsync());
        setAsk(null);
        notify({ title: W.deleteSent, tone: 'success' });
      }
    } catch (err) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  return (
    <>
      <SettingsCard title={W.sessionsCard}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{W.signOutAll}</p>
            <p className="text-xs text-muted-foreground">{W.signOutAllLine}</p>
          </div>
          <Button variant="outline" className="h-11 md:h-9" onClick={() => setAsk('signout')}>
            <LogOutIcon />
            {W.signOutAllButton}
          </Button>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-destructive-text">{W.deleteTitle}</p>
            <p className="text-xs text-muted-foreground">{W.deleteLine}</p>
          </div>
          <Button
            variant="outline"
            className="h-11 text-destructive-text md:h-9"
            onClick={() => setAsk('delete')}
          >
            <Trash2Icon />
            {W.deleteButton}
          </Button>
        </div>
      </SettingsCard>
      <AlertDialog
        open={ask !== null}
        onOpenChange={(open) => {
          if (!open) setAsk(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {ask === 'delete' ? W.deleteDialogTitle : W.signOutAllTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ask === 'delete' ? W.deleteDialogBody : W.signOutAllBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{settingsWords.password.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant={ask === 'delete' ? 'destructive' : 'default'}
              disabled={action.status !== 'idle'}
              onClick={() => void confirm()}
            >
              {ask === 'delete' ? W.deleteSend : W.signOutAllConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Change password with a 6-digit email code (no links, decision T64). */
function PasswordDialog({
  open,
  onOpenChange,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}) {
  const P = settingsWords.password;
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={P.title}>
      {open ? <PasswordSteps email={email} onClose={() => onOpenChange(false)} /> : null}
    </ResponsiveDialog>
  );
}

function PasswordSteps({ email, onClose }: { email: string; onClose: () => void }) {
  const P = settingsWords.password;
  const send = useSendPasswordCode();
  const reset = useResetPasswordWithCode();
  const sendAction = useAsyncAction();
  const changeAction = useAsyncAction();
  const [sent, setSent] = React.useState<SendCodeResult | null>(null);
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const codeRef = React.useRef<HTMLInputElement>(null);
  // The code boxes take the focus once the code is on its way.
  React.useEffect(() => {
    if (sent) codeRef.current?.focus();
  }, [sent]);

  const sendCode = async () => {
    setError(null);
    try {
      setSent(await sendAction.run(() => send.mutateAsync()));
    } catch (err) {
      setError(errorWords(errorCodeOf(err)));
    }
  };

  const change = async () => {
    setError(null);
    try {
      await changeAction.run(() => reset.mutateAsync({ code, newPassword: password }));
      notify({ title: P.done, tone: 'success' });
      onClose();
    } catch (err) {
      setError(errorWords(errorCodeOf(err)));
    }
  };

  if (!sent)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{P.sendLine(email)}</p>
        {error ? (
          <p role="alert" className="text-sm text-destructive-text">
            {error}
          </p>
        ) : null}
        <ResponsiveDialogFooter>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="h-11 md:h-9" onClick={onClose}>
              {P.cancel}
            </Button>
            <AsyncButton
              status={sendAction.status}
              busyLabel={P.sending}
              doneLabel={P.send}
              className="h-11 md:h-9"
              onClick={() => void sendCode()}
            >
              {P.send}
            </AsyncButton>
          </div>
        </ResponsiveDialogFooter>
      </div>
    );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6 && password.length >= 8) void change();
      }}
    >
      <OtpResend
        id="password-code"
        value={code}
        onChange={setCode}
        label={P.code}
        sentLine={P.codeLine(email)}
        hint={P.codeHint}
        resendAt={sent.resendAt}
        onResend={() => void sendCode()}
        resendLabel={P.resend}
        resendInLabel={P.resendIn}
        resending={sendAction.status === 'loading'}
        inputRef={codeRef}
      />
      {sent.devCode ? (
        <p className="text-xs text-muted-foreground">{P.devCode(sent.devCode)}</p>
      ) : null}
      <Field>
        <FieldLabel htmlFor="new-password">{P.newPassword}</FieldLabel>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          className="h-11 md:h-9"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FieldDescription>{P.newPasswordHelp}</FieldDescription>
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-destructive-text">
          {error}
        </p>
      ) : null}
      <ResponsiveDialogFooter>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={onClose}>
            {P.cancel}
          </Button>
          <AsyncButton
            type="submit"
            status={changeAction.status}
            busyLabel={P.changing}
            doneLabel={P.done}
            disabled={code.length !== 6 || password.length < 8}
            className="h-11 md:h-9"
          >
            {P.change}
          </AsyncButton>
        </div>
      </ResponsiveDialogFooter>
    </form>
  );
}
