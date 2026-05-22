import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '../store/store';

/**
 * Global query client with sensible defaults.
 * - 2 minute stale time prevents over-fetching
 * - 1 retry for transient failures
 * - No refetch on window focus to prevent jarring reloads
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Wraps the app with Redux (client state) + TanStack Query (server state).
 * Place this inside React Router but outside page components.
 */
export function StoreProvider({ children }) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ReduxProvider>
  );
}
