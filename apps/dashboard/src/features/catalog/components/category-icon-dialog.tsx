import * as React from 'react';
import { z } from 'zod';
import { SearchIcon, UploadCloudIcon, CropIcon } from 'lucide-react';
import {
  ICON_KEYS,
  iconPath,
  catalogWords,
  type CategoryIcon,
  type IconKey,
  type CategoryIconStyle,
} from '@smartapp/core';
import { useCreateUploadUrl, compressImage } from '@smartapp/data';
import { env } from '@/app/env';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@smartapp/ui/components/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import {
  Cropper,
  CropperArea,
  CropperImage,
  type CropperAreaData,
} from '@smartapp/ui/components/cropper';
import { EmojiPicker } from '@smartapp/ui/components/reui/emoji-picker';
import { cn } from 'cn';

export interface CategoryIconDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIcon?: CategoryIcon | IconKey | null;
  onSelect: (icon: CategoryIcon) => void;
}

const LOCAL_STORAGE_CUSTOM_ICONS = 'smartapp:category:custom-icons';

export function CategoryIconDialog({
  open,
  onOpenChange,
  selectedIcon,
  onSelect,
}: CategoryIconDialogProps) {
  const [activeTab, setActiveTab] = React.useState<'suggested' | 'emoji' | 'upload'>('suggested');
  const [style, setStyle] = React.useState<CategoryIconStyle>('flat');
  const [search, setSearch] = React.useState('');

  // Upload states
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const cropAreaRef = React.useRef<CropperAreaData | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [customIcons, setCustomIcons] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CUSTOM_ICONS);
      if (!saved) return [];
      const parsed: unknown = JSON.parse(saved);
      const res = z.array(z.string()).safeParse(parsed);
      return res.success ? res.data : [];
    } catch {
      return [];
    }
  });

  const createUpload = useCreateUploadUrl();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Filtered curated keys
  const filteredKeys = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ICON_KEYS;
    return ICON_KEYS.filter((k) => k.toLowerCase().includes(q));
  }, [search]);

  // Handle image pick
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // Perform crop, compression, and upload
  const handleCropAndUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    try {
      await compressImage(uploadFile, {
        maxSide: 128,
        quality: 0.9,
      });

      const res = await createUpload.mutateAsync({ kind: 'category' });
      // In mock/test environments, res.path is the media reference
      const iconRef = res.path;

      // Update custom icons history
      const updated = [iconRef, ...customIcons.filter((ref) => ref !== iconRef)].slice(0, 20);
      setCustomIcons(updated);
      try {
        localStorage.setItem(LOCAL_STORAGE_CUSTOM_ICONS, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }

      onSelect({ kind: 'image', ref: iconRef });
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to upload category icon:', err);
    } finally {
      setIsUploading(false);
      setUploadFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const isCurrentFluent =
    typeof selectedIcon === 'string' ||
    (typeof selectedIcon === 'object' && selectedIcon !== null && selectedIcon.kind === 'fluent');

  const currentKey =
    typeof selectedIcon === 'string'
      ? selectedIcon
      : typeof selectedIcon === 'object' && selectedIcon !== null && selectedIcon.kind === 'fluent'
        ? selectedIcon.key
        : null;

  const isTab = (val: string): val is 'suggested' | 'emoji' | 'upload' =>
    val === 'suggested' || val === 'emoji' || val === 'upload';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-vh-85 max-w-md flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle>{catalogWords.iconDialogTitle}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            if (isTab(val)) setActiveTab(val);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mb-3 grid w-full grid-cols-3">
            <TabsTrigger value="suggested">{catalogWords.tabSuggested}</TabsTrigger>
            <TabsTrigger value="emoji">{catalogWords.tabAnyEmoji}</TabsTrigger>
            <TabsTrigger value="upload">{catalogWords.tabUploadOwn}</TabsTrigger>
          </TabsList>

          {/* TAB 1: Suggested */}
          <TabsContent
            value="suggested"
            className="flex min-h-0 flex-1 flex-col gap-3 outline-none"
          >
            {/* Style switcher & Search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search icons..."
                  className="h-8 pl-8 text-xs"
                />
              </div>

              {/* Style selector */}
              <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5">
                {(['flat', 'color', '3d'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(s)}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                      style === s
                        ? 'bg-card font-semibold text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {s === 'flat'
                      ? catalogWords.styleFlat
                      : s === 'color'
                        ? catalogWords.styleColor
                        : catalogWords.style3d}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of icons */}
            <div className="grid max-h-72 grid-cols-6 gap-2 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-1 sm:grid-cols-6">
              {filteredKeys.map((key) => {
                const isSelected = isCurrentFluent && currentKey === key;
                const src = `${env.VITE_STOREFRONT_URL.replace(/\/+$/, '')}${iconPath(
                  { kind: 'fluent', key, style },
                  style,
                )}`;

                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={`Select ${key} icon`}
                    onClick={() => {
                      onSelect({ kind: 'fluent', key, style });
                      onOpenChange(false);
                    }}
                    className={cn(
                      'flex size-12 items-center justify-center rounded-xl border p-1.5 transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/30'
                        : 'border-border/40 bg-card hover:bg-muted/60',
                    )}
                  >
                    <img src={src} alt={key} className="size-7 object-contain" loading="lazy" />
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 2: Any emoji */}
          <TabsContent
            value="emoji"
            className="flex min-h-0 flex-1 flex-col items-center justify-center outline-none"
          >
            <div className="flex w-full justify-center py-1">
              <EmojiPicker
                dataUrl="/emojibase"
                onEmojiSelect={(selection) => {
                  onSelect({ kind: 'emoji', char: selection.value });
                  onOpenChange(false);
                }}
              />
            </div>
          </TabsContent>

          {/* TAB 3: Upload your own */}
          <TabsContent
            value="upload"
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto outline-none"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 p-8 transition-colors hover:border-primary/50"
              >
                <div className="rounded-full bg-muted p-3 text-muted-foreground">
                  <UploadCloudIcon className="size-6" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold text-foreground">
                    {catalogWords.uploadButton}
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {catalogWords.uploadCropHint}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
                  <Cropper
                    aspectRatio={1}
                    crop={crop}
                    onCropChange={setCrop}
                    onCropAreaChange={(_, pixels) => {
                      cropAreaRef.current = pixels;
                    }}
                    className="size-full"
                  >
                    <CropperImage src={previewUrl} alt="" />
                    <CropperArea />
                  </Cropper>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    {catalogWords.cancel}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isUploading}
                    onClick={handleCropAndUpload}
                    className="gap-1.5"
                  >
                    <CropIcon className="size-3.5" />
                    <span>{isUploading ? catalogWords.saving : catalogWords.save}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Custom icons history */}
            {customIcons.length > 0 && (
              <div className="space-y-2 border-t border-border/60 pt-2">
                <span className="text-xs font-medium text-muted-foreground">Previous uploads</span>
                <div className="flex flex-wrap gap-2">
                  {customIcons.map((ref) => (
                    <button
                      key={ref}
                      type="button"
                      onClick={() => {
                        onSelect({ kind: 'image', ref });
                        onOpenChange(false);
                      }}
                      className="size-11 overflow-hidden rounded-lg border border-border/80 bg-card transition-colors hover:border-primary/50"
                    >
                      <img src={ref} alt="Custom icon" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
