import type * as React from 'react';
import { cn } from '@smartapp/ui/lib/utils';
import { useMediaQuery } from '@/app/use-media-query';
import type { PhoneSize } from './phone.js';

/** The big phone only when the window is tall enough to show it whole with the controls under it. */
export function usePhoneSize(wide: boolean): PhoneSize {
  const tall = useMediaQuery('(min-height: 900px)');
  return wide && tall ? 'lg' : 'sm';
}

/**
 * The stage both sign-in pages share (T108): the logo gradient panel with the phone in the middle. Nothing
 * covers the phone; its notifications show inside it, like on a real one. Words never sit on the gradient
 * (L7).
 */
export function StagePanel({ wide, phone }: { wide: boolean; phone: React.ReactNode }) {
  return (
    <div
      className={cn(
        'relative flex w-full justify-center overflow-hidden rounded-3xl brand-gradient shadow-lg',
        wide ? 'p-6' : 'px-3 py-6',
      )}
    >
      {phone}
    </div>
  );
}
