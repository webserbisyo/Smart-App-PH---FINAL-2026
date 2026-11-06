import * as React from 'react';
import { RefreshCwIcon } from 'lucide-react';
import {
  EDITOR_CHANNEL,
  PreviewToEditorSchema,
  editorWords,
  type EditorSection,
  type EditorToPreview,
  type StorefrontContent,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import { env } from '@/app/env';

const W = editorWords.preview;

export type PreviewDevice = 'phone' | 'laptop';

// The page is drawn at a real phone or laptop width, then scaled down to fit (decision T72).
const DEVICE_WIDTH: Record<PreviewDevice, number> = { phone: 390, laptop: 1280 };
// On a developer's computer the storefront builds the page the first time it opens, which can take a minute.
const READY_TIMEOUT_MS = import.meta.env.DEV ? 60_000 : 8_000;
// After this, the wait says why it is taking long.
const SLOW_AFTER_MS = 4_000;

const storefrontOrigin = new URL(env.VITE_STOREFRONT_URL).origin;

export function previewUrl(slug: string): string {
  return `${env.VITE_STOREFRONT_URL}/${slug}/preview`;
}

function useBoxSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

export interface PreviewFrameProps {
  slug: string;
  device: PreviewDevice;
  content: StorefrontContent;
  selected: EditorSection | null;
  hovered: EditorSection | null;
  /** The banner the owner is editing, so the carousel shows it. */
  banner: { index: number; at: number } | null;
  onSelect: (section: EditorSection) => void;
  /** Phone screens: the page fills the space with no device border. */
  bare?: boolean | undefined;
}

/**
 * The real storefront Home in a frame (decision T72), fed the draft over postMessage. Only messages from the
 * storefront's origin and this frame are read, and each is checked with Zod (rule E13).
 */
export function PreviewFrame({
  slug,
  device,
  content,
  selected,
  hovered,
  banner,
  onSelect,
  bare = false,
}: PreviewFrameProps) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const box = useBoxSize(boxRef);
  // Goes up each time the page says it is ready (a reload included), so the draft is sent again.
  const [session, setSession] = React.useState(0);
  const ready = session > 0;
  const [failed, setFailed] = React.useState(false);
  const [slow, setSlow] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const onSelectRef = React.useRef(onSelect);
  React.useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const send = React.useCallback((message: EditorToPreview) => {
    frameRef.current?.contentWindow?.postMessage(message, storefrontOrigin);
  }, []);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== storefrontOrigin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const parsed = PreviewToEditorSchema.safeParse(event.data);
      if (!parsed.success) return;
      if (parsed.data.type === 'ready') {
        setSession((n) => n + 1);
        setFailed(false);
      } else {
        onSelectRef.current(parsed.data.section);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // A frame that never says it is ready shows Try again.
  React.useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setFailed(true), READY_TIMEOUT_MS);
    const slowTimer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(slowTimer);
    };
  }, [ready, attempt]);

  React.useEffect(() => {
    if (session > 0) send({ channel: EDITOR_CHANNEL, type: 'draft', content });
  }, [session, content, send]);

  React.useEffect(() => {
    if (session > 0) send({ channel: EDITOR_CHANNEL, type: 'hover', section: hovered });
  }, [session, hovered, send]);
  React.useEffect(() => {
    if (session > 0 && banner) {
      send({ channel: EDITOR_CHANNEL, type: 'banner', index: banner.index });
    }
  }, [session, banner, send]);

  const width = DEVICE_WIDTH[device];
  const scale = box.width > 0 ? Math.min(1, box.width / width) : 1;
  const height = box.height > 0 ? Math.round(box.height / scale) : 0;

  // Sent again when the frame changes size (the phone panel opening), so the part stays in view.
  React.useEffect(() => {
    if (session > 0) send({ channel: EDITOR_CHANNEL, type: 'select', section: selected });
  }, [session, selected, send, height, width]);

  const retry = () => {
    setSession(0);
    setFailed(false);
    setSlow(false);
    setAttempt((n) => n + 1);
  };

  return (
    <div ref={boxRef} className="relative flex size-full min-h-0 justify-center">
      {box.width > 0 ? (
        <div
          className={cn(
            'relative h-(--box-h) w-(--box-w) shrink-0 overflow-hidden bg-background',
            !bare && 'rounded-2xl border border-border shadow-lg',
          )}
          style={cssVars({ '--box-w': `${width * scale}px`, '--box-h': `${box.height}px` })}
        >
          <iframe
            key={attempt}
            ref={frameRef}
            src={previewUrl(slug)}
            title={W.frameTitle}
            className="h-(--frame-h) w-(--frame-w) origin-top-left scale-(--frame-scale) border-0"
            style={cssVars({
              '--frame-w': `${width}px`,
              '--frame-h': `${height}px`,
              '--frame-scale': scale,
            })}
          />
          {!ready ? (
            <div className="absolute inset-0 flex flex-col gap-4 bg-background p-4" aria-busy>
              {failed ? (
                <div className="m-auto flex flex-col items-center gap-3 text-center" role="alert">
                  <p className="text-sm font-medium text-foreground">{W.failed}</p>
                  <Button variant="outline" className="h-11 md:h-9" onClick={retry}>
                    <RefreshCwIcon />
                    {W.tryAgain}
                  </Button>
                </div>
              ) : (
                <>
                  <span className="sr-only" role="status">
                    {W.loading}
                  </span>
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <Skeleton className="aspect-video w-full rounded-2xl" />
                  <Skeleton className="h-40 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  {slow ? (
                    <p className="text-center text-sm text-muted-foreground">
                      {import.meta.env.DEV ? W.slowFirst : W.slow}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
