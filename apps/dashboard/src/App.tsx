import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { DataProvider } from '@smartapp/data';
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
      </DataProvider>
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
