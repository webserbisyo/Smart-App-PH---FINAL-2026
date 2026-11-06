import * as React from 'react';
import { logoColours, type LogoColour } from '@smartapp/core';

// The logo is read small: enough for its colours, quick on an old phone.
const SAMPLE_SIDE = 64;

export type LogoRead =
  | { status: 'none' }
  | { status: 'reading' }
  | { status: 'failed' }
  | { status: 'ready'; colours: LogoColour[]; image: HTMLImageElement };

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

/** The logo's main colours, worked out on this device (decision T73). */
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
        if (!cancelled) setRead({ status: 'ready', colours: logoColours(pixels), image });
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
