import { useSyncExternalStore } from 'react';

export type FormFactor = 'phone' | 'tablet' | 'desktop';

// phone < 768 px, tablet 768 to 1023 px, desktop 1024 px and up.
const PHONE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';

function getSnapshot(): FormFactor {
  if (window.matchMedia(PHONE_QUERY).matches) return 'phone';
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
  return 'desktop';
}

function getServerSnapshot(): FormFactor {
  return 'desktop';
}

function subscribe(callback: () => void): () => void {
  const queries = [window.matchMedia(PHONE_QUERY), window.matchMedia(TABLET_QUERY)];
  for (const query of queries) query.addEventListener('change', callback);
  return () => {
    for (const query of queries) query.removeEventListener('change', callback);
  };
}

export function useFormFactor(): FormFactor {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
