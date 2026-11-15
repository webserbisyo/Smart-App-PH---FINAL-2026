import * as React from 'react';
import { CameraIcon, MinusIcon, PlusIcon } from 'lucide-react';
import {
  UPLOAD_ACCEPT,
  errorWords,
  faceWords,
  settingsWords,
  type OwnerAvatar,
} from '@smartapp/core';
import { cropImage, errorCodeOf, useSaveProfile } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { ButtonGroup, ButtonGroupText } from '@smartapp/ui/components/button-group';
import { Cropper, CropperArea, CropperImage } from '@smartapp/ui/components/cropper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { FacePicker } from '@smartapp/ui/compositions/face-picker';
import { notify } from '@smartapp/ui/compositions/notify';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { uploadProblemText, useImageUpload } from '@/app/image-upload-row';
import { OwnerAvatarView, rememberPhoto } from '@/app/owner-avatar';

const W = settingsWords.avatar;
const TABS = ['faces', 'photo'] as const;
type Tab = (typeof TABS)[number];
const PROFILE_SIDE = 256;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function dataUrlToFile(dataUrl: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], 'profile.png', { type: blob.type || 'image/png' });
}

/**
 * Change picture (decisions T68, T93): Faces (7 styles × 12, or initials), where any face can be
 * customised piece by piece on the device, or a photo fitted in a circle and kept at 256 px. Faces and
 * customised faces use no storage. The Faces tab is the shared FacePicker, the same one members use (T95).
 */
export function AvatarPicker({
  open,
  onOpenChange,
  name,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  current: OwnerAvatar;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={W.title}
      description={W.description}
      scroll
    >
      {open ? (
        <PickerBody name={name} current={current} onClose={() => onOpenChange(false)} />
      ) : null}
    </ResponsiveDialog>
  );
}

const FIRST_FACE: OwnerAvatar = { kind: 'face', style: 'soft', face: 1, theme: 'sky' };

function PickerBody({
  name,
  current,
  onClose,
}: {
  name: string;
  current: OwnerAvatar;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState<Tab>(current.kind === 'photo' ? 'photo' : 'faces');
  // The Faces tab's pick and the Photo tab's pick; the open tab's one is used.
  const [face, setFace] = React.useState<OwnerAvatar>(
    current.kind === 'photo' ? FIRST_FACE : current,
  );
  const [photo, setPhoto] = React.useState<OwnerAvatar | null>(
    current.kind === 'photo' ? current : null,
  );
  const draft = tab === 'photo' && photo ? photo : face;
  const saveProfile = useSaveProfile();
  const action = useAsyncAction();

  const use = async () => {
    try {
      await action.run(() => saveProfile.mutateAsync({ name, avatar: draft }));
      notify({ title: W.saved, tone: 'success' });
      onClose();
    } catch (err) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-center">
        <OwnerAvatarView
          avatar={draft}
          name={name}
          className="size-24 text-2xl shadow-md ring-4 ring-background"
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next = TABS.find((t) => t === value);
          if (next) setTab(next);
        }}
        className="gap-4"
      >
        <TabsList className="grid w-full grid-cols-2 group-data-horizontal/tabs:h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="h-11 md:h-9">
              {W.tabs[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="faces">
          <FacePicker value={face} name={name} onChange={setFace} />
        </TabsContent>

        <TabsContent value="photo">
          <PhotoTab onPicked={setPhoto} />
        </TabsContent>
      </Tabs>

      {/* The licence asks for credit; small print at the bottom (T93), not above the picture. */}
      <p className="text-xs text-muted-foreground">{faceWords.credit}</p>

      <ResponsiveDialogFooter>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="h-11 md:h-9" onClick={onClose}>
            {W.cancel}
          </Button>
          <AsyncButton
            status={action.status}
            busyLabel={settingsWords.saving}
            doneLabel={settingsWords.saved}
            className="h-11 font-semibold md:h-9"
            onClick={() => void use()}
          >
            {W.use}
          </AsyncButton>
        </div>
      </ResponsiveDialogFooter>
    </div>
  );
}

/** Pick a photo, fit it in the circle (DiceUI Cropper), then the shared upload step keeps 256 px. */
function PhotoTab({ onPicked }: { onPicked: (avatar: OwnerAvatar) => void }) {
  const { upload, busy, problem } = useImageUpload('avatar', PROFILE_SIDE);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [source, setSource] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [area, setArea] = React.useState<PixelArea | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cropping, setCropping] = React.useState(false);

  React.useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source);
    },
    [source],
  );

  const apply = async () => {
    if (!source || !area) return;
    setCropping(true);
    try {
      const file = await dataUrlToFile(await cropImage(source, area, PROFILE_SIDE));
      const done = await upload(file);
      if (done) {
        rememberPhoto(done.ref, done.preview);
        onPicked({ kind: 'photo', ref: done.ref, bytes: done.image.after });
        setSource(null);
      }
    } catch {
      setError(settingsWords.upload.unreadable);
    } finally {
      setCropping(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{W.photoLine}</p>
      <input
        ref={fileRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label={W.pickPhoto}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          setError(null);
          if (!file) return;
          if (file.size > 15 * 1024 * 1024) {
            setError(uploadProblemText({ ok: false, problem: 'too_big', bytes: file.size }));
            return;
          }
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setSource(URL.createObjectURL(file));
        }}
      />
      {source ? (
        <>
          <div className="relative h-64 overflow-hidden rounded-xl bg-muted">
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
            >
              <CropperImage src={source} alt="" />
              <CropperArea />
            </Cropper>
          </div>
          <ButtonGroup aria-label={W.zoom} className="self-center">
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={W.zoomOut}
              disabled={zoom <= MIN_ZOOM}
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.25))}
            >
              <MinusIcon />
            </Button>
            <ButtonGroupText className="h-11 w-16 justify-center bg-background tabular-nums">
              {zoom.toFixed(1)}×
            </ButtonGroupText>
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={W.zoomIn}
              disabled={zoom >= MAX_ZOOM}
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.25))}
            >
              <PlusIcon />
            </Button>
          </ButtonGroup>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1 md:h-9"
              onClick={() => setSource(null)}
            >
              {W.back}
            </Button>
            <AsyncButton
              status={cropping || busy ? 'loading' : 'idle'}
              busyLabel={settingsWords.upload.shrinking}
              doneLabel={settingsWords.saved}
              className="h-11 flex-1 md:h-9"
              disabled={!area}
              onClick={() => void apply()}
            >
              {W.usePhoto}
            </AsyncButton>
          </div>
        </>
      ) : (
        <Button
          variant="outline"
          className="h-11 self-start md:h-9"
          onClick={() => fileRef.current?.click()}
        >
          <CameraIcon />
          {W.pickPhoto}
        </Button>
      )}
      {error || problem ? (
        <p role="alert" className="text-sm text-destructive-text">
          {error ?? problem}
        </p>
      ) : null}
    </div>
  );
}
