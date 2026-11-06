import { Link } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleDotIcon,
  CopyIcon,
  ExternalLinkIcon,
  LaptopIcon,
  MoreHorizontalIcon,
  Redo2Icon,
  SmartphoneIcon,
  Trash2Icon,
  Undo2Icon,
  WifiOffIcon,
} from 'lucide-react';
import { editorWords } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { Spinner } from '@smartapp/ui/components/spinner';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { copyText } from '@smartapp/ui/lib/copy-text';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from 'cn';
import type { PreviewDevice } from './preview-frame.js';
import type { SaveStatus } from './use-editor-draft.js';

const B = editorWords.bar;
const ST = editorWords.status;

const DEVICES = ['phone', 'laptop'] as const;

/** Where the draft is, as icon + word + colour (docs/ux.md). */
export function SaveStatusLine({ status, count }: { status: SaveStatus; count: number }) {
  let icon: React.ReactNode;
  let text: string;
  let tone: string;
  switch (status) {
    case 'saving':
      icon = <Spinner className="size-3.5" />;
      text = ST.saving;
      tone = 'text-muted-foreground';
      break;
    case 'live':
      icon = <CheckCircle2Icon className="size-3.5" />;
      text = ST.live;
      tone = 'text-success-text';
      break;
    case 'saved':
      icon = <CircleDotIcon className="size-3.5" />;
      text = ST.draft(count);
      tone = 'text-warning-text';
      break;
    case 'offline':
      icon = <WifiOffIcon className="size-3.5" />;
      text = ST.offline;
      tone = 'text-warning-text';
      break;
    case 'failed':
      icon = <CircleAlertIcon className="size-3.5" />;
      text = ST.failed;
      tone = 'text-destructive';
      break;
    case 'conflict':
      icon = <CircleAlertIcon className="size-3.5" />;
      text = ST.conflict;
      tone = 'text-warning-text';
      break;
  }
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('flex min-w-0 items-center gap-1.5 text-xs font-medium', tone)}
    >
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="truncate">{text}</span>
    </p>
  );
}

export interface EditorTopBarProps {
  title: string;
  status: SaveStatus;
  count: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  device: PreviewDevice;
  onDevice: (device: PreviewDevice) => void;
  /** Phone screens keep Publish in the bottom bar and have no size switch. */
  compact: boolean;
  shopLink: string;
  canDiscard: boolean;
  onDiscard: () => void;
  canPublish: boolean;
  onPublish: () => void;
}

export function EditorTopBar({
  title,
  status,
  count,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  device,
  onDevice,
  compact,
  shopLink,
  canDiscard,
  onDiscard,
  canPublish,
  onPublish,
}: EditorTopBarProps) {
  const copyLink = async () => {
    const ok = await copyText(shopLink);
    notify(
      ok ? { title: B.linkCopied, tone: 'success' } : { title: B.linkCopyFailed, tone: 'error' },
    );
  };
  return (
    <header className="sticky top-0 z-20 flex min-h-16 shrink-0 items-center gap-1 border-b border-border bg-background px-2 pt-safe md:gap-2 md:px-3">
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0"
        aria-label={B.back}
        nativeButton={false}
        render={<Link to="/" />}
      >
        <ArrowLeftIcon />
      </Button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-1">
        <h1 className="truncate text-base font-semibold md:text-lg">{title}</h1>
        <SaveStatusLine status={status} count={count} />
      </div>
      <div className="flex shrink-0 items-center">
        <Button
          variant="ghost"
          size="icon"
          className="size-11 md:size-10"
          aria-label={B.undo}
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2Icon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 md:size-10"
          aria-label={B.redo}
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo2Icon />
        </Button>
      </div>
      {compact ? null : (
        <ToggleGroup
          aria-label={B.device}
          value={[device]}
          onValueChange={(value) => {
            const next = DEVICES.find((d) => d === value[0]);
            if (next) onDevice(next);
          }}
          className="shrink-0 rounded-xl border border-border/80 bg-muted/50 p-0.5"
        >
          <ToggleGroupItem
            value="phone"
            className="h-9 rounded-lg px-3 text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs"
          >
            <SmartphoneIcon aria-hidden />
            <span className="hidden xl:inline">{B.phone}</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="laptop"
            className="h-9 rounded-lg px-3 text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs"
          >
            <LaptopIcon aria-hidden />
            <span className="hidden xl:inline">{B.laptop}</span>
          </ToggleGroupItem>
        </ToggleGroup>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 md:size-10"
              aria-label={B.more}
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            className="min-h-11 md:min-h-9"
            render={<a href={shopLink} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLinkIcon />
            {B.viewLive}
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 md:min-h-9" onClick={() => void copyLink()}>
            <CopyIcon />
            {B.copyLink}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-11 md:min-h-9"
            variant="destructive"
            disabled={!canDiscard}
            onClick={onDiscard}
          >
            <Trash2Icon />
            {B.discard}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {compact ? null : (
        <Button
          className="h-10 shrink-0 px-4 font-semibold"
          disabled={!canPublish}
          onClick={onPublish}
        >
          {count > 0 ? B.publishCount(count) : B.publish}
        </Button>
      )}
    </header>
  );
}
