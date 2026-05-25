/**
 * uiSlice — Phase 2 global UI state.
 *
 * Manages sidebar/panel toggles, active panels, and other ephemeral
 * UI state that needs to be accessible across the component tree.
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Graph page UI
  graph: {
    sidebarOpen:  false,
    toolsOpen:    false,
    activePanel:  'filters', // 'filters' | 'colors' | 'traversal' | 'explorer' | 'stats'
    lockDraggedNodes: false,
    editMode:     'view',    // 'view' | 'add-node' | 'add-link'
  },

  // Global theme
  colorScheme: 'system', // 'light' | 'dark' | 'system'

  // Toast/notification state (mirrors react-hot-toast, optional)
  lastToast: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // ── Graph UI ─────────────────────────────────────────────────────────
    setGraphSidebarOpen(state, action)  { state.graph.sidebarOpen      = action.payload; },
    toggleGraphSidebar(state)           { state.graph.sidebarOpen      = !state.graph.sidebarOpen; },
    setGraphToolsOpen(state, action)    { state.graph.toolsOpen        = action.payload; },
    toggleGraphTools(state)             { state.graph.toolsOpen        = !state.graph.toolsOpen; },
    setGraphActivePanel(state, action)  { state.graph.activePanel      = action.payload; },
    setLockDraggedNodes(state, action)  { state.graph.lockDraggedNodes = action.payload; },
    setGraphEditMode(state, action)     { state.graph.editMode         = action.payload; },

    // ── Theme ─────────────────────────────────────────────────────────────
    setColorScheme(state, action) { state.colorScheme = action.payload; },
  },
});

export const {
  setGraphSidebarOpen,
  toggleGraphSidebar,
  setGraphToolsOpen,
  toggleGraphTools,
  setGraphActivePanel,
  setLockDraggedNodes,
  setGraphEditMode,
  setColorScheme,
} = uiSlice.actions;

// ── Selectors ──────────────────────────────────────────────────────────────
export const selectGraphUI    = (state) => state.ui.graph;
export const selectColorScheme = (state) => state.ui.colorScheme;

export default uiSlice.reducer;
