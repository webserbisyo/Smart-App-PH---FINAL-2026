'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { imageUrl, words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from '@smartapp/ui/lib/utils';
import { DownloadIcon, ImageOffIcon, Maximize2Icon, RotateCwIcon } from 'lucide-react';

// The bigger QR loads only when someone taps it.
const QrViewer = dynamic(() => import('./qr-viewer').then((m) => m.QrViewer), { ssr: false });

const Q = words.checkout.qr;

/** The address to show: a demo or saved QR at 640 px, or a picture the owner just added. */
export function qrSrc(ref: string): string | null {
  if (/^(blob:|data:|https?:\/\/)/.test(ref)) return ref;
  return imageUrl(ref, 640);
}

// A PNG of the QR, because some payment apps can't read a WebP from the gallery.
async function qrPng(src: string): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('unreadable_image');
  ctx.drawImage(img, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('unreadable_image'))), 'image/png'),
  );
}

/**
 * Save the QR to the phone (decision T107): the share sheet's "Save image" where the phone has one,
 * otherwise a download. GCash's own steps for paying online are: save or screenshot the QR, then
 * Upload QR in the app.
 */
async function saveQr(src: string, name: string): Promise<'saved' | 'cancelled'> {
  const file = new File([await qrPng(src)], `${name.replace(/[^\w -]/g, '')}.png`, {
    type: 'image/png',
  });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'saved';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      throw err;
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return 'saved';
}

export interface PayQrProps {
  // The owner's QR (a media ref).
  readonly qr: string;
  // "GCash", "QR Ph", "BPI".
  readonly method: string;
  readonly accountName: string | null;
  // "₱450", for the steps.
  readonly amount: string;
  readonly shopName: string;
  readonly sample: boolean;
}

/**
 * The QR to pay with, on checkout and on the receipt (T107). Always dark on white with a white border
 * (many scanners fail on a QR over the shop's colour). Phone: Save QR and three steps, since a phone
 * can't scan its own screen. Desktop: scan it with a phone. Tap the QR to see it bigger.
 */
export function PayQr({ qr, method, accountName, amount, shopName, sample }: PayQrProps) {
  const src = qrSrc(qr);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [saving, setSaving] = useState(false);
  const alt = words.checkout.qrAlt(method);
  const failed = state === 'failed' || src === null;

  const onSave = async () => {
    if (!src) return;
    setSaving(true);
    try {
      if ((await saveQr(src, Q.fileName(shopName))) === 'saved') {
        notify({ title: Q.saved, tone: 'success' });
      }
    } catch {
      notify({ title: Q.saveFailed, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-label={Q.title(method)}
      className="flex flex-col items-center gap-4 rounded-2xl bg-paper p-4 text-paper-foreground ring-1 ring-foreground/8 sm:flex-row sm:items-start"
    >
      <div className="relative size-56 shrink-0 sm:size-44">
        {failed ? (
          <div
            role="alert"
            className="flex size-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-paper-foreground/30 p-3 text-center text-sm"
          >
            <ImageOffIcon aria-hidden="true" className="size-6" />
            <span>{Q.failed}</span>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => {
                setState('loading');
                setAttempt((n) => n + 1);
              }}
            >
              <RotateCwIcon aria-hidden="true" />
              {Q.tryAgain}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            aria-label={Q.bigger}
            onClick={() => setZoom(true)}
            className="group relative block size-full overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {state === 'loading' ? <Skeleton className="absolute inset-0 rounded-xl" /> : null}
            <img
              key={attempt}
              ref={(el) => {
                // A QR already in the cache can finish before React listens for onLoad.
                if (el?.complete && el.naturalWidth > 0) setState('ready');
              }}
              src={src}
              alt={alt}
              width={640}
              height={640}
              decoding="async"
              onLoad={() => setState('ready')}
              onError={() => setState('failed')}
              className={cn('size-full object-contain', state === 'loading' && 'opacity-0')}
            />
            <span className="absolute right-1.5 bottom-1.5 flex size-8 items-center justify-center rounded-full bg-paper text-paper-foreground shadow-xs ring-1 ring-foreground/10">
              <Maximize2Icon aria-hidden="true" className="size-4" />
            </span>
          </button>
        )}
      </div>

      <div className="flex w-full min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-semibold">{Q.title(method)}</h4>
            {sample ? (
              <Badge variant="outline" size="lg" radius="full">
                {words.checkout.sampleLabel}
              </Badge>
            ) : null}
          </div>
          {accountName ? <p className="text-sm break-words">{accountName}</p> : null}
          {sample ? <p className="text-xs opacity-70">{Q.sample}</p> : null}
        </div>

        <ol className="flex list-decimal flex-col gap-1 ps-5 text-sm md:hidden">
          {Q.phoneSteps(amount).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="hidden text-sm md:block">{Q.desktopLine}</p>

        <Button
          type="button"
          variant="outline"
          disabled={failed || saving}
          onClick={() => void onSave()}
          className="h-11 w-full gap-2 rounded-full sm:w-auto sm:self-start"
        >
          <DownloadIcon aria-hidden="true" />
          {Q.save}
        </Button>
      </div>

      {zoom && src ? (
        <QrViewer src={src} alt={alt} title={Q.biggerTitle} onClose={() => setZoom(false)} />
      ) : null}
    </section>
  );
}
