'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CameraIcon, SmilePlusIcon } from 'lucide-react';
import { JOIN_FACES, memberPictureWords, ownerAvatarFile, type OwnerAvatar } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription } from '@smartapp/ui/components/field';
import { AVATAR_BG, PersonAvatar } from '@smartapp/ui/compositions/person-avatar';
import { cn } from '@smartapp/ui/lib/utils';
import { NewsBox } from '../../news/news-box';

// The full picker loads only when More or Photo is tapped (decision R49).
const AvatarPickerDialog = dynamic(
  () => import('./avatar-picker-dialog').then((m) => m.AvatarPickerDialog),
  { ssr: false },
);

const W = memberPictureWords.join;

function same(a: OwnerAvatar | null, b: OwnerAvatar): boolean {
  return a !== null && JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Pick your face on the join form (decision T95): six faces side by side (no question about who you are),
 * More faces for every style and Customise, or a photo. Optional: skipping gives a Fun face.
 * Below it, the unticked Send me shop news box (decision T106).
 */
export function JoinFace({
  slug,
  name,
  value,
  onChange,
}: {
  slug: string;
  name: string;
  value: OwnerAvatar | null;
  onChange: (avatar: OwnerAvatar | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState(false);
  // A new number per open remounts the picker, so it starts from the face picked now.
  const [opens, setOpens] = useState(0);
  const own = value !== null && !JOIN_FACES.some((f) => same(value, f)) ? value : null;

  const openPicker = (onPhoto: boolean) => {
    setPhoto(onPhoto);
    setOpens((n) => n + 1);
    setOpen(true);
  };

  return (
    <>
      <Field>
        <p id="join-face-label" className="text-sm font-medium">
          {W.face} <span className="font-normal text-muted-foreground">· {W.faceOptional}</span>
        </p>
        <div
          role="radiogroup"
          aria-labelledby="join-face-label"
          className="grid max-w-sm grid-cols-6 gap-1.5"
        >
          {own ? (
            <button
              type="button"
              role="radio"
              aria-checked
              aria-label={W.facePicked}
              onClick={() => onChange(null)}
              className="aspect-square w-full rounded-full ring-3 ring-shop-10 ring-offset-2 ring-offset-card outline-none focus-visible:ring-ring/50"
            >
              <PersonAvatar avatar={own} name={name || '?'} className="size-full" />
            </button>
          ) : null}
          {/* A face from More takes the last place, so the row stays six. */}
          {(own ? JOIN_FACES.slice(0, 5) : JOIN_FACES).map((face, index) => {
            const picked = same(value, face);
            return (
              <button
                key={index}
                type="button"
                role="radio"
                aria-checked={picked}
                aria-label={W.faceChoice(index + 1)}
                // Tap the picked face again to skip.
                onClick={() => onChange(picked ? null : face)}
                className={cn(
                  'aspect-square w-full min-w-11 overflow-hidden rounded-full transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:active:scale-95',
                  face.kind === 'face' ? AVATAR_BG[face.theme] : null,
                  picked && 'ring-3 ring-shop-10 ring-offset-2 ring-offset-card',
                )}
              >
                <img
                  src={ownerAvatarFile(face) ?? ''}
                  alt=""
                  decoding="async"
                  className="size-full"
                />
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2 rounded-full"
            onClick={() => openPicker(false)}
          >
            <SmilePlusIcon aria-hidden="true" className="size-4" />
            {W.faceMore}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2 rounded-full"
            onClick={() => openPicker(true)}
          >
            <CameraIcon aria-hidden="true" className="size-4" />
            {W.facePhoto}
          </Button>
        </div>
        <FieldDescription>{W.faceHint}</FieldDescription>
        {opens > 0 ? (
          <AvatarPickerDialog
            key={opens}
            slug={slug}
            name={name || '?'}
            current={{
              kind: 'avatar',
              avatar: value ?? JOIN_FACES[0] ?? { kind: 'initials', theme: 'sky' },
            }}
            open={open}
            onOpenChange={setOpen}
            startOnPhoto={photo}
            onPick={onChange}
          />
        ) : null}
      </Field>
      {/* Shop news (T106): unticked; it rides in this late part so Join's first JS stays the same. */}
      <NewsBox slug={slug} place="join" />
    </>
  );
}
