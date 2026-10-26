'use client';

import { useId, useRef, useState, type ChangeEvent } from 'react';
import { CameraIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { AVATAR_SETS, AvatarSetEnum, avatarChoices, words, type AvatarSet } from '@smartapp/core';
import {
  blobToDataUrl,
  compressImage,
  cropImage,
  saveMyAvatar,
  type CustomerAvatar,
  type PixelArea,
} from '@smartapp/data';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { Button } from '@smartapp/ui/components/button';
import { Cropper, CropperArea, CropperImage } from '@smartapp/ui/components/cropper';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { notify } from '@smartapp/ui/compositions/notify';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { initials } from '@smartapp/ui/compositions/shop-image';

const W = words.account.avatar;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
// The photo is made smaller before cropping, so the cropper stays quick on an old phone.
const CROP_SOURCE_SIDE = 1200;

export interface AvatarPickerProps {
  readonly slug: string;
  readonly name: string;
  // The picture shown now (a face path or a cropped photo).
  readonly current: string;
}

type Step = 'pick' | 'crop';

function draftOf(src: string): CustomerAvatar {
  return src.startsWith('data:') ? { kind: 'photo', dataUrl: src } : { kind: 'face', path: src };
}

function srcOf(draft: CustomerAvatar): string {
  return draft.kind === 'photo' ? draft.dataUrl : draft.path;
}

function setOf(src: string): AvatarSet {
  const prefix = AvatarSetEnum.safeParse(src.split('/').pop()?.split('-')[0]);
  return prefix.success ? prefix.data : 'notionists';
}

/**
 * The member's picture (decisions R23, R24): three face styles of 12 (DiceBear), or their own photo
 * fitted in a circle with the DiceUI Cropper. A demo for now: the picture stays on this phone.
 */
export function AvatarPicker({ slug, name, current }: AvatarPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('pick');
  const [draft, setDraft] = useState<CustomerAvatar>(() => draftOf(current));
  const [set, setSet] = useState<AvatarSet>(() => setOf(current));
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState<PixelArea | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openPicker() {
    setDraft(draftOf(current));
    setSet(setOf(current));
    setStep('pick');
    setError(null);
    setOpen(true);
  }

  async function pickPhoto(file: File) {
    setError(null);
    setBusy(true);
    try {
      const blob = await compressImage(file, { maxSide: CROP_SOURCE_SIDE });
      setSource(await blobToDataUrl(blob));
      setCrop({ x: 0, y: 0 });
      setZoom(MIN_ZOOM);
      setArea(null);
      setStep('crop');
    } catch {
      setError(W.unreadable);
    } finally {
      setBusy(false);
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void pickPhoto(file);
  }

  async function applyCrop() {
    if (!source || !area) return;
    setBusy(true);
    try {
      setDraft({ kind: 'photo', dataUrl: await cropImage(source, area) });
      setStep('pick');
    } catch {
      setError(W.unreadable);
      setStep('pick');
    } finally {
      setBusy(false);
    }
  }

  function save(avatar: CustomerAvatar | null) {
    saveMyAvatar(slug, avatar);
    setOpen(false);
    notify({ title: W.saved, tone: 'success' });
  }

  const zoomBy = (delta: number) =>
    setZoom((value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value + delta)));
  const picked = draft.kind === 'face' ? draft.path : null;

  return (
    <>
      <button
        type="button"
        id="account-avatar"
        aria-label={W.change}
        onClick={openPicker}
        className="relative shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar className="size-16 ring-4 ring-card">
          <AvatarImage src={current} alt="" />
          <AvatarFallback className="bg-member text-lg font-semibold text-member-foreground">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full bg-card text-foreground shadow-sm ring-2 ring-member-soft"
        >
          <CameraIcon className="size-3.5" />
        </span>
      </button>

      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={step === 'crop' ? W.cropTitle : W.title}
        description={step === 'crop' ? W.cropHint : W.hint}
        scroll
      >
        {step === 'crop' && source ? (
          <div id="avatar-crop" className="flex flex-col gap-4">
            <div className="relative h-72 overflow-hidden rounded-2xl bg-muted sm:h-80">
              <Cropper
                aspectRatio={1}
                shape="circle"
                crop={crop}
                zoom={zoom}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropAreaChange={(_, pixels) => setArea(pixels)}
                role="group"
                aria-label={W.cropArea}
                aria-describedby={hintId}
                className="focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                <CropperImage src={source} alt="" />
                <CropperArea />
              </Cropper>
            </div>
            <p id={hintId} className="sr-only">
              {W.cropHint}
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 rounded-full"
                aria-label={W.zoomOut}
                disabled={zoom <= MIN_ZOOM}
                onClick={() => zoomBy(-ZOOM_STEP)}
              >
                <MinusIcon aria-hidden="true" />
              </Button>
              <span className="w-12 text-center text-sm font-medium text-muted-foreground tabular">
                {`${zoom.toFixed(1)}×`}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 rounded-full"
                aria-label={W.zoomIn}
                disabled={zoom >= MAX_ZOOM}
                onClick={() => zoomBy(ZOOM_STEP)}
              >
                <PlusIcon aria-hidden="true" />
              </Button>
            </div>
            <ResponsiveDialogFooter>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 flex-1 rounded-full text-base"
                  onClick={() => setStep('pick')}
                >
                  {W.back}
                </Button>
                <Button
                  type="button"
                  id="avatar-use-photo"
                  className="h-12 flex-1 gap-2 rounded-full text-base font-semibold"
                  disabled={!area || busy}
                  onClick={() => void applyCrop()}
                >
                  {busy ? <Spinner aria-hidden="true" /> : null}
                  {W.usePhoto}
                </Button>
              </div>
            </ResponsiveDialogFooter>
          </div>
        ) : (
          <div id="avatar-picker" className="flex flex-col gap-5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-label={W.upload}
              onChange={handleFile}
            />
            <div className="flex items-center gap-4">
              <Avatar className="size-20 ring-4 ring-member-soft">
                <AvatarImage src={srcOf(draft)} alt="" />
                <AvatarFallback className="bg-member text-xl font-semibold text-member-foreground">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Button
                  type="button"
                  id="avatar-upload"
                  variant="outline"
                  className="h-11 gap-2 rounded-full"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  {busy ? (
                    <Spinner aria-hidden="true" />
                  ) : (
                    <CameraIcon aria-hidden="true" className="size-4" />
                  )}
                  {W.upload}
                </Button>
                {error ? (
                  <p role="alert" className="text-sm text-destructive-text">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>

            <Tabs
              value={set}
              onValueChange={(value) => {
                const next = AvatarSetEnum.safeParse(value);
                if (next.success) setSet(next.data);
              }}
              className="gap-4"
            >
              <TabsList
                aria-label={W.setsLabel}
                className="grid w-full grid-cols-3 rounded-full p-1 group-data-horizontal/tabs:h-auto"
              >
                {AVATAR_SETS.map((key) => (
                  <TabsTrigger key={key} value={key} className="h-11 rounded-full text-base">
                    {W.sets[key]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {AVATAR_SETS.map((key) => (
                <TabsContent key={key} value={key}>
                  <ToggleGroup
                    aria-label={W.sets[key]}
                    value={picked ? [picked] : []}
                    onValueChange={(value) => {
                      const path = value[0];
                      if (path) setDraft({ kind: 'face', path });
                    }}
                    className="grid w-full grid-cols-4 gap-3 sm:grid-cols-6"
                  >
                    {avatarChoices(key).map((path, index) => (
                      <ToggleGroupItem
                        key={path}
                        value={path}
                        aria-label={W.pick(index + 1)}
                        className="aspect-square h-auto w-full rounded-full bg-muted/60 p-0.5 ring-2 ring-transparent transition duration-fast hover:bg-muted aria-pressed:bg-member-soft aria-pressed:ring-member motion-safe:active:scale-95"
                      >
                        <Avatar className="size-full after:hidden">
                          <AvatarImage src={path} alt="" loading="lazy" decoding="async" />
                        </Avatar>
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </TabsContent>
              ))}
            </Tabs>

            <ResponsiveDialogFooter>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-12 rounded-full text-base sm:flex-1"
                  onClick={() => save(null)}
                >
                  {W.reset}
                </Button>
                <Button
                  type="button"
                  id="avatar-save"
                  className="h-12 rounded-full text-base font-semibold sm:flex-1"
                  onClick={() => save(draft)}
                >
                  {W.save}
                </Button>
              </div>
            </ResponsiveDialogFooter>
          </div>
        )}
      </ResponsiveDialog>
    </>
  );
}
