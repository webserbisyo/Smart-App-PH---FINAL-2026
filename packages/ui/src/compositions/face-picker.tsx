'use client';

import * as React from 'react';
import { ArrowLeftIcon, PaletteIcon, ShuffleIcon } from 'lucide-react';
import {
  AVATAR_THEMES,
  OWNER_AVATAR_STYLES,
  OWNER_FACE_SEEDS,
  OWNER_FACES_PER_STYLE,
  faceWords,
  ownerAvatarFile,
  personInitials,
  type AvatarTheme,
  type FaceRecipe,
  type OwnerAvatar,
  type OwnerAvatarStyle,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Scroller } from '@smartapp/ui/components/scroller';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { FaceCustomiser } from '@smartapp/ui/compositions/face-customiser';
import { AVATAR_BG } from '@smartapp/ui/compositions/person-avatar';
import { cn } from 'cn';

const W = faceWords;
type StyleChoice = OwnerAvatarStyle | 'initials';
const STYLE_CHOICES: readonly StyleChoice[] = [...OWNER_AVATAR_STYLES, 'initials'];
const FACES = Array.from({ length: OWNER_FACES_PER_STYLE }, (_, i) => i + 1);

function themeOf(avatar: OwnerAvatar): AvatarTheme {
  return avatar.kind === 'photo' ? 'sky' : avatar.theme;
}

function styleOf(avatar: OwnerAvatar, fallback: OwnerAvatarStyle): StyleChoice {
  if (avatar.kind === 'face') return avatar.style;
  if (avatar.kind === 'custom') return avatar.recipe.style;
  if (avatar.kind === 'initials') return 'initials';
  return fallback;
}

/** The default face a seed draws (face 1 when the seed is not one of ours). */
function faceOfSeed(seed: string): number {
  const index = OWNER_FACE_SEEDS.findIndex((s) => s === seed);
  return index < 0 ? 1 : index + 1;
}

/**
 * The Faces tab of a picture picker (decisions T68, T93, T95), shared by the owner's picture and the
 * member's: 7 styles × 12 faces or initials, Customise any face piece by piece (FaceCustomiser), Surprise
 * me, and the colour behind it. Tiles have a fixed size, so they never overlap (T93). It starts from
 * `value` and reports each change; a photo is the caller's own tab.
 */
export function FacePicker({
  value,
  name,
  startStyle = 'soft',
  onChange,
  className,
}: {
  value: OwnerAvatar;
  name: string;
  // The style shown first when `value` is a photo.
  startStyle?: OwnerAvatarStyle | undefined;
  onChange: (avatar: OwnerAvatar) => void;
  className?: string | undefined;
}) {
  const [theme, setTheme] = React.useState<AvatarTheme>(themeOf(value));
  const [style, setStyle] = React.useState<StyleChoice>(styleOf(value, startStyle));
  // The face being customised; null shows the 12 faces.
  const [recipe, setRecipe] = React.useState<FaceRecipe | null>(
    value.kind === 'custom' ? value.recipe : null,
  );

  const pickTheme = (t: AvatarTheme) => {
    setTheme(t);
    if (value.kind !== 'photo') onChange({ ...value, theme: t });
    else if (style === 'initials') onChange({ kind: 'initials', theme: t });
    else onChange({ kind: 'face', style, face: 1, theme: t });
  };

  const pickStyle = (next: StyleChoice) => {
    setStyle(next);
    setRecipe(null);
    if (next === 'initials') onChange({ kind: 'initials', theme });
    else
      onChange({ kind: 'face', style: next, face: value.kind === 'face' ? value.face : 1, theme });
  };

  const customise = (s: OwnerAvatarStyle) => {
    const face = value.kind === 'face' && value.style === s ? value.face : 1;
    // No pieces yet: the customiser fills them in from the face's seed when its style has loaded.
    setRecipe({ style: s, seed: OWNER_FACE_SEEDS[face - 1] ?? OWNER_FACE_SEEDS[0], parts: {} });
  };

  const backToFaces = (from: FaceRecipe) => {
    setRecipe(null);
    onChange({ kind: 'face', style: from.style, face: faceOfSeed(from.seed), theme });
  };

  const surprise = () => {
    const s = OWNER_AVATAR_STYLES[Math.floor(Math.random() * OWNER_AVATAR_STYLES.length)] ?? 'soft';
    const t = AVATAR_THEMES[Math.floor(Math.random() * 6)] ?? 'sky';
    setStyle(s);
    setTheme(t);
    setRecipe(null);
    onChange({
      kind: 'face',
      style: s,
      face: 1 + Math.floor(Math.random() * FACES.length),
      theme: t,
    });
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <Scroller orientation="horizontal" hideScrollbar className="-mx-1 px-1">
        <ToggleGroup
          aria-label={W.styleLabel}
          value={[style]}
          onValueChange={(next) => {
            const picked = STYLE_CHOICES.find((s) => s === next[0]);
            if (picked) pickStyle(picked);
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
        <p className="text-sm text-muted-foreground">{W.initialsLine(personInitials(name))}</p>
      ) : recipe ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Button
              type="button"
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
              onChange({ kind: 'custom', recipe: next, svg, theme });
            }}
          />
        </div>
      ) : (
        <>
          {/* Fixed-size tiles (T93): a square worked out from a column width overlapped in some browsers. */}
          <div role="radiogroup" aria-label={W.styles[style]} className="flex flex-wrap gap-3">
            {FACES.map((face) => {
              const picked = value.kind === 'face' && value.style === style && value.face === face;
              const avatar: OwnerAvatar = { kind: 'face', style, face, theme };
              return (
                <button
                  key={face}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  aria-label={W.face(face)}
                  onClick={() => onChange(avatar)}
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
                    decoding="async"
                    className="size-full"
                  />
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11 md:h-9" onClick={() => customise(style)}>
              <PaletteIcon />
              {W.customise}
            </Button>
            <Button type="button" variant="outline" className="h-11 md:h-9" onClick={surprise}>
              <ShuffleIcon />
              {W.surprise}
            </Button>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">{W.colour}</p>
        <div role="radiogroup" aria-label={W.colour} className="flex flex-wrap gap-2">
          {AVATAR_THEMES.map((t) => (
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
    </div>
  );
}
