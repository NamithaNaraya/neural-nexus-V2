import { configureStore } from '@reduxjs/toolkit';
import graphReducer from './graphSlice';
import chatReducer from './chatSlice';

export const store = configureStore({
  reducer: {
    graph: graphReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Allow non-serializable values for Sets (nodeTypeFilters etc.)
      serializableCheck: {
        ignoredPaths: [
          'graph.nodeTypeFilters',
          'graph.relationshipTypeFilters',
          'graph.traversalVisibleNodeIds',
          'graph.traversalVisibleLinkIds',
          'graph.expandedNodeIds',
          'graph.highlightedNodeIds',
          'graph.highlightedLinkIds',
          'graph.searchResultIds',
        ],
      },
    }),
  devTools: import.meta.env.DEV,
});
