import * as React from 'react';
import {
  ArrowLeftIcon,
  CameraIcon,
  MinusIcon,
  PaletteIcon,
  PlusIcon,
  ShuffleIcon,
} from 'lucide-react';
import {
  OWNER_AVATAR_STYLES,
  OWNER_FACE_SEEDS,
  OWNER_FACES_PER_STYLE,
  UPLOAD_ACCEPT,
  errorWords,
  ownerAvatarFile,
  settingsWords,
  type AvatarTheme,
  type FaceRecipe,
  type OwnerAvatar,
  type OwnerAvatarStyle,
} from '@smartapp/core';
import { cropImage, errorCodeOf, useSaveProfile } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { ButtonGroup, ButtonGroupText } from '@smartapp/ui/components/button-group';
import { Cropper, CropperArea, CropperImage } from '@smartapp/ui/components/cropper';
import { Scroller } from '@smartapp/ui/components/scroller';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { FaceCustomiser } from '@smartapp/ui/compositions/face-customiser';
import { notify } from '@smartapp/ui/compositions/notify';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { cn } from 'cn';
import { uploadProblemText, useImageUpload } from '@/app/image-upload-row';
import { AVATAR_BG, OwnerAvatarView, THEME_ORDER, rememberPhoto } from '@/app/owner-avatar';

const W = settingsWords.avatar;
const TABS = ['faces', 'photo'] as const;
type Tab = (typeof TABS)[number];
type StyleChoice = OwnerAvatarStyle | 'initials';
const STYLE_CHOICES: readonly StyleChoice[] = [...OWNER_AVATAR_STYLES, 'initials'];
const PROFILE_SIDE = 256;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function themeOf(avatar: OwnerAvatar): AvatarTheme {
  return avatar.kind === 'photo' ? 'sky' : avatar.theme;
}

function styleOf(avatar: OwnerAvatar): StyleChoice {
  if (avatar.kind === 'face') return avatar.style;
  if (avatar.kind === 'custom') return avatar.recipe.style;
  if (avatar.kind === 'initials') return 'initials';
  return 'soft';
}

/** The default face a seed draws (face 1 when the seed is not one of ours). */
function faceOfSeed(seed: string): number {
  const index = OWNER_FACE_SEEDS.findIndex((s) => s === seed);
  return index < 0 ? 1 : index + 1;
}

async function dataUrlToFile(dataUrl: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], 'profile.png', { type: blob.type || 'image/png' });
}

/**
 * Change picture (decisions T68, T93): Faces (7 styles × 12, or initials), where any face can be
 * customised piece by piece on the device, or a photo fitted in a circle and kept at 256 px. Faces and
 * customised faces use no storage.
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

function PickerBody({
  name,
  current,
  onClose,
}: {
  name: string;
  current: OwnerAvatar;
  onClose: () => void;
}) {
  const [draft, setDraft] = React.useState<OwnerAvatar>(current);
  const [tab, setTab] = React.useState<Tab>(current.kind === 'photo' ? 'photo' : 'faces');
  const [theme, setTheme] = React.useState<AvatarTheme>(themeOf(current));
  const [style, setStyle] = React.useState<StyleChoice>(styleOf(current));
  // The face being customised; null shows the 12 faces.
  const [recipe, setRecipe] = React.useState<FaceRecipe | null>(
    current.kind === 'custom' ? current.recipe : null,
  );
  const saveProfile = useSaveProfile();
  const action = useAsyncAction();

  const withTheme = (avatar: OwnerAvatar, t: AvatarTheme): OwnerAvatar =>
    avatar.kind === 'photo' ? avatar : { ...avatar, theme: t };

  const pickTheme = (t: AvatarTheme) => {
    setTheme(t);
    setDraft((d) => withTheme(d, t));
  };

  const pickStyle = (next: StyleChoice) => {
    setStyle(next);
    setRecipe(null);
    if (next === 'initials') setDraft({ kind: 'initials', theme });
    else
      setDraft({ kind: 'face', style: next, face: draft.kind === 'face' ? draft.face : 1, theme });
  };

  const customise = (s: OwnerAvatarStyle) => {
    const face = draft.kind === 'face' && draft.style === s ? draft.face : 1;
    // No pieces yet: the customiser fills them in from the face's seed when its style has loaded.
    setRecipe({ style: s, seed: OWNER_FACE_SEEDS[face - 1] ?? OWNER_FACE_SEEDS[0], parts: {} });
  };

  const backToFaces = (from: FaceRecipe) => {
    setRecipe(null);
    setDraft({ kind: 'face', style: from.style, face: faceOfSeed(from.seed), theme });
  };

  const surprise = () => {
    const styles = OWNER_AVATAR_STYLES;
    const s = styles[Math.floor(Math.random() * styles.length)] ?? 'soft';
    const t = THEME_ORDER[Math.floor(Math.random() * 6)] ?? 'sky';
    setStyle(s);
    setTheme(t);
    setRecipe(null);
    setDraft({
      kind: 'face',
      style: s,
      face: 1 + Math.floor(Math.random() * OWNER_FACES_PER_STYLE),
      theme: t,
    });
  };

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
          if (!next) return;
          setTab(next);
          if (next === 'faces' && draft.kind === 'photo') pickStyle(style);
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

        <TabsContent value="faces" className="flex flex-col gap-4">
          <Scroller orientation="horizontal" hideScrollbar className="-mx-1 px-1">
            <ToggleGroup
              aria-label={W.styleLabel}
              value={[style]}
              onValueChange={(value) => {
                const next = STYLE_CHOICES.find((s) => s === value[0]);
                if (next) pickStyle(next);
              }}
              className="w-max"
            >
              {STYLE_CHOICES.map((s) => (
                <ToggleGroupItem key={s} value={s} className="h-11 shrink-0 px-3 md:h-9">
                  {W.styles[s]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Scroller>
          {style === 'initials' ? (
            <p className="text-sm text-muted-foreground">
              {W.initialsLine(
                name
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((p) => p.charAt(0).toUpperCase())
                  .slice(0, 2)
                  .join(''),
              )}
            </p>
          ) : recipe ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Button
                  variant="outline"
                  className="h-11 md:h-9"
                  onClick={() => backToFaces(recipe)}
                >
                  <ArrowLeftIcon />
                  {W.backToFaces}
                </Button>
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">{W.customiseLine}</p>
              </div>
              <FaceCustomiser
                value={recipe}
                tileClassName={AVATAR_BG[theme]}
                onChange={(next, svg) => {
                  setRecipe(next);
                  setDraft({ kind: 'custom', recipe: next, svg, theme });
                }}
              />
            </div>
          ) : (
            <>
              {/* Fixed-size tiles (T93): a square worked out from a column width overlapped in some browsers. */}
              <div role="radiogroup" aria-label={W.styles[style]} className="flex flex-wrap gap-3">
                {Array.from({ length: OWNER_FACES_PER_STYLE }, (_, i) => i + 1).map((face) => {
                  const picked =
                    draft.kind === 'face' && draft.style === style && draft.face === face;
                  const avatar: OwnerAvatar = { kind: 'face', style, face, theme };
                  return (
                    <button
                      key={face}
                      type="button"
                      role="radio"
                      aria-checked={picked}
                      aria-label={W.face(face)}
                      onClick={() => setDraft(avatar)}
                      className={cn(
                        'size-16 shrink-0 overflow-hidden rounded-full transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:active:scale-95',
                        AVATAR_BG[theme],
                        picked && 'ring-3 ring-primary ring-offset-2 ring-offset-background',
                      )}
                    >
                      <img
                        src={ownerAvatarFile(avatar) ?? ''}
                        alt=""
                        loading="lazy"
                        className="size-full"
                      />
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="h-11 md:h-9" onClick={() => customise(style)}>
                  <PaletteIcon />
                  {W.customise}
                </Button>
                <Button variant="outline" className="h-11 md:h-9" onClick={surprise}>
                  <ShuffleIcon />
                  {W.surprise}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="photo">
          <PhotoTab
            onPicked={(avatar) => {
              setDraft(avatar);
            }}
          />
        </TabsContent>
      </Tabs>

      {draft.kind !== 'photo' ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">{W.colour}</p>
          <div role="radiogroup" aria-label={W.colour} className="flex flex-wrap gap-2">
            {THEME_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                aria-label={W.themes[t]}
                onClick={() => pickTheme(t)}
                className={cn(
                  'size-10 shrink-0 rounded-full border border-border outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  AVATAR_BG[t],
                  theme === t && 'ring-3 ring-primary ring-offset-2 ring-offset-background',
                )}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* The licence asks for credit; small print at the bottom (T93), not above the picture. */}
      <p className="text-xs text-muted-foreground">{W.credit}</p>

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
