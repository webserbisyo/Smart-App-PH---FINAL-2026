import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { DataProvider } from '@smartapp/data';
import { router } from './app/router.js';
import { env } from './app/env.js';

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
        <RouterProvider router={router} />
      </DataProvider>
    </QueryClientProvider>
  );
}
