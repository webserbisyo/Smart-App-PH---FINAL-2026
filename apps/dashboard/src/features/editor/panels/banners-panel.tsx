import * as React from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ImagePlusIcon,
  ImageUpIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  BANNER_LINK_KINDS,
  UPLOAD_ACCEPT,
  actionWords,
  editorWords,
  errorWords,
  type Banner,
  type BannerLink,
  type PublicShop,
  type StorefrontContent,
} from '@smartapp/core';
import { cropImage, errorCodeOf } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Cropper,
  CropperArea,
  CropperImage,
  type CropperAreaData,
} from '@smartapp/ui/components/cropper';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@smartapp/ui/components/dialog';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { FileUpload, FileUploadTrigger } from '@smartapp/ui/components/file-upload';
import { Input } from '@smartapp/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@smartapp/ui/components/native-select';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from 'cn';
import { useImageUpload } from '@/app/image-upload-row';
import { useShop } from '@/app/shop';
import { withText } from '../banner-text.js';
import { pictureRef, pictureSrc } from '../picture.js';
import type { PanelProps } from './types.js';
import { CountedLabel } from './field-count.js';

const W = editorWords.banners;
const MAX_BANNERS = 3;
const SECONDS = [3, 5, 7, 10] as const;
// Banners are 16:9 at 1600 px wide, so one photo fits phones and laptops (rule E10).
const BANNER_WIDTH = 1600;
const BANNER_HEIGHT = 900;

function withBanners(c: StorefrontContent, banners: Banner[]): StorefrontContent {
  return { ...c, look: { ...c.look, banners } };
}

function firstTarget(kind: BannerLink['kind'], shop: PublicShop | undefined): string | null {
  if (kind === 'item') return shop?.catalog.items.find((i) => i.status === 'active')?.id ?? null;
  if (kind === 'category') return shop?.catalog.categories[0]?.id ?? null;
  return null;
}

async function dataUrlToFile(dataUrl: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], 'banner.webp', { type: blob.type });
}

interface CropTarget {
  src: string;
  // null adds a new banner; a number replaces that banner's photo.
  index: number | null;
}

function BannerCard({
  banner,
  index,
  count,
  open,
  onToggle,
  onChange,
  onMove,
  onRemove,
  onReplace,
  shop,
  catalogName,
}: {
  banner: Banner;
  index: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  onChange: (banner: Banner, key: string) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
  onReplace: (file: File) => void;
  shop: PublicShop | undefined;
  catalogName: string;
}) {
  const n = index + 1;
  const id = `editor-banner-${n}`;
  const items = shop?.catalog.items.filter((i) => i.status === 'active') ?? [];
  const categories = shop?.catalog.categories ?? [];
  const linkKind = banner.link?.kind ?? '';
  return (
    <li className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          aria-label={W.open(n)}
          onClick={onToggle}
        >
          <img
            src={pictureSrc(banner.ref, 320) ?? undefined}
            alt=""
            className="aspect-video w-20 shrink-0 rounded-md bg-muted object-cover"
          />
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">{W.banner(n)}</span>
            <span className="truncate text-xs text-muted-foreground">
              {banner.title ?? W.photoOnly}
            </span>
          </span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 md:size-9"
          aria-label={W.moveUp(n)}
          disabled={index === 0}
          onClick={() => onMove(index - 1)}
        >
          <ArrowUpIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 md:size-9"
          aria-label={W.moveDown(n)}
          disabled={index === count - 1}
          onClick={() => onMove(index + 1)}
        >
          <ArrowDownIcon />
        </Button>
        <ChevronDownIcon
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-base motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </div>
      {open ? (
        <div id={`${id}-body`} className="flex flex-col gap-4 border-t border-border p-3">
          <div className="flex flex-wrap gap-2">
            <FileUpload
              accept={UPLOAD_ACCEPT}
              maxFiles={1}
              label={W.replace}
              onAccept={(files) => {
                const file = files[0];
                if (file) onReplace(file);
              }}
            >
              <FileUploadTrigger
                render={<Button type="button" variant="outline" className="h-11 md:h-9" />}
              >
                <ImageUpIcon />
                {W.replace}
              </FileUploadTrigger>
            </FileUpload>
            <Button variant="ghost" className="h-11 text-destructive md:h-9" onClick={onRemove}>
              <Trash2Icon />
              {W.remove}
            </Button>
          </div>
          <Field>
            <CountedLabel htmlFor={`${id}-title`} used={banner.title?.length ?? 0} max={40}>
              {W.title}
            </CountedLabel>
            <Input
              id={`${id}-title`}
              className="h-11 md:h-9"
              maxLength={40}
              placeholder={W.titlePlaceholder}
              value={banner.title ?? ''}
              onChange={(e) => onChange(withText(banner, 'title', e.target.value), `${id}-title`)}
            />
          </Field>
          <Field>
            <CountedLabel htmlFor={`${id}-line`} used={banner.description?.length ?? 0} max={90}>
              {W.line}
            </CountedLabel>
            <Input
              id={`${id}-line`}
              className="h-11 md:h-9"
              maxLength={90}
              placeholder={W.linePlaceholder}
              value={banner.description ?? ''}
              onChange={(e) =>
                onChange(withText(banner, 'description', e.target.value), `${id}-line`)
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-alt`}>{W.alt}</FieldLabel>
            <Input
              id={`${id}-alt`}
              className="h-11 md:h-9"
              maxLength={120}
              value={banner.alt}
              onChange={(e) =>
                // The photo always keeps a description; an empty box goes back to the shop's name.
                onChange(
                  {
                    ...banner,
                    alt: e.target.value || W.defaultAlt(shop?.storefront.info.name ?? ''),
                  },
                  `${id}-alt`,
                )
              }
            />
            <FieldDescription>{W.altHelp}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-link`}>{W.buttonTo}</FieldLabel>
            <NativeSelect
              id={`${id}-link`}
              className="w-full"
              value={linkKind}
              onChange={(e) => {
                const kind = BANNER_LINK_KINDS.find((k) => k === e.target.value);
                const next: Banner = { ...banner };
                if (kind) next.link = { kind, targetId: firstTarget(kind, shop) };
                else delete next.link;
                onChange(next, `${id}-link`);
              }}
            >
              <NativeSelectOption value="">{W.noButton}</NativeSelectOption>
              {BANNER_LINK_KINDS.map((kind) => (
                <NativeSelectOption key={kind} value={kind}>
                  {W.linkKinds[kind]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          {banner.link && banner.link.kind !== 'rewards' ? (
            <Field>
              <FieldLabel htmlFor={`${id}-target`}>
                {banner.link.kind === 'item' ? W.whichItem : W.whichCategory}
              </FieldLabel>
              <NativeSelect
                id={`${id}-target`}
                className="w-full"
                value={banner.link.targetId ?? ''}
                onChange={(e) => {
                  if (!banner.link) return;
                  onChange(
                    { ...banner, link: { ...banner.link, targetId: e.target.value || null } },
                    `${id}-target`,
                  );
                }}
              >
                {(banner.link.kind === 'item' ? items : categories).map((option) => (
                  <NativeSelectOption key={option.id} value={option.id}>
                    {option.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {banner.link.kind === 'category' ? (
                <FieldDescription>{editorWords.owned.categories(catalogName)}</FieldDescription>
              ) : null}
            </Field>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function BannersPanel({ content, update, shop, catalogName, showBanner }: PanelProps) {
  const current = useShop();
  const banners = content.look.banners;
  const [openIndex, setOpenIndex] = React.useState<number | null>(banners.length ? 0 : null);
  const [cropTarget, setCropTarget] = React.useState<CropTarget | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [area, setArea] = React.useState<CropperAreaData | null>(null);
  const cropAction = useAsyncAction();
  const { upload, problem } = useImageUpload('banner', BANNER_WIDTH);

  // The carousel in the preview shows the banner being edited.
  React.useEffect(() => {
    if (openIndex !== null) showBanner(openIndex);
  }, [openIndex, showBanner]);

  const setBanners = (fn: (list: Banner[]) => Banner[], key: string) =>
    update((c) => withBanners(c, fn(c.look.banners)), key);

  const startCrop = (file: File, index: number | null) => {
    setCrop({ x: 0, y: 0 });
    setArea(null);
    setCropTarget({ src: URL.createObjectURL(file), index });
  };

  const closeCrop = () => {
    if (cropTarget) URL.revokeObjectURL(cropTarget.src);
    setCropTarget(null);
  };

  const applyCrop = async () => {
    if (!cropTarget || !area) return;
    const target = cropTarget;
    try {
      const done = await cropAction.run(async () => {
        const cropped = await cropImage(target.src, area, BANNER_WIDTH, BANNER_HEIGHT);
        const uploaded = await upload(await dataUrlToFile(cropped));
        return uploaded ? pictureRef(uploaded) : null;
      });
      if (!done) return;
      if (target.index === null) {
        setBanners(
          (list) => [...list, { ref: done, alt: W.defaultAlt(current.name) }],
          'banner-add',
        );
        setOpenIndex(banners.length);
      } else {
        const at = target.index;
        setBanners(
          (list) => list.map((b, i) => (i === at ? { ...b, ref: done } : b)),
          `banner-photo-${at}`,
        );
      }
      closeCrop();
    } catch (err: unknown) {
      notify({ title: W.cropFailed, description: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">{banners.length ? W.intro : W.none}</p>

      {banners.length ? (
        <ul className="flex flex-col gap-2">
          {banners.map((banner, index) => (
            <BannerCard
              key={`${banner.ref.slice(0, 48)}-${index}`}
              banner={banner}
              index={index}
              count={banners.length}
              open={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              onChange={(next, key) =>
                setBanners((list) => list.map((b, i) => (i === index ? next : b)), key)
              }
              onMove={(to) => {
                setBanners((list) => {
                  const next = [...list];
                  const [moved] = next.splice(index, 1);
                  if (moved) next.splice(to, 0, moved);
                  return next;
                }, `banner-move-${index}-${to}`);
                setOpenIndex(to);
              }}
              onRemove={() => {
                setBanners((list) => list.filter((_, i) => i !== index), `banner-remove-${index}`);
                setOpenIndex(null);
                notify({ title: W.removed, tone: 'success' });
              }}
              onReplace={(file) => startCrop(file, index)}
              shop={shop}
              catalogName={catalogName}
            />
          ))}
        </ul>
      ) : null}

      {banners.length < MAX_BANNERS ? (
        <FileUpload
          accept={UPLOAD_ACCEPT}
          maxFiles={1}
          label={W.add}
          onAccept={(files) => {
            const file = files[0];
            if (file) startCrop(file, null);
          }}
        >
          <FileUploadTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full border-dashed md:h-10"
              />
            }
          >
            <ImagePlusIcon />
            {W.add}
          </FileUploadTrigger>
        </FileUpload>
      ) : (
        <p className="text-sm text-muted-foreground">{W.full}</p>
      )}
      {problem ? (
        <p className="text-sm text-destructive" role="alert">
          {problem}
        </p>
      ) : null}

      {banners.length > 1 ? (
        <Field>
          <FieldLabel>{W.seconds}</FieldLabel>
          <ToggleGroup
            value={[String(content.look.bannerSeconds)]}
            onValueChange={(value) => {
              const seconds = SECONDS.find((n) => String(n) === value[0]);
              if (seconds) {
                update((c) => ({ ...c, look: { ...c.look, bannerSeconds: seconds } }), 'seconds');
              }
            }}
            className="w-full rounded-xl border border-border/80 bg-muted/50 p-0.5"
          >
            {SECONDS.map((n) => (
              <ToggleGroupItem
                key={n}
                value={String(n)}
                className="h-10 flex-1 rounded-lg text-sm font-medium text-muted-foreground tabular-nums aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-8"
              >
                {W.secondsN(n)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>{W.motion}</FieldDescription>
        </Field>
      ) : null}

      <Dialog open={cropTarget !== null} onOpenChange={(open) => !open && closeCrop()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{W.cropTitle}</DialogTitle>
            <DialogDescription>{W.cropHelp}</DialogDescription>
          </DialogHeader>
          {cropTarget ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
              <Cropper
                aspectRatio={16 / 9}
                crop={crop}
                onCropChange={setCrop}
                onCropAreaChange={(_, pixels) => setArea(pixels)}
                className="size-full"
              >
                <CropperImage src={cropTarget.src} alt="" />
                <CropperArea />
              </Cropper>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" className="h-11 md:h-9" onClick={closeCrop}>
              {W.cropCancel}
            </Button>
            <AsyncButton
              className="h-11 font-semibold md:h-9"
              status={cropAction.status}
              busyLabel={actionWords.applying}
              doneLabel={actionWords.applied}
              disabled={!area}
              onClick={() => void applyCrop()}
            >
              {W.cropDone}
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
