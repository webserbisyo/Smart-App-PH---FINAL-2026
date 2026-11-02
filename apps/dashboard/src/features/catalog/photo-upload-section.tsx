import * as React from 'react';
import {
  UploadCloudIcon,
  CropIcon,
  Trash2Icon,
  RefreshCwIcon,
  CircleAlertIcon,
  GripVerticalIcon,
  StarIcon,
  PlusIcon,
} from 'lucide-react';
import { actionWords, catalogWords } from '@smartapp/core';
import { useCreateUploadUrl, compressImage, cropImage } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/badge';
import { Progress } from '@smartapp/ui/components/progress';
import { Spinner } from '@smartapp/ui/components/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@smartapp/ui/components/dialog';
import {
  Cropper,
  CropperArea,
  CropperImage,
  type CropperAreaData,
} from '@smartapp/ui/components/cropper';
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadTrigger,
} from '@smartapp/ui/components/file-upload';
import { Sortable, SortableItem, SortableItemHandle } from '@smartapp/ui/components/reui/sortable';
import { notify } from '@smartapp/ui/compositions/notify';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { Notice } from '@/app/notice';
import { CatalogPhoto, catalogPhotoSrc } from './catalog-photo.js';
import { cn } from 'cn';

export interface PhotoUploadSectionProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  disabled?: boolean | undefined;
}

const MAX_PHOTOS = 5;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic';
// Item photos are saved square (menu cards and the desktop item dialog are square).
const PHOTO_SIDE = 1200;

interface UploadState {
  uploading: boolean;
  progress: number;
  failed: boolean;
  blob?: Blob;
}

export function PhotoUploadSection({ photos, onChange, disabled }: PhotoUploadSectionProps) {
  const [uploads, setUploads] = React.useState<Map<string, UploadState>>(new Map());
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [cropTarget, setCropTarget] = React.useState<{ index: number; src: string } | null>(null);
  const [crop, setCrop] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropArea, setCropArea] = React.useState<CropperAreaData | null>(null);
  const cropAction = useAsyncAction();

  const createUpload = useCreateUploadUrl();

  const setUpload = (url: string, state: UploadState | null) =>
    setUploads((prev) => {
      const next = new Map(prev);
      if (state) next.set(url, state);
      else next.delete(url);
      return next;
    });

  const upload = async (url: string, blob: Blob) => {
    setUpload(url, { uploading: true, progress: 30, failed: false, blob });
    try {
      await createUpload.mutateAsync({ kind: 'item' });
      setUpload(url, null);
    } catch {
      setUpload(url, { uploading: false, progress: 0, failed: true, blob });
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (disabled) return;
    setErrorMsg(null);
    const list = Array.from(files);
    if (!list.length) return;
    if (photos.length + list.length > MAX_PHOTOS) {
      setErrorMsg(catalogWords.photoLimit);
      return;
    }

    setIsCompressing(true);
    const added: { url: string; blob: Blob }[] = [];
    for (const file of list) {
      if (file.size > 15 * 1024 * 1024) {
        setErrorMsg(catalogWords.photoTooLarge);
        continue;
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      if (!validTypes.includes(file.type) && !/\.(jpg|jpeg|png|webp|heic)$/i.test(file.name)) {
        setErrorMsg(catalogWords.photoUnsupported);
        continue;
      }
      try {
        const compressed = await compressImage(file, { maxSide: PHOTO_SIDE, quality: 0.85 });
        added.push({ url: URL.createObjectURL(compressed), blob: compressed });
      } catch {
        setErrorMsg(catalogWords.photoProcessFailed);
      }
    }
    setIsCompressing(false);
    if (!added.length) return;
    onChange([...photos, ...added.map((a) => a.url)]);
    for (const a of added) void upload(a.url, a.blob);
  };

  const handleRemove = (index: number) => {
    const target = photos[index];
    if (target) {
      setUpload(target, null);
      if (target.startsWith('blob:')) URL.revokeObjectURL(target);
    }
    onChange(photos.filter((_, i) => i !== index));
  };

  const handleMakeCover = (index: number) => {
    const target = photos[index];
    if (!target || index === 0) return;
    onChange([target, ...photos.filter((_, i) => i !== index)]);
  };

  const openCrop = (index: number) => {
    const ref = photos[index];
    const src = catalogPhotoSrc(ref, PHOTO_SIDE);
    if (!src) return;
    setCrop({ x: 0, y: 0 });
    setCropArea(null);
    setCropTarget({ index, src });
  };

  const handleApplyCrop = async () => {
    if (!cropTarget || !cropArea) return;
    try {
      const side = Math.min(PHOTO_SIDE, Math.round(cropArea.width));
      const cropped = await cropAction.run(() => cropImage(cropTarget.src, cropArea, side));
      const previous = photos[cropTarget.index];
      if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
      onChange(photos.map((p, i) => (i === cropTarget.index ? cropped : p)));
      setCropTarget(null);
    } catch {
      setCropTarget(null);
      notify({ title: catalogWords.photoCropFailed, tone: 'error' });
    }
  };

  const canAdd = photos.length < MAX_PHOTOS && !disabled;

  // The installed DiceUI File Upload owns the file input, the empty drop zone and the Add photo
  // trigger (decision T43). Once photos are listed, the whole section still takes a drop.
  const listDrop = photos.length > 0;

  return (
    <FileUpload
      multiple
      accept={ACCEPT}
      label={catalogWords.photoDropzone}
      disabled={!canAdd || isCompressing}
      onAccept={(files) => void handleFiles(files)}
      onFileReject={() => setErrorMsg(catalogWords.photoUnsupported)}
      className="gap-4"
      onDragOver={(e) => {
        if (!listDrop || !canAdd || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        if (!listDrop || !canAdd || !e.dataTransfer.files.length) return;
        e.preventDefault();
        setIsDragOver(false);
        void handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{catalogWords.sectionPhotos}</h2>
          <p className="text-sm text-muted-foreground">{catalogWords.sectionPhotosDesc}</p>
        </div>
        <span className="shrink-0 text-sm whitespace-nowrap text-muted-foreground tabular">
          {catalogWords.photoCount(photos.length)}
        </span>
      </div>

      {errorMsg ? (
        <Notice tone="error" icon={<CircleAlertIcon />}>
          {errorMsg}
        </Notice>
      ) : null}

      {photos.length === 0 ? (
        <FileUploadDropzone className="cursor-pointer gap-2 rounded-2xl border-border/80 p-6 text-center hover:border-primary/50 hover:bg-muted/20 data-dragging:border-primary data-dragging:bg-primary/5">
          {isCompressing ? (
            <Spinner className="size-8 text-primary" />
          ) : (
            <UploadCloudIcon className="size-8 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">{catalogWords.photoDropzone}</span>
          <span className="text-sm text-muted-foreground">{catalogWords.photoMaxMb}</span>
        </FileUploadDropzone>
      ) : (
        <div className="space-y-2">
          {photos.length > 1 ? (
            <p className="text-sm text-muted-foreground">{catalogWords.photoReorderHint}</p>
          ) : null}

          <Sortable
            value={photos}
            getItemValue={(photo) => photo}
            onValueChange={onChange}
            strategy="vertical"
            className={cn(
              'flex flex-col gap-2 rounded-2xl transition-colors',
              isDragOver && 'bg-primary/5 ring-2 ring-primary/40',
            )}
          >
            {photos.map((photo, index) => {
              const state = uploads.get(photo);
              const isCover = index === 0;
              return (
                <SortableItem key={photo} value={photo}>
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-xl border bg-card p-2 pr-1 sm:gap-3',
                      isCover ? 'border-primary/50' : 'border-border/80',
                    )}
                  >
                    <SortableItemHandle
                      className="flex h-11 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground active:cursor-grabbing"
                      aria-label={catalogWords.photoDragAria(index + 1)}
                    >
                      <GripVerticalIcon className="size-4" />
                    </SortableItemHandle>

                    <CatalogPhoto
                      photoRef={photo}
                      alt={catalogWords.photoAlt(index + 1)}
                      size="md"
                      className="size-14 rounded-lg"
                    />

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {isCover ? (
                        <>
                          <Badge className="w-fit gap-1">
                            <StarIcon className="size-3 fill-current" />
                            {catalogWords.photoCover}
                          </Badge>
                          <span className="hidden text-sm text-muted-foreground sm:block">
                            {catalogWords.photoCoverHint}
                          </span>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-11 w-fit gap-1.5 px-2 text-muted-foreground hover:text-foreground md:h-9"
                          aria-label={catalogWords.photoMakeCoverAria(index + 1)}
                          onClick={() => handleMakeCover(index)}
                        >
                          <StarIcon className="size-4" />
                          {catalogWords.photoMakeCover}
                        </Button>
                      )}
                      {state?.uploading ? (
                        <Progress value={state.progress} className="h-1.5" />
                      ) : null}
                      {state?.failed ? (
                        <span className="flex flex-wrap items-center gap-2 text-sm text-destructive">
                          {catalogWords.photoUploadFailed}
                          <Button
                            type="button"
                            variant="link"
                            className="h-11 gap-1 px-0 font-semibold text-destructive md:h-9"
                            onClick={() => {
                              if (state.blob) void upload(photo, state.blob);
                            }}
                          >
                            <RefreshCwIcon className="size-3.5" />
                            {catalogWords.photoRetry}
                          </Button>
                        </span>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 text-muted-foreground hover:text-foreground md:size-9"
                      aria-label={catalogWords.photoCropAria(index + 1)}
                      title={catalogWords.photoCrop}
                      onClick={() => openCrop(index)}
                    >
                      <CropIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 text-muted-foreground hover:text-destructive md:size-9"
                      aria-label={catalogWords.photoRemoveAria(index + 1)}
                      title={catalogWords.photoRemove}
                      onClick={() => handleRemove(index)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </SortableItem>
              );
            })}
          </Sortable>

          {canAdd ? (
            <FileUploadTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full gap-1.5 border-dashed md:h-9"
                />
              }
            >
              {isCompressing ? <Spinner /> : <PlusIcon className="size-4" />}
              {catalogWords.photoAddMore}
            </FileUploadTrigger>
          ) : null}
        </div>
      )}

      <Dialog open={cropTarget !== null} onOpenChange={(open) => !open && setCropTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{catalogWords.photoCropSquare}</DialogTitle>
            <DialogDescription>{catalogWords.photoCropHelp}</DialogDescription>
          </DialogHeader>
          {cropTarget ? (
            <div className="relative h-72 w-full overflow-hidden rounded-lg border border-border bg-muted">
              <Cropper
                aspectRatio={1}
                crop={crop}
                onCropChange={setCrop}
                onCropAreaChange={(_, pixels) => setCropArea(pixels)}
                className="size-full"
              >
                <CropperImage src={cropTarget.src} alt="" crossOrigin="anonymous" />
                <CropperArea />
              </Cropper>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => setCropTarget(null)}
            >
              {catalogWords.cancel}
            </Button>
            <AsyncButton
              type="button"
              className="h-11 font-semibold md:h-9"
              status={cropAction.status}
              busyLabel={actionWords.applying}
              doneLabel={actionWords.applied}
              disabled={!cropArea}
              onClick={() => void handleApplyCrop()}
            >
              {catalogWords.photoCropApply}
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FileUpload>
  );
}
