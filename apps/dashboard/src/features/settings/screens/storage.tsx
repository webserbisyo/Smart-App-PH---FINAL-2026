import * as React from 'react';
import {
  ArchiveIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CloudOffIcon,
  DownloadIcon,
  FileArchiveIcon,
  ImageUpIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SplitIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react';
import {
  EXPORT_RANGES,
  UPLOAD_ACCEPT,
  errorWords,
  formatStorage,
  settingsWords,
  storageLevel,
  storagePercent,
  type CleanupKind,
  type CreateExportInput,
  type DataExport,
  type ExportRange,
  type StorageKind,
  type StorageLevel,
  type StorageSummary,
} from '@smartapp/core';
import {
  errorCodeOf,
  prepareImage,
  useCleanupPreview,
  useCreateExport,
  useRunCleanup,
  useStorage,
} from '@smartapp/data';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { FileUpload, FileUploadTrigger } from '@smartapp/ui/components/file-upload';
import {
  Gauge,
  GaugeIndicator,
  GaugeRange,
  GaugeTrack,
  GaugeValueText,
} from '@smartapp/ui/components/gauge';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
} from '@smartapp/ui/components/reui/stepper';
import { Separator } from '@smartapp/ui/components/separator';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Spinner } from '@smartapp/ui/components/spinner';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import {
  CompareDialog,
  ShrinkLine,
  uploadProblemText,
  type UploadedImage,
} from '@/app/image-upload-row';
import { Notice } from '@/app/notice';
import { PageError } from '@/app/page-state';
import { useOnlineStatus } from '@/app/use-online-status';
import { SettingsCard, SettingsPage, SettingsSkeleton } from '../settings-ui.js';

const W = settingsWords.storage;
// Menu photos keep 1080 px on the longest side (T65); the try-out uses the same step.
const MENU_SIDE = 1080;

const KIND_DOT: Record<StorageKind, string> = {
  menu: 'bg-chart-1',
  proofs: 'bg-chart-2',
  look: 'bg-chart-3',
  qr: 'bg-chart-4',
  profile: 'bg-chart-5',
};
const UNUSED_DOT = 'bg-muted-foreground/40';

const LEVEL_RANGE: Record<StorageLevel, string> = {
  ok: 'text-primary',
  high: 'text-warning',
  almost: 'text-destructive',
  full: 'text-destructive',
};
const LEVEL_LINE: Record<StorageLevel, string> = {
  ok: W.lineOk,
  high: W.lineHigh,
  almost: W.lineAlmost,
  full: W.lineFull,
};

const CLEANUP_ICON: Record<CleanupKind, React.ReactNode> = {
  old_proofs: <ReceiptIcon />,
  archived_photos: <ArchiveIcon />,
  exported_proofs: <FileArchiveIcon />,
};

export function StorageSettingsScreen() {
  const storage = useStorage();
  if (storage.isPending) return <SettingsSkeleton />;
  if (storage.isError || !storage.data)
    return (
      <PageError
        title={W.errorTitle}
        message={errorWords(errorCodeOf(storage.error))}
        retryLabel={settingsWords.tryAgain}
        onRetry={() => void storage.refetch()}
      />
    );
  return <StorageView summary={storage.data} />;
}

function StorageView({ summary }: { summary: StorageSummary }) {
  const [confirm, setConfirm] = React.useState<CleanupKind | null>(null);
  const exportRef = React.useRef<HTMLDivElement>(null);
  const level = storageLevel(summary.usedBytes, summary.limitBytes);

  const goToExport = () => {
    setConfirm(null);
    exportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <SettingsPage id="storage">
      {level === 'full' || level === 'almost' ? (
        <Notice
          tone={level === 'full' ? 'error' : 'warning'}
          icon={
            level === 'full' ? (
              <CloudOffIcon className="size-4" />
            ) : (
              <TriangleAlertIcon className="size-4" />
            )
          }
        >
          {LEVEL_LINE[level]}
        </Notice>
      ) : null}

      <Meter summary={summary} level={level} />
      <Cleanups summary={summary} onClean={setConfirm} />
      <div ref={exportRef} className="scroll-mt-4">
        <SaveCopy lastExport={summary.lastExport} onClean={() => setConfirm('exported_proofs')} />
      </div>
      <TryUpload />

      <CleanupConfirm kind={confirm} onClose={() => setConfirm(null)} onSaveCopy={goToExport} />
    </SettingsPage>
  );
}

// ---------- the meter ----------

function Meter({ summary, level }: { summary: StorageSummary; level: StorageLevel }) {
  const percent = storagePercent(summary.usedBytes, summary.limitBytes);
  const used = formatStorage(summary.usedBytes);
  const limit = formatStorage(summary.limitBytes);
  const free = formatStorage(Math.max(0, summary.limitBytes - summary.usedBytes));
  // Segments are shares of the whole 500 MB, so the empty part of the bar is the free space.
  const whole = Math.max(summary.limitBytes, summary.usedBytes);
  const share = (bytes: number) => `${Math.max(0, (bytes / whole) * 100).toFixed(2)}%`;
  const rows = [
    ...summary.kinds.map((k) => ({
      key: k.kind,
      dot: KIND_DOT[k.kind],
      label: W.kinds[k.kind],
      help: W.kindHelp[k.kind],
      bytes: k.bytes,
      files: k.files,
    })),
    ...(summary.unusedUploads.bytes > 0
      ? [
          {
            key: 'unused',
            dot: UNUSED_DOT,
            label: W.unused,
            help: undefined,
            bytes: summary.unusedUploads.bytes,
            files: summary.unusedUploads.files,
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Gauge
            value={percent}
            max={100}
            size={152}
            thickness={12}
            startAngle={-120}
            endAngle={120}
            aria-label={W.meterLabel(used, limit)}
            getValueText={() => used}
          >
            <GaugeIndicator>
              <GaugeTrack />
              <GaugeRange
                className={cn(
                  'transition-all duration-300 motion-reduce:transition-none',
                  LEVEL_RANGE[level],
                )}
              />
            </GaugeIndicator>
            <GaugeValueText className="flex-col gap-0">
              <span className="text-xl font-bold text-foreground tabular-nums">{used}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{W.usedOf(limit)}</span>
            </GaugeValueText>
          </Gauge>
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-center sm:text-left">
            <span className="text-lg font-semibold text-foreground tabular-nums">
              {W.free(free)}
            </span>
            {level === 'ok' || level === 'high' ? (
              <span
                className={cn(
                  'text-sm',
                  level === 'high' ? 'font-medium text-warning-text' : 'text-muted-foreground',
                )}
              >
                {LEVEL_LINE[level]}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={W.meterLabel(used, limit)}
        >
          {rows.map((row) =>
            row.bytes > 0 ? (
              <span
                key={row.key}
                style={cssVars({ '--share': share(row.bytes) })}
                className={cn(
                  'h-full w-(--share) border-r border-card transition-all duration-300 last:border-r-0 motion-reduce:transition-none',
                  row.dot,
                )}
              />
            ) : null,
          )}
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.key} className="flex items-start gap-2.5">
              <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', row.dot)} aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatStorage(row.bytes)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {W.files(row.files)}
                  {row.help ? ` · ${row.help}` : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---------- clean up ----------

function Cleanups({
  summary,
  onClean,
}: {
  summary: StorageSummary;
  onClean: (kind: CleanupKind) => void;
}) {
  const online = useOnlineStatus();
  return (
    <SettingsCard title={W.cleanupCard} description={W.cleanupLine}>
      <ul className="flex flex-col">
        {summary.cleanups.map((offer, index) => (
          <li key={offer.kind} className="flex flex-col">
            {index > 0 ? <Separator className="my-3" /> : null}
            <div className="flex min-h-11 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
                {CLEANUP_ICON[offer.kind]}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  {W.cleanups[offer.kind]}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {W.cleanupHelp[offer.kind](offer.files, formatStorage(offer.bytes))}
                </span>
              </div>
              {offer.files > 0 ? (
                <Button
                  variant="outline"
                  className="h-11 shrink-0 text-destructive-text md:h-9"
                  disabled={!online}
                  onClick={() => onClean(offer.kind)}
                >
                  <Trash2Icon />
                  {W.cleanupButton[offer.kind]}
                </Button>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-success-text">
                  <CircleCheckIcon className="size-4" aria-hidden />
                  {W.nothingToClean}
                </span>
              )}
            </div>
          </li>
        ))}
        <li className="flex flex-col">
          <Separator className="my-3" />
          <div className="flex min-h-11 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
              <SparklesIcon />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{W.unused}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {W.unusedHelp(formatStorage(summary.unusedUploads.bytes))}
              </span>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {W.automatic}
            </Badge>
          </div>
        </li>
      </ul>
      <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0 text-success-text" aria-hidden />
        {W.autoDelete(summary.proofDays)}
      </p>
    </SettingsCard>
  );
}

/** Asks before any delete, from a fresh list of what would go (T66). */
function CleanupConfirm({
  kind,
  onClose,
  onSaveCopy,
}: {
  kind: CleanupKind | null;
  onClose: () => void;
  onSaveCopy: () => void;
}) {
  const preview = useCleanupPreview(kind);
  const run = useRunCleanup();
  const action = useAsyncAction();
  const online = useOnlineStatus();
  // Keep the last kind while the dialog closes, so its words don't jump.
  const [shown, setShown] = React.useState<CleanupKind>('old_proofs');
  if (kind && kind !== shown) setShown(kind);
  const data = preview.data;
  const isProofs = shown !== 'archived_photos';

  const onConfirm = async () => {
    if (!kind || !data) return;
    try {
      const freed = data.bytes;
      await action.run(() => run.mutateAsync({ kind, token: data.token }));
      notify({ title: W.cleaned(formatStorage(freed)), tone: 'success' });
      onClose();
    } catch (err) {
      const code = errorCodeOf(err);
      notify({ title: errorWords(code), tone: 'error' });
      // The list changed since it was read: read it again so the owner sees the new count.
      if (code === 'cleanup_changed') void preview.refetch();
    }
  };

  return (
    <AlertDialog
      open={kind !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          {data ? (
            <>
              <AlertDialogTitle>{W.confirmTitle[shown](data.files)}</AlertDialogTitle>
              <AlertDialogDescription>
                {W.confirmBody[shown](data.files, formatStorage(data.bytes))}
              </AlertDialogDescription>
            </>
          ) : (
            <>
              <AlertDialogTitle>{W.cleanups[shown]}</AlertDialogTitle>
              <Skeleton className="h-4 w-full" aria-busy />
            </>
          )}
        </AlertDialogHeader>
        {data && isProofs ? (
          <Notice
            tone={data.savedCopy ? 'info' : 'warning'}
            icon={
              data.savedCopy ? (
                <ShieldCheckIcon className="size-4" />
              ) : (
                <TriangleAlertIcon className="size-4" />
              )
            }
          >
            {data.savedCopy ? W.hasCopy : W.noCopy}
          </Notice>
        ) : null}
        {preview.isError ? (
          <p role="alert" className="text-sm text-destructive-text">
            {errorWords(errorCodeOf(preview.error))}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 md:h-9">{W.cancel}</AlertDialogCancel>
          {data && isProofs && !data.savedCopy ? (
            <Button variant="outline" className="h-11 md:h-9" onClick={onSaveCopy}>
              <DownloadIcon />
              {W.saveCopyFirst}
            </Button>
          ) : null}
          <AsyncButton
            variant="destructive"
            status={action.status}
            busyLabel={W.cleanupButton[shown]}
            doneLabel={W.cleanupButton[shown]}
            disabled={!data || data.files === 0 || !online}
            className="h-11 font-semibold md:h-9"
            onClick={() => void onConfirm()}
          >
            {data ? W.confirm[shown](data.files) : W.cleanupButton[shown]}
          </AsyncButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------- save a copy ----------

type CopyPhase = 'auto' | 'pick' | 'clean' | 'kept';

function stepOf(phase: CopyPhase, last: DataExport | null): number {
  if (phase === 'pick' || !last) return 1;
  if (last.status === 'preparing') return 2;
  if (last.status === 'ready') return phase === 'clean' ? 4 : 3;
  return 1;
}

function SaveCopy({ lastExport, onClean }: { lastExport: DataExport | null; onClean: () => void }) {
  const [phase, setPhase] = React.useState<CopyPhase>('auto');
  const step = stepOf(phase, lastExport);
  const steps = [W.steps.pick, W.steps.prepare, W.steps.download, W.steps.clean];

  return (
    <SettingsCard title={W.exportCard} description={W.exportLine}>
      <Stepper
        value={step}
        indicators={{
          completed: <CircleCheckIcon className="size-3.5" />,
          loading: <Spinner className="size-3.5" />,
        }}
        className="w-full"
      >
        <StepperNav>
          {steps.map((label, index) => (
            <StepperItem
              key={label}
              step={index + 1}
              loading={index + 1 === 2 && step === 2}
              completed={index + 1 < step || (index + 1 === 4 && phase === 'kept')}
              className="relative"
            >
              <div className="flex flex-col items-center gap-1.5">
                <StepperIndicator className="size-7 state-completed:bg-success state-completed:text-success-foreground">
                  {index + 1}
                </StepperIndicator>
                <StepperTitle
                  className={cn(
                    'text-xs whitespace-nowrap',
                    index + 1 === step ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </StepperTitle>
              </div>
              {index < steps.length - 1 ? (
                <StepperSeparator
                  className={cn('mx-1 mb-5 w-full', index + 1 < step && 'bg-success')}
                />
              ) : null}
            </StepperItem>
          ))}
        </StepperNav>
      </Stepper>

      {step === 1 ? (
        <PickStep last={phase === 'auto' ? lastExport : null} onMade={() => setPhase('auto')} />
      ) : null}
      {step === 2 ? (
        <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4" aria-live="polite">
          <Spinner className="mt-0.5 size-5 text-primary" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">{W.preparing}</span>
            <span className="text-xs text-muted-foreground">{W.preparingLine}</span>
          </div>
        </div>
      ) : null}
      {(step === 3 || step === 4) && lastExport ? (
        <ReadyStep
          last={lastExport}
          cleaning={step === 4}
          onDownloaded={() => {
            if (lastExport.parts.proofs && lastExport.proofFiles > 0 && phase !== 'kept')
              setPhase('clean');
          }}
          onClean={onClean}
          onKeep={() => setPhase('kept')}
          onAnother={() => setPhase('pick')}
        />
      ) : null}
    </SettingsCard>
  );
}

function PickStep({ last, onMade }: { last: DataExport | null; onMade: () => void }) {
  const create = useCreateExport();
  const action = useAsyncAction();
  const online = useOnlineStatus();
  const [range, setRange] = React.useState<ExportRange>('last_month');
  const [parts, setParts] = React.useState<CreateExportInput['parts']>({
    orders: true,
    payments: true,
    proofs: true,
  });
  const none = !parts.orders && !parts.payments && !parts.proofs;

  const onMake = async () => {
    if (none) return;
    try {
      await action.run(() => create.mutateAsync({ range, parts }));
      onMade();
    } catch (err) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {last?.status === 'failed' ? (
        <Notice tone="error" icon={<CircleAlertIcon className="size-4" />}>
          {W.failed}
        </Notice>
      ) : null}
      {last?.status === 'expired' ? (
        <Notice tone="warning" icon={<CircleAlertIcon className="size-4" />}>
          {W.expired}
        </Notice>
      ) : null}
      <div className="flex flex-col gap-2">
        <span id="export-range" className="text-sm font-medium text-foreground">
          {W.dates}
        </span>
        <ToggleGroup
          aria-labelledby="export-range"
          value={[range]}
          onValueChange={(value) => {
            const next = EXPORT_RANGES.find((r) => r === value[0]);
            if (next) setRange(next);
          }}
          className="grid w-full grid-cols-3"
        >
          {EXPORT_RANGES.map((r) => (
            <ToggleGroupItem key={r} value={r} className="h-11 md:h-9">
              {W.ranges[r]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-1">
        {(['orders', 'payments', 'proofs'] as const).map((part) => (
          <label
            key={part}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-sm text-foreground"
          >
            <Checkbox
              checked={parts[part]}
              onCheckedChange={(checked) => setParts((p) => ({ ...p, [part]: checked === true }))}
            />
            {W.parts[part]}
          </label>
        ))}
        {none ? (
          <p role="alert" className="text-xs font-medium text-destructive-text">
            {W.pickOne}
          </p>
        ) : null}
      </div>
      <div className="flex justify-end">
        <AsyncButton
          status={action.status}
          busyLabel={W.preparing}
          doneLabel={W.make}
          disabled={none || !online}
          className="h-11 font-semibold md:h-9"
          onClick={() => void onMake()}
        >
          <FileArchiveIcon />
          {W.make}
        </AsyncButton>
      </div>
    </div>
  );
}

function ReadyStep({
  last,
  cleaning,
  onDownloaded,
  onClean,
  onKeep,
  onAnother,
}: {
  last: DataExport;
  cleaning: boolean;
  onDownloaded: () => void;
  onClean: () => void;
  onKeep: () => void;
  onAnother: () => void;
}) {
  const preview = useCleanupPreview(cleaning ? 'exported_proofs' : null);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success-soft p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-success-text">
            <FileArchiveIcon className="size-4" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold text-foreground">{last.fileName}</span>
            <span className="text-xs text-success-text tabular-nums">
              {W.readyLine(last.orderRows, last.proofFiles, formatStorage(last.bytes ?? 0))}
            </span>
          </div>
        </div>
        {last.url ? (
          <Button
            nativeButton={false}
            className="h-11 shrink-0 font-semibold md:h-9"
            render={<a href={last.url} download={last.fileName} />}
            onClick={() => {
              notify({ title: W.downloaded, tone: 'success' });
              onDownloaded();
            }}
          >
            <DownloadIcon />
            {W.download}
          </Button>
        ) : null}
      </div>

      {cleaning ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <span className="text-sm font-semibold text-foreground">{W.cleanTitle}</span>
          {preview.data ? (
            preview.data.files > 0 ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {W.cleanLine(preview.data.files, formatStorage(preview.data.bytes))}
                </span>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" className="h-11 md:h-9" onClick={onKeep}>
                    {W.keepThem}
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-11 font-semibold md:h-9"
                    onClick={onClean}
                  >
                    <Trash2Icon />
                    {W.cleanNow}
                  </Button>
                </div>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-sm font-medium text-success-text">
                <CircleCheckIcon className="size-4" aria-hidden />
                {W.nothingToClean}
              </span>
            )
          ) : (
            <Skeleton className="h-4 w-3/4" />
          )}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button variant="ghost" className="h-11 md:h-9" onClick={onAnother}>
          {W.newExport}
        </Button>
      </div>
    </div>
  );
}

// ---------- try a photo ----------

/** Runs the shared shrink step on a photo without saving it, to show what an upload would use. */
function TryUpload() {
  const [busy, setBusy] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<UploadedImage | null>(null);
  const [compareOpen, setCompareOpen] = React.useState(false);

  // Free the local copies when a new photo replaces them or the page closes.
  React.useEffect(
    () => () => {
      if (result) {
        URL.revokeObjectURL(result.preview);
        URL.revokeObjectURL(result.original);
      }
    },
    [result],
  );

  const onFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setProblem(null);
    setBusy(true);
    const prepared = await prepareImage(file, { maxSide: MENU_SIDE, quality: 0.8 });
    setBusy(false);
    if (!prepared.ok) {
      setProblem(uploadProblemText(prepared));
      return;
    }
    setResult({
      ref: '',
      preview: URL.createObjectURL(prepared.image.blob),
      image: prepared.image,
      original: URL.createObjectURL(file),
    });
  };

  return (
    <SettingsCard title={W.tryTitle} description={W.tryLine}>
      <FileUpload
        accept={UPLOAD_ACCEPT}
        maxFiles={1}
        label={W.tryTitle}
        disabled={busy}
        onAccept={(files) => void onFiles(files)}
        className="gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground">
            {busy ? (
              <Spinner className="size-5" />
            ) : result ? (
              <img src={result.preview} alt="" className="size-full object-cover" />
            ) : (
              <ImageUpIcon className="size-6" aria-hidden />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {busy ? (
              <span className="text-sm text-muted-foreground" aria-live="polite">
                {settingsWords.upload.shrinking}
              </span>
            ) : result ? (
              <ShrinkLine image={result.image} className="text-sm" />
            ) : (
              <span className="text-xs text-muted-foreground">{settingsWords.upload.dropHint}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <FileUploadTrigger
            render={<Button type="button" variant="outline" className="h-11 md:h-9" />}
          >
            <ImageUpIcon />
            {result ? settingsWords.upload.replace : settingsWords.upload.pick}
          </FileUploadTrigger>
          {result ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 md:h-9"
              onClick={() => setCompareOpen(true)}
            >
              <SplitIcon />
              {settingsWords.upload.compare}
            </Button>
          ) : null}
        </div>
        {problem ? (
          <p
            role="alert"
            className="flex items-start gap-1.5 text-xs font-medium text-destructive-text"
          >
            <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {problem}
          </p>
        ) : null}
      </FileUpload>
      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} upload={result} />
    </SettingsCard>
  );
}
