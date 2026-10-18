import { useSyncExternalStore } from 'react';

export type FormFactor = 'phone' | 'tablet' | 'desktop';

const PHONE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';

function getSnapshot(): FormFactor {
  if (typeof window === 'undefined') return 'desktop';
  if (typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia(PHONE_QUERY).matches) return 'phone';
      if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
      return 'desktop';
    } catch {
      // Fallback to innerWidth if matchMedia fails
    }
  }
  const width = window.innerWidth;
  if (width < 768) return 'phone';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getServerSnapshot(): FormFactor {
  return 'desktop';
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('resize', callback);

  let phoneMedia: MediaQueryList | null = null;
  let tabletMedia: MediaQueryList | null = null;

  if (typeof window.matchMedia === 'function') {
    try {
      phoneMedia = window.matchMedia(PHONE_QUERY);
      tabletMedia = window.matchMedia(TABLET_QUERY);
      phoneMedia.addEventListener('change', callback);
      tabletMedia.addEventListener('change', callback);
    } catch {
      // Ignore if matchMedia event listeners unsupported
    }
  }

  return () => {
    window.removeEventListener('resize', callback);
    if (phoneMedia) {
      phoneMedia.removeEventListener('change', callback);
    }
    if (tabletMedia) {
      tabletMedia.removeEventListener('change', callback);
    }
  };
}

export function useFormFactor(): FormFactor {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
