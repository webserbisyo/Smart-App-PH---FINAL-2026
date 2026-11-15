'use client';

import * as React from 'react';
import { RotateCcwIcon, ShuffleIcon } from 'lucide-react';
import { FACE_NONE, FACE_PARTS, avatarSvgSrc, faceWords, type FaceRecipe } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Scroller } from '@smartapp/ui/components/scroller';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { loadFaceLibrary, type FaceLibrary } from '@smartapp/ui/lib/face-draw';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';

const W = faceWords;

// Small pieces show the face closer, so the change is easy to see.
const CLOSE_UP = new Set([
  'eyes',
  'eyebrows',
  'brows',
  'mouth',
  'lips',
  'nose',
  'glasses',
  'earrings',
  'freckles',
]);

// Styles drawn down to the shoulders zoom in on the head, not the middle of the picture.
const BUSTS = new Set(['sketch', 'people', 'bright']);

function partLabel(part: string): string {
  const labels: Record<string, string> = W.parts;
  return labels[part] ?? part;
}

/**
 * Customise any face (decision T93): one side-scrolling row per piece, every choice a fixed-size tile
 * showing your face with that piece, colours as dots. The style's drawing code loads when it opens and
 * every change hands back the finished SVG, so other pages never load it.
 */
export function FaceCustomiser({
  value,
  onChange,
  tileClassName,
  className,
}: {
  value: FaceRecipe;
  onChange: (recipe: FaceRecipe, svg: string) => void;
  // The colour behind each face (the owner's theme).
  tileClassName?: string | undefined;
  className?: string | undefined;
}) {
  const [loaded, setLoaded] = React.useState<{ style: string; lib: FaceLibrary } | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [tries, setTries] = React.useState(0);
  // The previews follow a moment behind, so the big face changes at once on a slow phone.
  const shown = React.useDeferredValue(value);
  // The latest value and callback, for the drawing handed back once the style has loaded.
  const latest = React.useRef({ value, onChange });
  React.useEffect(() => {
    latest.current = { value, onChange };
  });
  const style = value.style;
  const lib = loaded?.style === style ? loaded.lib : null;

  React.useEffect(() => {
    let live = true;
    loadFaceLibrary(style)
      .then((next) => {
        if (!live) return;
        setLoaded({ style, lib: next });
        // A default face arrives with no pieces: they come from its seed, so it looks the same.
        const now = latest.current.value;
        const start = Object.keys(now.parts).length === 0 ? next.recipeFor(now.seed) : now;
        latest.current.onChange(start, next.draw(start));
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [style, tries]);

  const change = (next: FaceRecipe) => {
    if (lib) onChange(next, lib.draw(next));
  };

  const surprise = () => {
    if (!lib) return;
    const parts = { ...value.parts };
    for (const part of FACE_PARTS[style]) {
      const { values } = lib.choices(part);
      const optional = values[0] === FACE_NONE;
      // Optional pieces now and then, so most surprises stay simple.
      const pool =
        optional && Math.random() < 0.6 ? [FACE_NONE] : values.filter((v) => v !== FACE_NONE);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) parts[part] = pick;
    }
    change({ ...value, parts });
  };

  if (failed) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 py-4">
        <p className="text-sm text-muted-foreground">{W.drawFailed}</p>
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
    );
  }

  if (!lib) {
    return (
      <div aria-busy="true" className={cn('flex flex-col gap-4', className)}>
        <span className="sr-only">{W.loadingPieces}</span>
        {Array.from({ length: 3 }, (_, row) => (
          <div key={row} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="size-14 shrink-0 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-4', className)}>
      {FACE_PARTS[style].map((part) => (
        <PartRow
          key={part}
          part={part}
          lib={lib}
          value={value}
          shown={shown}
          tileClassName={tileClassName}
          onPick={(choice) => change({ ...value, parts: { ...value.parts, [part]: choice } })}
        />
      ))}
      <Button type="button" variant="outline" className="h-11 self-start md:h-9" onClick={surprise}>
        <ShuffleIcon aria-hidden="true" />
        {W.surprise}
      </Button>
    </div>
  );
}

function PartRow({
  part,
  lib,
  value,
  shown,
  tileClassName,
  onPick,
}: {
  part: string;
  lib: FaceLibrary;
  value: FaceRecipe;
  shown: FaceRecipe;
  tileClassName?: string | undefined;
  onPick: (choice: string) => void;
}) {
  const label = partLabel(part);
  const { values, colour } = lib.choices(part);
  const previews = React.useMemo(
    () =>
      colour
        ? []
        : values.map((choice) =>
            avatarSvgSrc(lib.draw({ ...shown, parts: { ...shown.parts, [part]: choice } }, 64)),
          ),
    [colour, values, lib, shown, part],
  );
  const current = value.parts[part] ?? values[0] ?? FACE_NONE;
  return (
    <div data-slot="face-part" className="flex min-w-0 flex-col gap-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <Scroller orientation="horizontal" hideScrollbar className="-mx-1 px-1">
        <ToggleGroup
          aria-label={label}
          value={[current]}
          onValueChange={(picked) => {
            const next = picked[0];
            if (typeof next === 'string') onPick(next);
          }}
          spacing={1}
          className="w-max gap-2 py-1"
        >
          {values.map((choice, index) =>
            colour ? (
              <ToggleGroupItem
                key={choice}
                value={choice}
                aria-label={choice === FACE_NONE ? W.none : W.colourChoice(label, choice)}
                className="size-11 shrink-0 rounded-full p-0 hover:bg-transparent aria-pressed:bg-transparent"
              >
                <span
                  aria-hidden="true"
                  style={cssVars({ '--swatch': `#${choice}` })}
                  className={cn(
                    'size-8 rounded-full border border-border bg-(--swatch) ring-offset-2 ring-offset-background',
                    choice === current && 'ring-3 ring-primary',
                  )}
                />
              </ToggleGroupItem>
            ) : (
              <ToggleGroupItem
                key={choice}
                value={choice}
                aria-label={
                  choice === FACE_NONE
                    ? W.none
                    : W.choice(label, values[0] === FACE_NONE ? index : index + 1)
                }
                className={cn(
                  'size-14 shrink-0 overflow-hidden rounded-full p-0 ring-2 ring-transparent transition duration-fast aria-pressed:ring-primary motion-safe:active:scale-95',
                  tileClassName ?? 'bg-muted',
                )}
              >
                <img
                  src={previews[index]}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={cn(
                    'size-full',
                    CLOSE_UP.has(part) && 'scale-150',
                    CLOSE_UP.has(part) && BUSTS.has(shown.style) && 'origin-top',
                  )}
                />
              </ToggleGroupItem>
            ),
          )}
        </ToggleGroup>
      </Scroller>
    </div>
  );
}
