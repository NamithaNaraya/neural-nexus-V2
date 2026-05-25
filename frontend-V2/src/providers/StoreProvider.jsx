import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { store } from '../store/store';
import { toast } from 'react-hot-toast';

/**
 * Global query client with sensible defaults.
 * - 2 minute stale time prevents over-fetching
 * - 1 retry for transient failures
 * - No refetch on window focus to prevent jarring reloads
 */
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only show toast if the query explicitly sets an errorMessage meta tag
      if (query.meta?.errorMessage) {
        toast.error(query.meta.errorMessage);
      } else {
        console.error('Global Query Error:', error);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Add global error toast for mutations
      toast.error(mutation.meta?.errorMessage || error?.message || 'An error occurred while saving data.');
      console.error('Global Mutation Error:', error);
    },
  }),
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
