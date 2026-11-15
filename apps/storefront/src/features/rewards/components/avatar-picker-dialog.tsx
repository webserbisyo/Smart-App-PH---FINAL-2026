'use client';

import { useId, useRef, useState, type ChangeEvent } from 'react';
import { CameraIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { faceWords, memberPictureWords, type OwnerAvatar } from '@smartapp/core';
import {
  blobToDataUrl,
  compressImage,
  cropImage,
  forgetPhonePicture,
  useSaveMyAvatar,
  type MyPicture,
  type PixelArea,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { ButtonGroup, ButtonGroupText } from '@smartapp/ui/components/button-group';
import { Cropper, CropperArea, CropperImage } from '@smartapp/ui/components/cropper';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { FacePicker } from '@smartapp/ui/compositions/face-picker';
import { notify } from '@smartapp/ui/compositions/notify';
import { PictureAvatar } from '@smartapp/ui/compositions/person-avatar';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';

const W = memberPictureWords;
const TABS = ['faces', 'photo'] as const;
type Tab = (typeof TABS)[number];
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
// The photo is made smaller before cropping, so the cropper stays quick on an old phone.
const CROP_SOURCE_SIDE = 1200;
const PHOTO_SIDE = 256;
// Shown on the Faces tab when the picture now is a photo or an older picture.
const FIRST_FACE: OwnerAvatar = { kind: 'face', style: 'people', face: 2, theme: 'sky' };

export interface AvatarPickerDialogProps {
  readonly slug: string;
  readonly name: string;
  // The picture shown now.
  readonly current: MyPicture;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  // The Photo tab first (the join form's Photo button).
  readonly startOnPhoto?: boolean | undefined;
  // Join form (T95): hand the pick back instead of saving it, as there is no account yet.
  readonly onPick?: ((avatar: OwnerAvatar) => void) | undefined;
}

/**
 * The member's picture picker (decisions R23, R24, T95): the dashboard's own picker, so members and owners
 * pick the same way. Faces: 7 styles × 12, Customise any face piece by piece, Surprise me, initials and
 * the colour behind. Photo: their own photo fitted in a circle (DiceUI Cropper). The pick is saved on the
 * member's account, so the shop sees it on their orders.
 */
export function AvatarPickerDialog({
  slug,
  name,
  current,
  open,
  onOpenChange,
  startOnPhoto = false,
  onPick,
}: AvatarPickerDialogProps) {
  const now = current.kind === 'avatar' ? current.avatar : null;
  const [tab, setTab] = useState<Tab>(startOnPhoto || now?.kind === 'photo' ? 'photo' : 'faces');
  const [face, setFace] = useState<OwnerAvatar>(now && now.kind !== 'photo' ? now : FIRST_FACE);
  const [photo, setPhoto] = useState<OwnerAvatar | null>(now?.kind === 'photo' ? now : null);
  const [cropping, setCropping] = useState(false);
  const save = useSaveMyAvatar(slug);
  const draft = tab === 'photo' ? photo : face;
  const shown: MyPicture = draft ? { kind: 'avatar', avatar: draft } : current;

  function done(avatar: OwnerAvatar | null) {
    if (onPick) {
      if (avatar) onPick(avatar);
      onOpenChange(false);
      return;
    }
    save.mutate(avatar, {
      onSuccess: () => {
        forgetPhonePicture(slug);
        onOpenChange(false);
        notify({ title: W.saved, tone: 'success' });
      },
      onError: () => notify({ title: W.saveFailed, tone: 'error' }),
    });
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={cropping ? W.cropTitle : W.title}
      description={cropping ? W.cropHint : W.hint}
      scroll
    >
      <div id="avatar-picker" className="flex flex-col gap-5">
        <PictureAvatar
          picture={shown}
          name={name}
          className="size-24 self-center text-2xl shadow-md ring-4 ring-background"
          fileClassName="bg-shop-10-soft"
        />

        <Tabs
          value={tab}
          onValueChange={(value) => {
            const next = TABS.find((t) => t === value);
            if (next) setTab(next);
          }}
          className="gap-4"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-full p-1 group-data-horizontal/tabs:h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="h-11 rounded-full text-base">
                {W.tabs[t]}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="faces">
            <FacePicker value={face} name={name} startStyle="people" onChange={setFace} />
          </TabsContent>
          <TabsContent value="photo">
            <PhotoTab onCropping={setCropping} onPicked={setPhoto} />
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{W.privacy}</p>
          {/* The licence asks for credit: small print at the bottom (T93). */}
          <p className="text-xs text-muted-foreground">{faceWords.credit}</p>
        </div>

        <ResponsiveDialogFooter>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {onPick ? null : (
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-full text-base sm:flex-1"
                disabled={save.isPending}
                onClick={() => done(null)}
              >
                {W.reset}
              </Button>
            )}
            <Button
              type="button"
              id="avatar-save"
              className="h-12 gap-2 rounded-full text-base font-semibold sm:flex-1"
              disabled={!draft || save.isPending}
              onClick={() => done(draft)}
            >
              {save.isPending ? <Spinner aria-hidden="true" /> : null}
              {onPick ? W.use : W.save}
            </Button>
          </div>
        </ResponsiveDialogFooter>
      </div>
    </ResponsiveDialog>
  );
}

/** Pick a photo and fit it in the circle; the small crop becomes the picture. */
function PhotoTab({
  onPicked,
  onCropping,
}: {
  onPicked: (avatar: OwnerAvatar) => void;
  onCropping: (cropping: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState<PixelArea | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function show(next: string | null) {
    setSource(next);
    onCropping(next !== null);
  }

  async function pickPhoto(file: File) {
    setError(null);
    setBusy(true);
    try {
      const blob = await compressImage(file, { maxSide: CROP_SOURCE_SIDE });
      setCrop({ x: 0, y: 0 });
      setZoom(MIN_ZOOM);
      setArea(null);
      show(await blobToDataUrl(blob));
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

  async function apply() {
    if (!source || !area) return;
    setBusy(true);
    try {
      const dataUrl = await cropImage(source, area, PHOTO_SIDE);
      // The mock keeps the small crop as the ref; the API takes it through the upload step (docs/api.md).
      onPicked({ kind: 'photo', ref: dataUrl, bytes: Math.round((dataUrl.length * 3) / 4) });
      show(null);
    } catch {
      setError(W.unreadable);
      show(null);
    } finally {
      setBusy(false);
    }
  }

  const zoomBy = (delta: number) =>
    setZoom((value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value + delta)));

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label={W.upload}
        onChange={handleFile}
      />
      {source ? (
        <>
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
          <ButtonGroup aria-label={W.zoom} className="self-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={W.zoomOut}
              disabled={zoom <= MIN_ZOOM}
              onClick={() => zoomBy(-ZOOM_STEP)}
            >
              <MinusIcon aria-hidden="true" />
            </Button>
            <ButtonGroupText className="h-11 w-16 justify-center bg-background tabular-nums">
              {`${zoom.toFixed(1)}×`}
            </ButtonGroupText>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={W.zoomIn}
              disabled={zoom >= MAX_ZOOM}
              onClick={() => zoomBy(ZOOM_STEP)}
            >
              <PlusIcon aria-hidden="true" />
            </Button>
          </ButtonGroup>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-full text-base"
              onClick={() => show(null)}
            >
              {W.back}
            </Button>
            <Button
              type="button"
              id="avatar-use-photo"
              className="h-12 flex-1 gap-2 rounded-full text-base font-semibold"
              disabled={!area || busy}
              onClick={() => void apply()}
            >
              {busy ? <Spinner aria-hidden="true" /> : null}
              {W.usePhoto}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{W.photoLine}</p>
          <Button
            type="button"
            id="avatar-upload"
            variant="outline"
            className="h-11 gap-2 self-start rounded-full"
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
        </>
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
