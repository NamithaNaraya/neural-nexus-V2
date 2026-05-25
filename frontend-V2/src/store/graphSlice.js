/**
 * graphSlice — Phase 2 global graph state.
 *
 * Manages:
 *  • Filter state (nodeTypes, relationshipTypes, minDegree, showOrphans, search)
 *  • Color customizations (nodeTypeColors, relationshipTypeColors)
 *  • UI toggles (showNodeLabels, showRelationshipLabels, linkStyle)
 *  • Hydration status and render limits
 *
 * Raw graph data is intentionally NOT stored here — it stays in GraphPage's local
 * state / TanStack Query cache to avoid serialization overhead on large graphs.
 * This slice only holds lightweight UI/filter state.
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // ── Filter state ───────────────────────────────────────────────────────
  nodeTypeFilters:         null, // null = all visible; Set not serializable, kept as Array
  relationshipTypeFilters: null, // null = all visible
  minDegree:               0,
  showOrphans:             true,
  nodeSearch:              '',

  // ── Color customizations ───────────────────────────────────────────────
  nodeTypeColors:         {},
  relationshipTypeColors: {},

  // ── Visual toggles ─────────────────────────────────────────────────────
  showNodeLabels:         false,
  showRelationshipLabels: false,
  linkStyle:              'curved', // 'curved' | 'straight'

  // ── Render limits ──────────────────────────────────────────────────────
  activeEngine: 'canvas2d', // 'canvas2d' | 'hybrid2d' | 'force3d'

  // ── Traversal ──────────────────────────────────────────────────────────
  traversalModeActive: false,
  explorerModeActive:  false,
  traversalPath:       [],
  expandedNodeIds:     [],

  // ── Hydration metadata ────────────────────────────────────────────────
  hydrationStatus: 'idle', // 'idle' | 'loading' | 'partial' | 'complete' | 'error'
  hydrationStep:   0,
  stats: { nodes: 0, links: 0 },

  // ── Predicted links ───────────────────────────────────────────────────
  predictedLinks: {}, // folderId → [links]
};

const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    // ── Filters ──────────────────────────────────────────────────────────
    setNodeTypeFilters(state, action) {
      state.nodeTypeFilters = action.payload; // string[] or null
    },
    setRelationshipTypeFilters(state, action) {
      state.relationshipTypeFilters = action.payload;
    },
    toggleNodeTypeFilter(state, action) {
      const type = action.payload;
      if (!state.nodeTypeFilters) return; // null = all shown
      const idx = state.nodeTypeFilters.indexOf(type);
      if (idx === -1) {
        state.nodeTypeFilters.push(type);
      } else {
        state.nodeTypeFilters.splice(idx, 1);
      }
    },
    setMinDegree(state, action)   { state.minDegree   = action.payload; },
    setShowOrphans(state, action) { state.showOrphans = action.payload; },
    setNodeSearch(state, action)  { state.nodeSearch   = action.payload; },
    clearFilters(state) {
      state.nodeTypeFilters         = null;
      state.relationshipTypeFilters = null;
      state.minDegree               = 0;
      state.showOrphans             = true;
      state.nodeSearch              = '';
    },

    // ── Colors ───────────────────────────────────────────────────────────
    setNodeTypeColor(state, action) {
      const { type, color } = action.payload;
      state.nodeTypeColors[type] = color;
    },
    setRelationshipTypeColor(state, action) {
      const { type, color } = action.payload;
      state.relationshipTypeColors[type] = color;
    },
    resetColors(state) {
      state.nodeTypeColors         = {};
      state.relationshipTypeColors = {};
    },

    // ── Visual toggles ───────────────────────────────────────────────────
    setShowNodeLabels(state, action)         { state.showNodeLabels         = action.payload; },
    setShowRelationshipLabels(state, action) { state.showRelationshipLabels = action.payload; },
    setLinkStyle(state, action)              { state.linkStyle              = action.payload; },

    // ── Engine ───────────────────────────────────────────────────────────
    setActiveEngine(state, action) { state.activeEngine = action.payload; },

    // ── Traversal ────────────────────────────────────────────────────────
    setTraversalModeActive(state, action) { state.traversalModeActive = action.payload; },
    setExplorerModeActive(state, action)  { state.explorerModeActive  = action.payload; },
    setTraversalPath(state, action)       { state.traversalPath       = action.payload; },
    pushTraversalNode(state, action) {
      state.traversalPath.push(action.payload);
    },
    popTraversalNode(state) {
      state.traversalPath.pop();
    },
    resetTraversal(state) {
      state.traversalPath       = [];
      state.traversalModeActive = false;
    },
    setExpandedNodeIds(state, action) { state.expandedNodeIds = action.payload; },

    // ── Hydration ────────────────────────────────────────────────────────
    setHydrationStatus(state, action) { state.hydrationStatus = action.payload; },
    setHydrationStep(state, action)   { state.hydrationStep   = action.payload; },
    setStats(state, action)           { state.stats           = action.payload; },

    // ── Predicted links ──────────────────────────────────────────────────
    setPredictedLinks(state, action) {
      const { folderId, links } = action.payload;
      state.predictedLinks[folderId] = links;
    },
    clearPredictedLinks(state, action) {
      const folderId = action.payload;
      delete state.predictedLinks[folderId];
    },
  },
});

export const {
  setNodeTypeFilters,
  setRelationshipTypeFilters,
  toggleNodeTypeFilter,
  setMinDegree,
  setShowOrphans,
  setNodeSearch,
  clearFilters,
  setNodeTypeColor,
  setRelationshipTypeColor,
  resetColors,
  setShowNodeLabels,
  setShowRelationshipLabels,
  setLinkStyle,
  setActiveEngine,
  setTraversalModeActive,
  setExplorerModeActive,
  setTraversalPath,
  pushTraversalNode,
  popTraversalNode,
  resetTraversal,
  setExpandedNodeIds,
  setHydrationStatus,
  setHydrationStep,
  setStats,
  setPredictedLinks,
  clearPredictedLinks,
} = graphSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────
export const selectGraphFilters = (state) => ({
  nodeTypeFilters:         state.graph.nodeTypeFilters,
  relationshipTypeFilters: state.graph.relationshipTypeFilters,
  minDegree:               state.graph.minDegree,
  showOrphans:             state.graph.showOrphans,
  nodeSearch:              state.graph.nodeSearch,
});
export const selectGraphColors      = (state) => ({
  nodeTypeColors:         state.graph.nodeTypeColors,
  relationshipTypeColors: state.graph.relationshipTypeColors,
});
export const selectGraphToggles     = (state) => ({
  showNodeLabels:         state.graph.showNodeLabels,
  showRelationshipLabels: state.graph.showRelationshipLabels,
  linkStyle:              state.graph.linkStyle,
});
export const selectTraversal        = (state) => state.graph;
export const selectHydrationStatus  = (state) => state.graph.hydrationStatus;
export const selectGraphStats       = (state) => state.graph.stats;
export const selectPredictedLinks   = (folderId) => (state) =>
  state.graph.predictedLinks[folderId] || [];

export default graphSlice.reducer;
