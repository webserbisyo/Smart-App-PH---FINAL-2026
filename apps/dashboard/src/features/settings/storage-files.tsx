import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileQuestionIcon,
  ImageIcon,
  LockIcon,
  PaletteIcon,
  QrCodeIcon,
  ReceiptIcon,
  Trash2Icon,
  UserIcon,
  UtensilsIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  FILE_RANGES,
  FILE_SORTS,
  STORAGE_FOLDERS,
  errorWords,
  fileInRange,
  formatManila,
  formatPeso,
  formatStorage,
  settingsWords,
  sortFiles,
  type FileRange,
  type FileSort,
  type StorageFolder,
  type StorageSummary,
  type StoredFile,
} from '@smartapp/core';
import {
  errorCodeOf,
  useDeleteStoredFiles,
  useDownloadStoredFiles,
  useStoredFiles,
} from '@smartapp/data';
import {
  ActionBar,
  ActionBarClose,
  ActionBarGroup,
  ActionBarItem,
  ActionBarSelection,
} from '@smartapp/ui/components/action-bar';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@smartapp/ui/components/attachment';
import { Button } from '@smartapp/ui/components/button';
import { Calendar } from '@smartapp/ui/components/calendar';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@smartapp/ui/components/empty';
import { NativeSelect, NativeSelectOption } from '@smartapp/ui/components/native-select';
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
import {
  DataGrid,
  DataGridTable,
  dataGridFeatures,
  useTable,
  type ColumnDef,
  type DataGridFeatures,
} from '@smartapp/ui/components/reui/data-grid/index';
import { Scroller } from '@smartapp/ui/components/scroller';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { cn } from 'cn';
import { GRID_ALL_ROWS } from '@/app/grid-pager';
import { orderPhotoSrc } from '@/app/orders/order-photo';
import { PageError } from '@/app/page-state';
import { useDockClearance } from '@/app/use-dock-clearance';

const W = settingsWords.storage.browse;
// Files show a page at a time; Show more adds the next.
const PAGE = 60;

const FOLDER_ICON: Record<StorageFolder, LucideIcon> = {
  menu: UtensilsIcon,
  proofs: ReceiptIcon,
  look: PaletteIcon,
  qr: QrCodeIcon,
  profile: UserIcon,
  unused: FileQuestionIcon,
};

/** The folders with their files and sizes; one opens its files (T93). */
export function StorageFiles({ summary }: { summary: StorageSummary }) {
  const [folder, setFolder] = React.useState<StorageFolder | null>(null);
  if (folder) return <FolderView folder={folder} onBack={() => setFolder(null)} />;
  const sizes = (f: StorageFolder) =>
    f === 'unused'
      ? summary.unusedUploads
      : (summary.kinds.find((k) => k.kind === f) ?? { files: 0, bytes: 0 });
  return (
    <nav aria-label={W.foldersLabel}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {STORAGE_FOLDERS.map((f) => {
          const Icon = FOLDER_ICON[f];
          const { files, bytes } = sizes(f);
          return (
            <li key={f}>
              <button
                type="button"
                data-slot="storage-folder"
                onClick={() => setFolder(f)}
                className="flex min-h-16 w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left shadow-xs transition-colors duration-fast hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{W.folders[f]}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {W.folderLine(settingsWords.storage.files(files), formatStorage(bytes))}
                  </span>
                </span>
                <ChevronRightIcon aria-hidden="true" className="size-4 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** "2026-11-15" from a picked calendar day (the owner's own phone day). */
function dayOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type Picked = { from: Date; to: Date | undefined } | undefined;

function FolderView({ folder, onBack }: { folder: StorageFolder; onBack: () => void }) {
  const files = useStoredFiles(folder);
  const remove = useDeleteStoredFiles();
  const download = useDownloadStoredFiles();
  const phone = useFormFactor() === 'phone';
  const dock = useDockClearance();
  const [range, setRange] = React.useState<FileRange>('all');
  const [days, setDays] = React.useState<Picked>(undefined);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [sort, setSort] = React.useState<FileSort>('newest');
  const [limit, setLimit] = React.useState(PAGE);
  const [picked, setPicked] = React.useState<ReadonlySet<string>>(new Set());
  // The files the confirm deletes, kept as they were when it opened.
  const [confirm, setConfirm] = React.useState<StoredFile[] | null>(null);
  const now = React.useMemo(() => new Date(), []);
  const action = useAsyncAction();

  const all = React.useMemo(() => files.data?.files ?? [], [files.data]);
  const pickedDays = React.useMemo(
    () => (days ? { from: dayOf(days.from), to: dayOf(days.to ?? days.from) } : null),
    [days],
  );
  const shown = React.useMemo(
    () =>
      sortFiles(
        all.filter((f) => fileInRange(f.uploadedAt, range, now, pickedDays)),
        sort,
      ),
    [all, range, now, pickedDays, sort],
  );
  const page = shown.slice(0, limit);
  // Tick all takes the free files on screen, so a bulk delete stays a size the owner has seen.
  const freeOnes = page.filter((f) => f.lock === null);
  const chosen = all.filter((f) => picked.has(f.id));
  const chosenBytes = chosen.reduce((total, f) => total + f.bytes, 0);
  const allPicked = freeOnes.length > 0 && freeOnes.every((f) => picked.has(f.id));

  const toggle = (id: string) =>
    setPicked((now) => {
      const next = new Set(now);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pickAll = (on: boolean) => setPicked(on ? new Set(freeOnes.map((f) => f.id)) : new Set());
  const chooseRange = (next: FileRange) => {
    setRange(next);
    setLimit(PAGE);
    setPicked(new Set());
    if (next === 'pick') setPickerOpen(true);
  };

  const confirmBytes = (confirm ?? []).reduce((total, f) => total + f.bytes, 0);
  const runDelete = async () => {
    if (!confirm) return;
    const ids = confirm.map((f) => f.id);
    try {
      // The API takes up to 500 at a time.
      await action.run(async () => {
        for (let i = 0; i < ids.length; i += 500)
          await remove.mutateAsync({ ids: ids.slice(i, i + 500) });
      });
      notify({ title: W.deleted(ids.length, formatStorage(confirmBytes)), tone: 'success' });
      setPicked(new Set());
      setConfirm(null);
    } catch (error) {
      notify({ title: errorWords(errorCodeOf(error)), tone: 'error' });
    }
  };

  const runDownload = async () => {
    const ids = chosen.map((f) => f.id);
    try {
      // One zip per 500 files, the API's limit.
      let saved = 0;
      for (let i = 0; i < ids.length; i += 500) {
        const zip = await download.mutateAsync({ ids: ids.slice(i, i + 500) });
        const link = document.createElement('a');
        link.href = zip.url;
        link.download = zip.fileName;
        link.click();
        saved += zip.files;
      }
      notify({ title: W.downloaded(saved), tone: 'success' });
    } catch (error) {
      notify({ title: errorWords(errorCodeOf(error)), tone: 'error' });
    }
  };

  return (
    <section aria-label={W.folders[folder]} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          className="-ml-2 h-11 gap-1 px-2 md:h-9"
          onClick={onBack}
        >
          <ChevronLeftIcon aria-hidden="true" />
          {W.allFolders}
        </Button>
      </div>
      <h3 className="text-lg font-semibold">{W.folders[folder]}</h3>

      <div className="flex flex-col gap-2">
        <Scroller orientation="horizontal" hideScrollbar className="-mx-1 px-1">
          <ToggleGroup
            aria-label={W.rangesLabel}
            value={[range]}
            onValueChange={(value) => {
              const next = FILE_RANGES.find((r) => r === value[0]);
              if (next) chooseRange(next);
            }}
            spacing={1}
            className="w-max gap-2 py-1"
          >
            {FILE_RANGES.map((r) => (
              <ToggleGroupItem
                key={r}
                value={r}
                variant="outline"
                className="h-11 shrink-0 rounded-full px-3.5 text-sm aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary md:h-8"
              >
                {r === 'pick' ? <CalendarIcon aria-hidden="true" /> : null}
                {r === 'pick' && pickedDays
                  ? W.pickedRange(
                      formatManila(`${pickedDays.from}T04:00:00Z`, 'date'),
                      formatManila(`${pickedDays.to}T04:00:00Z`, 'date'),
                    )
                  : W.ranges[r]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Scroller>
        {range === 'pick' ? (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger
              render={
                <Button type="button" variant="outline" className="h-11 gap-2 self-start md:h-9" />
              }
            >
              <CalendarIcon aria-hidden="true" />
              {W.ranges.pick}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="range"
                selected={days}
                onSelect={(next) => {
                  setDays(next?.from ? { from: next.from, to: next.to } : undefined);
                  setLimit(PAGE);
                  setPicked(new Set());
                }}
                disabled={{ after: now }}
                defaultMonth={days?.from ?? now}
              />
            </PopoverContent>
          </Popover>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground tabular-nums">
            {W.shown(shown.length, formatStorage(shown.reduce((t, f) => t + f.bytes, 0)))}
          </p>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="sr-only">{W.sortLabel}</span>
            <NativeSelect
              value={sort}
              onChange={(event) => {
                const next = FILE_SORTS.find((s) => s === event.target.value);
                if (next) setSort(next);
              }}
              className="h-11 md:h-9"
            >
              {FILE_SORTS.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {W.sorts[s]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        </div>
        {freeOnes.length > 0 ? (
          <label className="flex min-h-11 items-center gap-2.5 self-start text-sm font-medium md:min-h-9">
            <Checkbox checked={allPicked} onCheckedChange={(on) => pickAll(on === true)} />
            {W.pickAll}
          </label>
        ) : null}
        <p className="text-xs text-muted-foreground">{W.dateNote}</p>
      </div>

      {files.isPending ? (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl md:aspect-auto md:h-14" />
          ))}
        </div>
      ) : files.isError ? (
        <PageError
          title={W.errorTitle}
          message={errorWords(errorCodeOf(files.error))}
          retryLabel={settingsWords.tryAgain}
          onRetry={() => void files.refetch()}
        />
      ) : shown.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{all.length === 0 ? W.emptyFolder : W.emptyRange}</EmptyTitle>
          </EmptyHeader>
          {all.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => chooseRange('all')}
            >
              {W.showAll}
            </Button>
          ) : null}
        </Empty>
      ) : phone ? (
        <FileTiles files={page} picked={picked} onToggle={toggle} />
      ) : (
        <FileGrid files={page} picked={picked} onToggle={toggle} />
      )}

      {shown.length > limit ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 self-center md:h-9"
          onClick={() => setLimit((n) => n + PAGE)}
        >
          {W.showMore(Math.min(PAGE, shown.length - limit))}
        </Button>
      ) : null}

      <ActionBar
        open={chosen.length > 0}
        onOpenChange={(open) => {
          if (!open) setPicked(new Set());
        }}
        side="bottom"
        sideOffset={dock}
        data-bulk-bar=""
        className="w-11/12 max-w-xl gap-2 border-border/80 bg-card px-2 py-2 text-card-foreground shadow-xl md:w-auto md:px-3"
      >
        <ActionBarSelection className="rounded-md border-primary/20 bg-primary/10 px-2.5 py-1 font-semibold whitespace-nowrap text-primary tabular-nums">
          {W.picked(chosen.length, formatStorage(chosenBytes))}
        </ActionBarSelection>
        <ActionBarGroup className="flex items-center gap-1.5">
          <ActionBarItem
            variant="secondary"
            size="sm"
            className="h-11 md:h-9"
            disabled={download.isPending}
            onClick={() => void runDownload()}
          >
            <DownloadIcon aria-hidden="true" />
            {download.isPending ? W.downloading : W.download}
          </ActionBarItem>
          <ActionBarItem
            variant="destructive"
            size="sm"
            className="h-11 md:h-9"
            onClick={() => setConfirm(chosen)}
          >
            <Trash2Icon aria-hidden="true" />
            {W.delete}
          </ActionBarItem>
        </ActionBarGroup>
        <ActionBarClose
          className="ml-auto flex size-11 items-center justify-center rounded-md hover:bg-muted md:size-9"
          aria-label={W.clearPicks}
        >
          <XIcon className="size-4" />
        </ActionBarClose>
      </ActionBar>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{W.deleteTitle(confirm?.length ?? 0)}</AlertDialogTitle>
            <AlertDialogDescription>
              {folder === 'proofs'
                ? W.deleteProofsBody(formatStorage(confirmBytes))
                : W.deleteBody(formatStorage(confirmBytes))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">
              {settingsWords.storage.cancel}
            </AlertDialogCancel>
            <AsyncButton
              variant="destructive"
              status={action.status}
              busyLabel={W.deleteConfirm}
              doneLabel={W.deleteConfirm}
              className="h-11 font-semibold md:h-9"
              onClick={() => void runDelete()}
            >
              {W.deleteConfirm}
            </AsyncButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** Where a file is used, as a link the owner can follow to remove it there; null when nothing uses it. */
function WhereLink({
  file,
  className,
  children,
  ...props
}: {
  file: StoredFile;
  className?: string | undefined;
  children: React.ReactNode;
  'aria-label'?: string | undefined;
}) {
  const use = file.usedBy;
  if (!use) return null;
  switch (use.kind) {
    case 'item':
      return (
        <Link to="/catalog/$itemId" params={{ itemId: use.id }} className={className} {...props}>
          {children}
        </Link>
      );
    case 'order':
      return (
        <Link to="/orders/$orderId" params={{ orderId: use.id }} className={className} {...props}>
          {children}
        </Link>
      );
    case 'category':
      return (
        <Link to="/catalog/categories" className={className} {...props}>
          {children}
        </Link>
      );
    case 'logo':
    case 'banner':
      return (
        <Link to="/editor" className={className} {...props}>
          {children}
        </Link>
      );
    case 'qr':
      return (
        <Link to="/settings/payments" className={className} {...props}>
          {children}
        </Link>
      );
    case 'avatar':
      return (
        <Link to="/settings/account" className={className} {...props}>
          {children}
        </Link>
      );
  }
}

function whereLine(file: StoredFile): string | null {
  const use = file.usedBy;
  if (!use) return null;
  return W.usedBy[use.kind](use.label);
}

function fileTitle(file: StoredFile): string {
  return file.folder === 'proofs' && file.usedBy ? W.proofName(file.usedBy.label) : file.name;
}

function FileThumb({ file, className }: { file: StoredFile; className?: string }) {
  const src = orderPhotoSrc(file.ref, 160);
  const Icon = FOLDER_ICON[file.folder];
  return src ? (
    <img src={src} alt="" loading="lazy" decoding="async" className={className} />
  ) : (
    <Icon aria-hidden="true" />
  );
}

/** Phones: tiles 3 across; a free file ticks, a locked one opens where it is used. */
function FileTiles({
  files,
  picked,
  onToggle,
}: {
  files: StoredFile[];
  picked: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {files.map((file) => {
        const on = picked.has(file.id);
        const tile = (
          <Attachment
            orientation="vertical"
            className={cn(
              // The tile fills its column (the vertical attachment is a fixed width).
              'w-full! min-w-0',
              on && 'border-primary ring-2 ring-primary',
            )}
          >
            <AttachmentMedia variant={file.ref ? 'image' : 'icon'}>
              <FileThumb file={file} />
              {file.lock ? (
                <span className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-xs">
                  <LockIcon aria-hidden="true" className="size-3.5" />
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-1 left-1 flex size-5 items-center justify-center rounded-md border-2 border-border bg-card/90 shadow-xs',
                    on && 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {on ? <CheckIcon className="size-3.5" /> : null}
                </span>
              )}
            </AttachmentMedia>
            <AttachmentContent className="min-w-0">
              <AttachmentTitle className="truncate">
                {file.folder === 'proofs' ? (file.usedBy?.label ?? file.name) : file.name}
              </AttachmentTitle>
              <AttachmentDescription className="truncate tabular-nums">
                {file.lock
                  ? W.locks[file.lock]
                  : `${formatManila(file.uploadedAt, 'date').replace(/^\S+ /, '')} · ${formatStorage(file.bytes)}`}
              </AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        );
        const label = `${fileTitle(file)}, ${formatStorage(file.bytes)}${file.lock ? `, ${W.locks[file.lock]}` : ''}`;
        return (
          <li key={file.id} className="min-w-0">
            {file.lock && file.usedBy ? (
              <WhereLink file={file} aria-label={label} className="block rounded-xl">
                {tile}
              </WhereLink>
            ) : file.lock ? (
              <div aria-label={label}>{tile}</div>
            ) : (
              <button
                type="button"
                aria-pressed={on}
                aria-label={W.pickFile(label)}
                onClick={() => onToggle(file.id)}
                className="block w-full rounded-xl text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {tile}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Tablets and laptops: the ReUI Data Grid, a tick for every file that may go. */
function FileGrid({
  files,
  picked,
  onToggle,
}: {
  files: StoredFile[];
  picked: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  const columns = React.useMemo<ColumnDef<DataGridFeatures, StoredFile, unknown>[]>(
    () => [
      {
        id: 'pick',
        header: () => <span className="sr-only">{W.pickAll}</span>,
        cell: ({ row }) =>
          row.original.lock ? (
            <LockIcon aria-hidden="true" className="mx-auto size-4 text-muted-foreground" />
          ) : (
            <Checkbox
              checked={picked.has(row.original.id)}
              onCheckedChange={() => onToggle(row.original.id)}
              aria-label={W.pickFile(fileTitle(row.original))}
            />
          ),
        size: 48,
      },
      {
        id: 'file',
        header: W.cols.file,
        cell: ({ row }) => {
          const file = row.original;
          const line = whereLine(file);
          return (
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-foreground">
                <FileThumb file={file} className="size-full object-cover" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{fileTitle(file)}</span>
                <span className="truncate text-xs text-muted-foreground tabular-nums">
                  {file.amount !== null ? formatPeso(file.amount) : (line ?? file.name)}
                </span>
              </span>
            </span>
          );
        },
        size: 320,
      },
      {
        id: 'uploaded',
        header: W.cols.uploaded,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatManila(row.original.uploadedAt, 'date')}
          </span>
        ),
        size: 130,
      },
      {
        id: 'size',
        header: () => <span className="block w-full text-right">{W.cols.size}</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">{formatStorage(row.original.bytes)}</span>
        ),
        size: 90,
      },
      {
        id: 'status',
        header: W.cols.status,
        cell: ({ row }) => <FileStatus file={row.original} />,
        size: 220,
      },
    ],
    [picked, onToggle],
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: files,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: GRID_ALL_ROWS } },
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="w-full overflow-x-auto">
        <DataGrid
          table={table}
          recordCount={files.length}
          tableLayout={{ dense: false }}
          tableClassNames={{
            headerSticky:
              'sticky top-0 z-20 bg-muted/90 font-medium text-foreground backdrop-blur-xs',
            bodyRow: 'h-14',
          }}
        >
          <DataGridTable />
        </DataGrid>
      </div>
    </div>
  );
}

/** Locked: icon, word and a link to where it is used. Free: "Can delete". */
function FileStatus({ file }: { file: StoredFile }) {
  if (!file.lock) return <span className="text-sm text-muted-foreground">{W.canDelete}</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        title={W.lockHelp[file.lock]}
        className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground"
      >
        <LockIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{W.locks[file.lock]}</span>
      </span>
      <WhereLink file={file} className="shrink-0 text-sm font-medium text-primary hover:underline">
        {W.openWhere}
      </WhereLink>
    </span>
  );
}
