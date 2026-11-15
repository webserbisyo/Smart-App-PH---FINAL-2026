'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CameraIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import type { MyPicture } from '@smartapp/data';
import { PictureAvatar } from '@smartapp/ui/compositions/person-avatar';
import { useWhenIdle } from '../../shell/use-when-idle';

// The picker (dialog, cropper, face tabs) loads when the page is idle or the picture is touched, so the
// Account page's first JavaScript stays small (decision R49).
const AvatarPickerDialog = dynamic(
  () => import('./avatar-picker-dialog').then((m) => m.AvatarPickerDialog),
  { ssr: false },
);

const W = words.account.avatar;

export interface AvatarPickerProps {
  readonly slug: string;
  readonly name: string;
  // The picture shown now.
  readonly current: MyPicture;
}

/**
 * The member's picture with a camera badge (decisions R23, R24); a tap opens the picker. The pick is saved
 * on the member's account (T95), so the shop sees it on their orders.
 */
export function AvatarPicker({ slug, name, current }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);
  // A new number per open remounts the picker, so it starts from the picture shown now.
  const [opens, setOpens] = useState(0);
  const [loaded, load] = useWhenIdle();

  return (
    <>
      <button
        type="button"
        id="account-avatar"
        aria-label={W.change}
        aria-haspopup="dialog"
        onPointerEnter={load}
        onFocus={load}
        onClick={() => {
          load();
          setOpens((n) => n + 1);
          setOpen(true);
        }}
        className="relative shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <PictureAvatar
          picture={current}
          name={name}
          className="size-16 text-lg ring-4 ring-card"
          fileClassName="bg-shop-10-soft"
        />
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full bg-card text-foreground shadow-sm ring-2 ring-member-soft"
        >
          <CameraIcon className="size-3.5" />
        </span>
      </button>
      {loaded ? (
        <AvatarPickerDialog
          key={opens}
          slug={slug}
          name={name}
          current={current}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  );
}
