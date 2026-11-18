import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { DataProvider, loadMockScenario, readMockScenarioFromUrl } from '@smartapp/data';
import { AppToaster } from '@smartapp/ui/compositions/app-toaster';
import { router } from './app/router.js';
import { env } from './app/env.js';

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((mod) => ({
        default: mod.ReactQueryDevtools,
      })),
    )
  : null;

// Sample data in development and preview builds (T100): the ?mock= links (plan-due, storage-full, ...) pick a
// scenario before the first read, and the Preview panel switches them.
// The check is written out here (not imported) so Vite folds it and live builds emit no panel chunk.
const PREVIEW = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'preview';
const PreviewSwitches =
  PREVIEW && env.VITE_DATA_SOURCE === 'mock'
    ? lazy(() => import('./app/preview-switches.js'))
    : null;
if (PREVIEW && env.VITE_DATA_SOURCE === 'mock') {
  loadMockScenario();
  readMockScenarioFromUrl(new URLSearchParams(window.location.search), env.VITE_DATA_SOURCE);
  // A preview link is sample data: keep it out of search results.
  if (import.meta.env.VITE_APP_ENV === 'preview') {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.append(robots);
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider source={env.VITE_DATA_SOURCE}>
        {/* One toaster for every page, so every notify() shows (Saved, errors, Undo). */}
        <AppToaster>
          <RouterProvider router={router} />
        </AppToaster>
        {PreviewSwitches && (
          <Suspense fallback={null}>
            <PreviewSwitches />
          </Suspense>
        )}
      </DataProvider>
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
