import * as React from 'react';
import { createPortal } from 'react-dom';
import { settingsWords } from '@smartapp/core';
import { QRCode, QRCodeSvg } from '@smartapp/ui/components/qr-code';

const W = settingsWords.shop;
// The QR draws on a canvas first; the dialog waits for it (the same wait as an order ticket).
const QR_WAIT_MS = 2000;

export type PosterSize = 'a4' | 'a6';

/**
 * The shop's QR poster (T118 task 9.2), black on paper white so any phone reads it and any printer prints
 * it cheaply. A4 for a wall, A6 for the counter; globals.css picks the paper size from `data-size`.
 */
function Poster({ size, name, link }: { size: PosterSize; name: string; link: string }) {
  const big = size === 'a4';
  return (
    <div
      data-slot="print-poster"
      data-size={size}
      className="hidden flex-col items-center justify-center gap-6 text-center print:flex"
    >
      <p className={big ? 'text-5xl font-extrabold' : 'text-2xl font-extrabold'}>{name}</p>
      <p className={big ? 'text-3xl font-semibold' : 'text-lg font-semibold'}>{W.posterScan}</p>
      <QRCode value={link} size={big ? 1024 : 512}>
        <QRCodeSvg className={big ? 'size-96 *:size-full' : 'size-44 *:size-full'} />
      </QRCode>
      <p className={big ? 'text-2xl' : 'text-sm'}>{W.posterJoin}</p>
      <p className={big ? 'text-lg' : 'text-xs'}>
        {W.posterOr} <span className="font-semibold">{link.replace(/^https?:\/\//, '')}</span>
      </p>
      <p className={big ? 'text-sm' : 'text-xs'}>{W.posterBy}</p>
    </div>
  );
}

function PrintPoster({
  size,
  name,
  link,
  onDone,
}: {
  size: PosterSize;
  name: string;
  link: string;
  onDone: () => void;
}) {
  React.useEffect(() => {
    window.addEventListener('afterprint', onDone, { once: true });
    const id = window.setTimeout(() => window.print(), QR_WAIT_MS);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('afterprint', onDone);
    };
  }, [onDone]);
  return <Poster size={size} name={name} link={link} />;
}

/** Prints the poster through the browser's print dialog; `node` goes anywhere in the page. */
export function useQrPoster(name: string, link: string) {
  const [job, setJob] = React.useState<{ size: PosterSize; n: number } | null>(null);
  const print = React.useCallback((size: PosterSize) => {
    setJob((prev) => ({ size, n: (prev?.n ?? 0) + 1 }));
  }, []);
  const done = React.useCallback(() => setJob(null), []);
  const node =
    job && typeof document !== 'undefined'
      ? createPortal(
          <PrintPoster key={job.n} size={job.size} name={name} link={link} onDone={done} />,
          document.body,
        )
      : null;
  return { print, printing: job !== null, node };
}
