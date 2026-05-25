import { configureStore } from '@reduxjs/toolkit';
import graphReducer from './graphSlice';
import chatReducer  from './chatSlice';
import uiReducer    from './uiSlice';

export const store = configureStore({
  reducer: {
    graph: graphReducer,
    chat:  chatReducer,
    ui:    uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Serializable check: disable for large graph data payloads
      serializableCheck: {
        ignoredActions: ['graph/setGraphData', 'graph/hydrateGraph'],
        ignoredPaths:   ['graph.data', 'graph.hydrationSnapshot'],
      },
    }),
});

export default store;
