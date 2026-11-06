import * as React from 'react';
import { editorWords } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';

const W = editorWords.brand;

// The logo is drawn on a 480 px canvas shown at 240 px (sharp on phones); the loupe shows 11 x 11 of it.
const SIDE = 480;
const SHOWN = 240;
const ZOOM_CELLS = 11;
const LOUPE = 176;
const KEY_STEP = 8;

interface Point {
  x: number;
  y: number;
}

function hexOf(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/**
 * "Tap your logo" (decision T73, hand-written with the founder's yes): drag over the logo, a loupe shows the
 * pixels under the finger, and letting go uses that colour. Arrow keys move the point and Enter picks it.
 */
export function LogoLoupe({
  image,
  onPick,
  onDone,
}: {
  image: HTMLImageElement;
  onPick: (hex: string) => void;
  onDone: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const loupeRef = React.useRef<HTMLCanvasElement>(null);
  const [point, setPoint] = React.useState<Point | null>(null);
  const [hex, setHex] = React.useState<string | null>(null);
  const dragging = React.useRef(false);
  const last = React.useRef<Point | null>(null);

  const colourAt = (at: Point | null): string | null => {
    const context = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!context || !at) return null;
    const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(at.x, at.y, 1, 1).data;
    return a >= 128 ? hexOf(r, g, b) : null;
  };

  const moveTo = (next: Point) => {
    last.current = next;
    setPoint(next);
    setHex(colourAt(next));
  };

  // Draw the logo once, fitted inside the square.
  React.useEffect(() => {
    const context = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.clearRect(0, 0, SIDE, SIDE);
    const scale = Math.min(SIDE / image.naturalWidth, SIDE / image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    context.drawImage(image, (SIDE - w) / 2, (SIDE - h) / 2, w, h);
  }, [image]);

  // The colour under the point, and the zoomed loupe around it.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !point) return;
    const loupe = loupeRef.current?.getContext('2d');
    if (!loupe) return;
    const half = Math.floor(ZOOM_CELLS / 2);
    const cell = LOUPE / ZOOM_CELLS;
    loupe.imageSmoothingEnabled = false;
    loupe.clearRect(0, 0, LOUPE, LOUPE);
    loupe.drawImage(
      canvas,
      point.x - half,
      point.y - half,
      ZOOM_CELLS,
      ZOOM_CELLS,
      0,
      0,
      LOUPE,
      LOUPE,
    );
    loupe.lineWidth = 2;
    loupe.strokeStyle = 'white';
    loupe.strokeRect(half * cell, half * cell, cell, cell);
    loupe.strokeStyle = 'black';
    loupe.strokeRect(half * cell - 2, half * cell - 2, cell + 4, cell + 4);
  }, [point]);

  const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.max(0, Math.min(SIDE - 1, Math.round(v)));
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * SIDE),
      y: clamp(((event.clientY - rect.top) / rect.height) * SIDE),
    };
  };

  // Read at the moment of letting go, so a quick tap picks too.
  const pick = () => {
    const picked = colourAt(last.current);
    if (picked) onPick(picked);
  };

  const shownX = point ? (point.x / SIDE) * SHOWN : 0;
  const shownY = point ? (point.y / SIDE) * SHOWN : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-center text-sm text-muted-foreground">{W.loupeHint}</p>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SIDE}
          height={SIDE}
          tabIndex={0}
          role="img"
          aria-label={W.loupeAria}
          className="size-60 touch-none rounded-xl border border-border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onPointerDown={(event) => {
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            moveTo(pointFrom(event));
          }}
          onPointerMove={(event) => {
            if (dragging.current) moveTo(pointFrom(event));
          }}
          onPointerUp={() => {
            dragging.current = false;
            pick();
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
          onFocus={() => {
            if (!last.current) moveTo({ x: SIDE / 2, y: SIDE / 2 });
          }}
          onKeyDown={(event) => {
            const moves: Record<string, Point> = {
              ArrowLeft: { x: -KEY_STEP, y: 0 },
              ArrowRight: { x: KEY_STEP, y: 0 },
              ArrowUp: { x: 0, y: -KEY_STEP },
              ArrowDown: { x: 0, y: KEY_STEP },
            };
            const move = moves[event.key];
            if (move) {
              event.preventDefault();
              const from = last.current ?? { x: SIDE / 2, y: SIDE / 2 };
              moveTo({
                x: Math.max(0, Math.min(SIDE - 1, from.x + move.x)),
                y: Math.max(0, Math.min(SIDE - 1, from.y + move.y)),
              });
            } else if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              pick();
            }
          }}
        />
        {point ? (
          <canvas
            ref={loupeRef}
            width={LOUPE}
            height={LOUPE}
            aria-hidden
            className={cn(
              'pointer-events-none absolute top-(--loupe-y) left-(--loupe-x) size-22 -translate-x-1/2 -translate-y-full rounded-full border-4 border-background shadow-lg',
            )}
            style={cssVars({ '--loupe-x': `${shownX}px`, '--loupe-y': `${shownY - 12}px` })}
          />
        ) : null}
      </div>
      <div className="flex min-h-11 items-center gap-2" aria-live="polite">
        {hex ? (
          <>
            <span
              className="size-6 rounded-full border border-border bg-(--picked)"
              style={cssVars({ '--picked': hex })}
              aria-hidden
            />
            <span className="font-mono text-sm">{W.picked(hex)}</span>
          </>
        ) : null}
      </div>
      <Button variant="outline" className="h-11 md:h-9" onClick={onDone}>
        {W.donePicking}
      </Button>
    </div>
  );
}
