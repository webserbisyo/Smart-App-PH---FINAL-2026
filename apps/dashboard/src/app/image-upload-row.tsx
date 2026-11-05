import * as React from 'react';
import { CircleAlertIcon, ImageIcon, ImageUpIcon, SplitIcon, Trash2Icon } from 'lucide-react';
import {
  UPLOAD_ACCEPT,
  errorWords,
  formatStorage,
  settingsWords,
  type UploadKind,
} from '@smartapp/core';
import {
  errorCodeOf,
  prepareImage,
  shrinkPercent,
  useCreateUploadUrl,
  type PreparedImage,
  type PrepareImageResult,
} from '@smartapp/data';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import {
  CompareSlider,
  CompareSliderAfter,
  CompareSliderBefore,
  CompareSliderHandle,
  CompareSliderLabel,
} from '@smartapp/ui/components/compare-slider';
import { FileUpload, FileUploadTrigger } from '@smartapp/ui/components/file-upload';
import { Spinner } from '@smartapp/ui/components/spinner';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from 'cn';

const U = settingsWords.upload;

/** The words for a photo that could not be used (T65). */
export function uploadProblemText(result: Exclude<PrepareImageResult, { ok: true }>): string {
  switch (result.problem) {
    case 'too_big':
      return U.tooBig(formatStorage(result.bytes));
    case 'not_image':
      return U.notImage;
    case 'heic':
      return U.heic;
    case 'unreadable':
      return U.unreadable;
  }
}

export interface UploadedImage {
  // What is saved with the setting (the storage path from NestJS).
  ref: string;
  // A local copy to show it right away.
  preview: string;
  image: PreparedImage;
  original: string;
}

/**
 * One owner photo through the shared upload step (decision T65): check it, make it smaller on the
 * phone, ask NestJS for a place in the shop's storage, and say what changed. Used by the payment QR,
 * the owner's photo, the plan receipt and the Storage try-out.
 */
export function useImageUpload(kind: UploadKind, maxSide: number) {
  const createUpload = useCreateUploadUrl();
  const [busy, setBusy] = React.useState<'shrinking' | 'uploading' | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);

  const upload = async (file: File): Promise<UploadedImage | null> => {
    setProblem(null);
    setBusy('shrinking');
    const result = await prepareImage(file, { maxSide, quality: kind === 'qr' ? 0.92 : 0.8 });
    if (!result.ok) {
      setBusy(null);
      setProblem(uploadProblemText(result));
      return null;
    }
    setBusy('uploading');
    try {
      const target = await createUpload.mutateAsync({ kind, bytes: result.image.after });
      // The mock signs a pretend address; a real one takes the file (phase 4).
      if (!target.uploadUrl.startsWith('mock://')) {
        const response = await fetch(target.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': result.image.blob.type },
          body: result.image.blob,
        });
        if (!response.ok) throw new Error('upload_failed');
      }
      setBusy(null);
      return {
        ref: target.path,
        preview: URL.createObjectURL(result.image.blob),
        image: result.image,
        original: URL.createObjectURL(file),
      };
    } catch (err) {
      setBusy(null);
      setProblem(errorWords(errorCodeOf(err)));
      return null;
    }
  };

  return { upload, busy, problem, clearProblem: () => setProblem(null) };
}

/** "4.2 MB → 180 KB · WebP" with how much smaller, after an upload. */
export function ShrinkLine({ image, className }: { image: PreparedImage; className?: string }) {
  const percent = shrinkPercent(image.before, image.after);
  return (
    <span
      className={cn('flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground', className)}
    >
      <span className="tabular-nums">
        {U.sizes(formatStorage(image.before), formatStorage(image.after))} ·{' '}
        {image.to.toUpperCase()}
      </span>
      {percent > 0 ? (
        <Badge variant="secondary" className="bg-success-soft text-success-text">
          {U.smaller(percent)}
        </Badge>
      ) : null}
    </span>
  );
}

/**
 * DiceUI Compare Slider: the original on the left, what we keep on the right. The slider draws its
 * After layer on the left, so the original goes there.
 */
export function CompareDialog({
  open,
  onOpenChange,
  upload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  upload: UploadedImage | null;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={U.compareTitle}
      description={
        upload
          ? U.compareLine(formatStorage(upload.image.before), formatStorage(upload.image.after))
          : undefined
      }
    >
      {upload ? (
        <CompareSlider className="aspect-square w-full overflow-hidden rounded-xl bg-muted">
          <CompareSliderBefore>
            <img src={upload.preview} alt="" className="size-full object-contain" />
          </CompareSliderBefore>
          <CompareSliderAfter>
            <img src={upload.original} alt="" className="size-full object-contain" />
          </CompareSliderAfter>
          <CompareSliderHandle />
          <CompareSliderLabel side="before">{U.original}</CompareSliderLabel>
          <CompareSliderLabel side="after">{U.savedLabel}</CompareSliderLabel>
        </CompareSlider>
      ) : null}
    </ResponsiveDialog>
  );
}

export interface ImageUploadRowProps {
  id: string;
  kind: UploadKind;
  maxSide: number;
  label: string;
  help?: string | undefined;
  // What is shown now: a local preview or the saved photo's address.
  src: string | null;
  onUploaded: (upload: UploadedImage) => void;
  onRemove?: (() => void) | undefined;
  shape?: 'square' | 'circle';
  disabled?: boolean | undefined;
}

/** A photo with Upload or Replace, Remove, the size line, Compare and the problem in words. */
export function ImageUploadRow({
  id,
  kind,
  maxSide,
  label,
  help,
  src,
  onUploaded,
  onRemove,
  shape = 'square',
  disabled,
}: ImageUploadRowProps) {
  const { upload, busy, problem } = useImageUpload(kind, maxSide);
  const [last, setLast] = React.useState<UploadedImage | null>(null);
  const [compareOpen, setCompareOpen] = React.useState(false);

  const onFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const done = await upload(file);
    if (!done) return;
    setLast(done);
    onUploaded(done);
    notify({ title: U.added(formatStorage(done.image.after)), tone: 'success' });
  };

  return (
    <FileUpload
      accept={UPLOAD_ACCEPT}
      maxFiles={1}
      label={label}
      disabled={disabled === true || busy !== null}
      onAccept={(files) => void onFiles(files)}
      className="gap-2"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex size-16 shrink-0 items-center justify-center overflow-hidden border border-border bg-muted text-muted-foreground',
            shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          )}
        >
          {busy ? (
            <Spinner className="size-5" />
          ) : src ? (
            <img src={src} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-6" aria-hidden />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
          {busy ? (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {busy === 'shrinking' ? U.shrinking : U.uploading}
            </span>
          ) : last ? (
            <ShrinkLine image={last.image} />
          ) : help ? (
            <span className="text-xs text-muted-foreground">{help}</span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <FileUploadTrigger
          render={<Button id={id} type="button" variant="outline" className="h-11 md:h-9" />}
        >
          <ImageUpIcon />
          {src ? U.replace : U.pick}
        </FileUploadTrigger>
        {last ? (
          <Button
            type="button"
            variant="ghost"
            className="h-11 md:h-9"
            onClick={() => setCompareOpen(true)}
          >
            <SplitIcon />
            {U.compare}
          </Button>
        ) : null}
        {src && onRemove ? (
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-muted-foreground md:h-9"
            onClick={() => {
              setLast(null);
              onRemove();
            }}
          >
            <Trash2Icon />
            {U.remove}
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
      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} upload={last} />
    </FileUpload>
  );
}
