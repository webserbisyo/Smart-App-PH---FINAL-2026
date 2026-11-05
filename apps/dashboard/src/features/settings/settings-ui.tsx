import * as React from 'react';
import { useBlocker } from '@tanstack/react-router';
import { EyeIcon, WifiOffIcon } from 'lucide-react';
import { errorWords, settingsWords, type ErrorCode, type OwnerSettings } from '@smartapp/core';
import { ApiRequestError, errorCodeOf, useOwnerSettings } from '@smartapp/data';
import { ActionBar, ActionBarSelection } from '@smartapp/ui/components/action-bar';
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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartapp/ui/components/card';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { cn } from 'cn';
import { Notice } from '@/app/notice';
import { PageError } from '@/app/page-state';
import { useDockClearance } from '@/app/use-dock-clearance';
import { useOnlineStatus } from '@/app/use-online-status';
import { sectionOf, type SettingsSectionId } from './sections.js';

const W = settingsWords;

/**
 * One settings section: the page name for screen readers, one line on what lives here, the offline
 * notice, the form, and on laptops a "Customers see" preview beside it (decision T64).
 */
export function SettingsPage({
  id,
  children,
  preview,
}: {
  id: SettingsSectionId;
  children: React.ReactNode;
  preview?: React.ReactNode;
}) {
  const section = sectionOf(id);
  const online = useOnlineStatus();
  return (
    <div className="flex min-h-full flex-col pb-32 md:pb-24">
      <PageHeader title={section.label} />
      <main
        className={cn(
          'flex w-full flex-1 flex-col gap-4 px-4 pt-3 md:px-6 md:pt-6',
          preview ? 'max-w-6xl' : 'max-w-3xl',
        )}
      >
        <p className="text-sm text-muted-foreground">{section.line}</p>
        {!online ? (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
            {W.offline}
          </Notice>
        ) : null}
        {preview ? (
          <div className="flex flex-col gap-4 xl:grid xl:grid-cols-5 xl:items-start xl:gap-6">
            <div className="flex min-w-0 flex-col gap-4 xl:col-span-3">{children}</div>
            <aside
              aria-label={W.customersSee}
              className="hidden xl:sticky xl:top-4 xl:col-span-2 xl:flex xl:flex-col xl:gap-2"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <EyeIcon className="size-3.5" aria-hidden />
                {W.customersSee}
              </p>
              {preview}
            </aside>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

/** A titled group of 5 to 7 fields (docs/ux.md). */
export function SettingsCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      {children ? <CardContent className="flex flex-col gap-5">{children}</CardContent> : null}
    </Card>
  );
}

/** A label, a help line and a switch on one row. */
export function SwitchRow({
  id,
  label,
  help,
  checked,
  onCheckedChange,
  disabled,
  icon,
}: {
  id: string;
  label: string;
  help?: string | undefined;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      {icon ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <label htmlFor={id} className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {help ? <span className="text-xs text-muted-foreground">{help}</span> : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-3 md:px-6 md:pt-6" aria-busy>
      <Skeleton className="h-4 w-2/3 max-w-md" />
      <Skeleton className="h-48 w-full max-w-3xl rounded-xl" />
      <Skeleton className="h-36 w-full max-w-3xl rounded-xl" />
    </div>
  );
}

/** Loads the Settings read once; each section renders from it, or shows the skeleton or Try again. */
export function WithSettings({
  children,
}: {
  children: (settings: OwnerSettings) => React.ReactNode;
}) {
  const query = useOwnerSettings();
  if (query.isPending) return <SettingsSkeleton />;
  if (query.isError || !query.data)
    return (
      <PageError
        title={W.errorTitle}
        message={errorWords(errorCodeOf(query.error))}
        retryLabel={W.tryAgain}
        onRetry={() => void query.refetch()}
      />
    );
  return <>{children(query.data)}</>;
}

/** A draft of one section, compared with what was saved. */
export function useDraft<T>(saved: T) {
  const [draft, setDraft] = React.useState<T>(saved);
  const savedKey = JSON.stringify(saved);
  const [base, setBase] = React.useState(savedKey);
  // A new saved value (after Save, or a refetch) starts a fresh draft.
  if (base !== savedKey) {
    setBase(savedKey);
    setDraft(saved);
  }
  const dirty = JSON.stringify(draft) !== savedKey;
  return { draft, setDraft, dirty, reset: () => setDraft(saved) };
}

export interface SectionSave {
  status: ReturnType<typeof useAsyncAction>['status'];
  fieldErrors: Record<string, string[]>;
  errorCode: ErrorCode | null;
  save: (run: () => Promise<unknown>) => Promise<boolean>;
  clear: () => void;
}

/** Runs one Save: the spinner and check, the toast, and the server's field errors. */
export function useSectionSave(sectionLabel: string): SectionSave {
  const action = useAsyncAction();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [errorCode, setErrorCode] = React.useState<ErrorCode | null>(null);
  return {
    status: action.status,
    fieldErrors,
    errorCode,
    clear: () => {
      setFieldErrors({});
      setErrorCode(null);
    },
    save: async (run) => {
      setFieldErrors({});
      setErrorCode(null);
      try {
        await action.run(run);
        notify({ title: W.savedToast(sectionLabel), tone: 'success' });
        return true;
      } catch (err) {
        if (err instanceof ApiRequestError && err.apiError.fieldErrors)
          setFieldErrors(err.apiError.fieldErrors);
        const code = errorCodeOf(err);
        setErrorCode(code);
        notify({ title: errorWords(code), tone: 'error' });
        return false;
      }
    },
  };
}

/**
 * The Save bar (DiceUI Action Bar, like the Stamp card) and the leave guard: it shows while there are
 * changes, sits above the phone dock, and asks before the owner leaves with unsaved changes.
 */
export function SaveBar({
  dirty,
  valid,
  status,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  valid: boolean;
  status: SectionSave['status'];
  onSave: () => void;
  onDiscard: () => void;
}) {
  const online = useOnlineStatus();
  const dockClearance = useDockClearance();
  // The bar stays up while the check shows after a save.
  const open = dirty || status === 'success' || status === 'loading';
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: () => dirty,
    withResolver: true,
  });

  return (
    <>
      <ActionBar
        open={open}
        onOpenChange={() => undefined}
        side="bottom"
        sideOffset={dockClearance}
        className="w-11/12 max-w-xl items-center gap-2 border-border/80 bg-card px-3 py-2 text-card-foreground shadow-xl"
      >
        <ActionBarSelection className="border-0 px-0 font-semibold whitespace-nowrap">
          {online ? W.unsaved : W.offlineSave}
        </ActionBarSelection>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-11 md:h-9"
            disabled={!dirty || status === 'loading'}
            onClick={onDiscard}
          >
            {W.discard}
          </Button>
          <AsyncButton
            status={status}
            busyLabel={W.saving}
            doneLabel={W.saved}
            disabled={!dirty || !valid || !online}
            className="h-11 font-semibold md:h-9"
            onClick={onSave}
          >
            {W.save}
          </AsyncButton>
        </div>
      </ActionBar>
      <AlertDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(next) => {
          if (!next && blocker.status === 'blocked') blocker.reset();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{W.leaveTitle}</AlertDialogTitle>
            <AlertDialogDescription>{W.leaveBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>{W.keepEditing}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => blocker.proceed?.()}>
              {W.leave}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** A field error from the server, worded by the screen (never the message text). */
export function serverError(
  fieldErrors: Record<string, string[]>,
  key: string,
  word: string,
): string | undefined {
  return fieldErrors[key]?.length ? word : undefined;
}
