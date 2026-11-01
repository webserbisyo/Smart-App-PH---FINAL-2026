import * as React from 'react';
import {
  UploadCloudIcon,
  CropIcon,
  Trash2Icon,
  RefreshCwIcon,
  Loader2Icon,
  GripVerticalIcon,
} from 'lucide-react';
import { words } from '@smartapp/core';
import { useCreateUploadUrl, compressImage } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/badge';
import { Progress } from '@smartapp/ui/components/progress';
import {
  Dialog,
  DialogContent,
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
import { Sortable, SortableItem, SortableItemHandle } from '@smartapp/ui/components/reui/sortable';
import { CatalogPhoto } from './catalog-photo.js';
import { cn } from 'cn';

export interface PhotoUploadSectionProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  disabled?: boolean | undefined;
}

interface PhotoMeta {
  format: string;
  originalBytes: number;
  compressedBytes: number;
  uploading: boolean;
  progress: number;
  failed: boolean;
  blob?: Blob;
}

export function PhotoUploadSection({ photos, onChange, disabled }: PhotoUploadSectionProps) {
  const [photoMeta, setPhotoMeta] = React.useState<Map<string, PhotoMeta>>(new Map());
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [cropTarget, setCropTarget] = React.useState<{ index: number; url: string } | null>(null);
  const [crop, setCrop] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropArea, setCropArea] = React.useState<CropperAreaData | null>(null);

  const createUpload = useCreateUploadUrl();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | File[]) => {
    if (disabled) return;
    setErrorMsg(null);
    const list = Array.from(files);
    if (!list.length) return;

    if (photos.length + list.length > 5) {
      setErrorMsg('You can upload up to 5 photos.');
      return;
    }

    setIsCompressing(true);
    const newPhotos = [...photos];
    const newMeta = new Map(photoMeta);

    for (const file of list) {
      if (file.size > 15 * 1024 * 1024) {
        setErrorMsg(words.screens.catalog.photoTooLarge);
        continue;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
        setErrorMsg(words.screens.catalog.photoUnsupported);
        continue;
      }

      try {
        const compressed = await compressImage(file, {
          maxSide: 1200,
          quality: 0.85,
        });

        const objectUrl = URL.createObjectURL(compressed);
        newPhotos.push(objectUrl);

        newMeta.set(objectUrl, {
          format: compressed.type.replace('image/', '').toUpperCase(),
          originalBytes: file.size,
          compressedBytes: compressed.size,
          uploading: true,
          progress: 30,
          failed: false,
          blob: compressed,
        });

        try {
          await createUpload.mutateAsync({
            kind: 'item',
          });

          newMeta.set(objectUrl, {
            format: compressed.type.replace('image/', '').toUpperCase(),
            originalBytes: file.size,
            compressedBytes: compressed.size,
            uploading: false,
            progress: 100,
            failed: false,
            blob: compressed,
          });
        } catch {
          newMeta.set(objectUrl, {
            format: compressed.type.replace('image/', '').toUpperCase(),
            originalBytes: file.size,
            compressedBytes: compressed.size,
            uploading: false,
            progress: 0,
            failed: true,
            blob: compressed,
          });
        }
      } catch {
        setErrorMsg('Failed to process image. Please try another file.');
      }
    }

    setPhotoMeta(newMeta);
    onChange(newPhotos);
    setIsCompressing(false);
  };

  const handleRetryUpload = async (url: string) => {
    if (disabled) return;
    const meta = photoMeta.get(url);
    if (!meta || !meta.blob) return;

    const newMeta = new Map(photoMeta);
    newMeta.set(url, { ...meta, uploading: true, failed: false, progress: 20 });
    setPhotoMeta(newMeta);

    try {
      await createUpload.mutateAsync({
        kind: 'item',
      });

      newMeta.set(url, { ...meta, uploading: false, failed: false, progress: 100 });
      setPhotoMeta(newMeta);
    } catch {
      newMeta.set(url, { ...meta, uploading: false, failed: true, progress: 0 });
      setPhotoMeta(newMeta);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const targetUrl = photos[index];
    const next = photos.filter((_, i) => i !== index);
    if (targetUrl) {
      const newMeta = new Map(photoMeta);
      newMeta.delete(targetUrl);
      setPhotoMeta(newMeta);
      if (targetUrl.startsWith('blob:')) {
        URL.revokeObjectURL(targetUrl);
      }
    }
    onChange(next);
  };

  const handleApplyCrop = () => {
    if (!cropTarget || !cropArea) return;
    setCropTarget(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {words.screens.catalog.sectionPhotos}
          </h3>
          <p className="text-xs text-muted-foreground">{words.screens.catalog.sectionPhotosDesc}</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{photos.length}/5 photos</span>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Dropzone */}
      {photos.length < 5 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) void handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 p-6',
            'cursor-pointer space-y-2 text-center transition-all hover:border-primary/50 hover:bg-muted/20',
            isCompressing && 'pointer-events-none opacity-60',
          )}
        >
          {isCompressing ? (
            <Loader2Icon className="size-8 animate-spin text-primary" />
          ) : (
            <UploadCloudIcon className="size-8 text-muted-foreground" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {words.screens.catalog.photoDropzone}
            </p>
            <p className="text-xs text-muted-foreground">{words.screens.catalog.photoMaxMb}</p>
          </div>
        </div>
      )}

      {/* Uploaded Photos Grid with Sortable Reorder */}
      {photos.length > 0 && (
        <div className="space-y-2">
          {photos.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Drag handles to set cover image (first photo):
            </p>
          )}

          <Sortable value={photos} getItemValue={(photo) => photo} onValueChange={onChange}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {photos.map((photo, index) => {
                const meta = photoMeta.get(photo);
                const isCover = index === 0;

                return (
                  <SortableItem key={photo} value={photo}>
                    <div
                      className={cn(
                        'relative flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm',
                        isCover ? 'border-primary/50 bg-primary/5' : 'border-border/80',
                      )}
                    >
                      {/* Drag Handle */}
                      <SortableItemHandle
                        className="cursor-grab p-1 text-muted-foreground hover:text-foreground"
                        aria-label={`Drag photo ${index + 1}`}
                      >
                        <GripVerticalIcon className="size-4" />
                      </SortableItemHandle>

                      {/* Photo Thumbnail */}
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border/60">
                        <CatalogPhoto
                          photoRef={photo}
                          alt={`Photo ${index + 1}`}
                          size="md"
                          className="size-full rounded-lg"
                        />
                        {isCover && (
                          <Badge
                            variant="default"
                            className="absolute -top-1.5 -left-1.5 px-1.5 py-0 text-xs font-bold tracking-wider uppercase"
                          >
                            Cover
                          </Badge>
                        )}
                      </div>

                      {/* Meta & Status */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {meta && (
                            <>
                              <Badge variant="secondary" className="px-1 py-0 font-mono text-xs">
                                {meta.format}
                              </Badge>
                              <Badge variant="outline" className="px-1 py-0 font-mono text-xs">
                                {formatSize(meta.originalBytes)} →{' '}
                                {formatSize(meta.compressedBytes)}
                              </Badge>
                            </>
                          )}
                        </div>

                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {isCover
                            ? 'Cover photo for customer view'
                            : `Gallery photo #${index + 1}`}
                        </p>

                        {/* Progress bar */}
                        {meta?.uploading && (
                          <div className="pt-1">
                            <Progress value={meta.progress} className="h-1.5" />
                          </div>
                        )}

                        {meta?.failed && (
                          <div className="flex items-center gap-2 pt-1 text-xs text-destructive">
                            <span>Upload failed</span>
                            <button
                              type="button"
                              onClick={() => void handleRetryUpload(photo)}
                              className="flex items-center gap-1 font-semibold underline hover:no-underline"
                            >
                              <RefreshCwIcon className="size-3" />
                              Retry
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Photo Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          title={words.screens.catalog.photoCrop}
                          onClick={() => setCropTarget({ index, url: photo })}
                        >
                          <CropIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          title={words.screens.catalog.photoRemove}
                          onClick={() => handleRemovePhoto(index)}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </SortableItem>
                );
              })}
            </div>
          </Sortable>
        </div>
      )}

      {/* Crop Dialog */}
      <Dialog open={cropTarget !== null} onOpenChange={(open) => !open && setCropTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{words.screens.catalog.photoCropSquare}</DialogTitle>
          </DialogHeader>
          {cropTarget && (
            <div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
              <Cropper
                aspectRatio={1}
                crop={crop}
                onCropChange={setCrop}
                onCropAreaChange={(_, pixels) => setCropArea(pixels)}
                className="h-full w-full"
              >
                <CropperImage src={cropTarget.url} alt="Crop preview" />
                <CropperArea />
              </Cropper>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCropTarget(null)}>
              {words.screens.catalog.cancel}
            </Button>
            <Button
              type="button"
              className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={handleApplyCrop}
            >
              {words.screens.catalog.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
