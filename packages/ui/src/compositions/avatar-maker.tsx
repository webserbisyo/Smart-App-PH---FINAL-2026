'use client';

import * as React from 'react';
import { RotateCcwIcon, ShuffleIcon } from 'lucide-react';
import {
  AVATAR_MAKE_COUNTS,
  AVATAR_MAKE_OPTIONAL,
  AVATAR_MAKE_PARTS,
  avatarMakerWords as W,
  avatarSvgSrc,
  type AvatarMake,
  type AvatarMakePart,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { loadAvatarDrawer, type DrawAvatar } from '@smartapp/ui/lib/avatar-draw';
import { cn } from 'cn';

// Face pieces are small, so their choices show the face closer.
const CLOSE_UP: readonly AvatarMakePart[] = ['eyes', 'eyebrows', 'mouth', 'glasses', 'earrings'];

function labelOf(part: AvatarMakePart, index: number): string {
  if (part === 'hairColor') return W.hairColors[index] ?? W.choice(W.parts[part], index + 1);
  if (part === 'skin') return W.skins[index] ?? W.choice(W.parts[part], index + 1);
  if (part === 'extra') return W.extras[index] ?? W.choice(W.parts[part], index);
  if (AVATAR_MAKE_OPTIONAL.includes(part))
    return index === 0 ? W.none : W.choice(W.parts[part], index);
  return W.choice(W.parts[part], index + 1);
}

function randomMake(): AvatarMake {
  const any = (part: AvatarMakePart) => Math.floor(Math.random() * AVATAR_MAKE_COUNTS[part]);
  // Extras now and then, so most surprises stay simple.
  const sometimes = (part: AvatarMakePart) => (Math.random() < 0.3 ? any(part) : 0);
  return {
    hair: any('hair'),
    hairColor: any('hairColor'),
    skin: any('skin'),
    eyes: any('eyes'),
    eyebrows: any('eyebrows'),
    mouth: any('mouth'),
    glasses: sometimes('glasses'),
    earrings: sometimes('earrings'),
    extra: sometimes('extra'),
  };
}

/**
 * Make your own picture (decision T83), the same for owners and customers: pick a piece, then one of its
 * choices, each shown on your face. The drawing code (DiceBear Adventurer) loads when the maker opens and
 * every change hands back the finished SVG, so other pages never load it.
 */
export function AvatarMaker({
  value,
  onChange,
  tileClassName,
  className,
}: {
  value: AvatarMake;
  onChange: (make: AvatarMake, svg: string) => void;
  // The colour behind each face (the owner's theme, or the shop's soft colour).
  tileClassName?: string | undefined;
  className?: string | undefined;
}) {
  const [draw, setDraw] = React.useState<DrawAvatar | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [part, setPart] = React.useState<AvatarMakePart>('hair');
  const [tries, setTries] = React.useState(0);
  // The first drawing goes to the parent once, so Save works without a change.
  const first = React.useRef({ value, onChange });

  React.useEffect(() => {
    let live = true;
    loadAvatarDrawer()
      .then((fn) => {
        if (!live) return;
        setDraw(() => fn);
        first.current.onChange(first.current.value, fn(first.current.value));
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [tries]);

  const choices = React.useMemo(() => {
    if (!draw) return [];
    return Array.from({ length: AVATAR_MAKE_COUNTS[part] }, (_, index) => ({
      index,
      label: labelOf(part, index),
      src: avatarSvgSrc(draw({ ...value, [part]: index })),
    }));
  }, [draw, part, value]);

  const change = (next: AvatarMake) => {
    if (draw) onChange(next, draw(next));
  };

  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      <ToggleGroup
        aria-label={W.partsLabel}
        value={[part]}
        onValueChange={(picked) => {
          const next = AVATAR_MAKE_PARTS.find((p) => p === picked[0]);
          if (next) setPart(next);
        }}
        variant="outline"
        className="scrollbar-none w-full min-w-0 justify-start overflow-x-auto pb-0.5"
      >
        {AVATAR_MAKE_PARTS.map((p) => (
          <ToggleGroupItem
            key={p}
            value={p}
            className="h-11 shrink-0 rounded-full px-3 aria-pressed:border-primary aria-pressed:text-primary md:h-9"
          >
            {W.parts[p]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {failed ? (
        <div role="alert" className="flex flex-col items-start gap-2 py-4">
          <p className="text-sm text-muted-foreground">{W.failed}</p>
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => {
              setFailed(false);
              setTries((n) => n + 1);
            }}
          >
            <RotateCcwIcon aria-hidden="true" />
            {W.tryAgain}
          </Button>
        </div>
      ) : !draw ? (
        <div aria-busy="true" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          <span className="sr-only">{W.loading}</span>
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-full" />
          ))}
        </div>
      ) : (
        <ToggleGroup
          aria-label={W.parts[part]}
          value={[String(value[part])]}
          onValueChange={(picked) => {
            const index = Number(picked[0]);
            if (picked[0] !== undefined && Number.isInteger(index))
              change({ ...value, [part]: index });
          }}
          className="grid max-h-72 w-full grid-cols-4 gap-2 overflow-y-auto overscroll-contain p-1 sm:grid-cols-6"
        >
          {choices.map((choice) => (
            <ToggleGroupItem
              key={choice.index}
              value={String(choice.index)}
              aria-label={choice.label}
              title={choice.label}
              className={cn(
                'aspect-square h-auto w-full overflow-hidden rounded-full p-0 ring-2 ring-transparent transition duration-fast aria-pressed:ring-primary motion-safe:active:scale-95',
                tileClassName ?? 'bg-muted',
              )}
            >
              <img
                src={choice.src}
                alt=""
                decoding="async"
                className={cn('size-full', CLOSE_UP.includes(part) && 'scale-150')}
              />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      <Button
        type="button"
        variant="outline"
        className="h-11 self-start md:h-9"
        disabled={!draw}
        onClick={() => change(randomMake())}
      >
        <ShuffleIcon aria-hidden="true" />
        {W.surprise}
      </Button>
    </div>
  );
}
