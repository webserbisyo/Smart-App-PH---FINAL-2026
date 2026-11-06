import * as React from 'react';
import { readLogo, type LogoReading } from '@smartapp/core/rules/style-designer';

// The logo is read small: enough for its colours, quick on an old phone.
const SAMPLE_SIDE = 96;

export type LogoRead =
  | { status: 'none' }
  | { status: 'reading' }
  | { status: 'failed' }
  | { status: 'ready'; reading: LogoReading; image: HTMLImageElement };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Demo and stored logos come from another address; they allow reading their pixels (CORS).
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('logo_unreadable'));
    image.src = src;
  });
}

/** The logo's colours, edge and white box, worked out on this device (decisions T73, T76). */
export function useLogoColours(src: string | null): LogoRead {
  const [read, setRead] = React.useState<LogoRead>({ status: 'none' });
  React.useEffect(() => {
    if (!src) {
      setRead({ status: 'none' });
      return;
    }
    let cancelled = false;
    setRead({ status: 'reading' });
    loadImage(src)
      .then((image) => {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE_SIDE;
        canvas.height = SAMPLE_SIDE;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('logo_unreadable');
        context.drawImage(image, 0, 0, SAMPLE_SIDE, SAMPLE_SIDE);
        const pixels = context.getImageData(0, 0, SAMPLE_SIDE, SAMPLE_SIDE).data;
        const reading = readLogo(pixels, SAMPLE_SIDE, SAMPLE_SIDE);
        if (!cancelled) setRead({ status: 'ready', reading, image });
      })
      .catch(() => {
        if (!cancelled) setRead({ status: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return read;
}
